/**
 * Cursor stop hook — 任务完成时自动发送飞书通知（含精确计时）
 *
 * 触发时机：Cursor agent 每次停止（task 完成 / 中止 / 出错）
 *
 * 自动计算并报告两个时间：
 *   1. 本轮对话运行时间（从 beforeSubmitPrompt 到 stop）
 *   2. 本次会话运行时间（从 sessionStart 到 stop，如果可用）
 *
 * 依赖：
 *   - session-start-runtime.js 写入的 current-session.json（会话开始时间）
 *   - task-start-notify.js 写入的 current-task.json（任务开始时间）
 *
 * stdin payload（由 Cursor 提供）：
 *   { conversation_id, generation_id, status, workspace_roots }
 *   status: "completed" | "aborted" | "error"
 */
const {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
} = require("node:fs");
const { execSync } = require("node:child_process");
const path = require("node:path");

const DEFAULT_WEBHOOK_URL =
  "https://www.feishu.cn/flow/api/trigger-webhook/1a54408c02fef6b22f2c9fcfaa50a6da";

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const parts = [];
  if (hours > 0) parts.push(`${hours}小时`);
  if (minutes > 0) parts.push(`${minutes}分钟`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}秒`);
  return parts.join("");
}

/** 小于该值视为 Unix 秒 */
const EPOCH_MS_MIN = 1_000_000_000_000;

function normalizeEpochMs(value) {
  if (value > 0 && value < EPOCH_MS_MIN) return value * 1000;
  return value;
}

function readJsonSafe(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function appendAuditLog(projectDir, record) {
  const logDir = path.join(projectDir, "logs");
  const logPath = path.join(logDir, "feishu-notify.log");
  try {
    mkdirSync(logDir, { recursive: true });
    appendFileSync(
      logPath,
      `${JSON.stringify({ ts: new Date().toISOString(), source: "cursor-stop-hook", ...record })}\n`,
      "utf8",
    );
  } catch {
    /* non-critical */
  }
}

/** 飞书消息里展示的 task_id，仅取前 6 位（与 task-start-notify 一致） */
function shortTaskIdForFeishuDisplay(id) {
  const s = String(id || "").trim();
  if (!s) return "";
  return s.slice(0, 6);
}

function resolveTaskId(taskState, sessionState, payload) {
  // Priority: generation_id from payload → task state → session state
  const fromPayload = String(payload.generation_id || "").trim();
  if (fromPayload) return fromPayload;

  if (taskState) {
    const gen = String(taskState.generationId || "").trim();
    if (gen) return gen;
    const conv = String(taskState.conversationId || "").trim();
    if (conv) return conv;
  }

  if (sessionState) {
    const conv = String(sessionState.conversationId || "").trim();
    if (conv) return conv;
  }

  return "";
}

const STATUS_LABELS = {
  completed: { event: "task_complete", type: "success", label: "任务完成" },
  aborted: { event: "task_aborted", type: "warning", label: "任务中止" },
  error: { event: "task_error", type: "warning", label: "任务出错" },
};

function getGitChangeSummary(projectDir) {
  try {
    const output = execSync("git diff --name-only HEAD 2>/dev/null", {
      cwd: projectDir,
      encoding: "utf8",
      timeout: 3000,
    }).trim();
    if (!output) return "";
    const files = output
      .split("\n")
      .filter(Boolean)
      .map((f) => f.split("/").pop());
    if (files.length === 0) return "";
    if (files.length <= 3) return `变更文件：${files.join("、")}`;
    return `变更 ${files.length} 个文件：${files.slice(0, 2).join("、")}等`;
  } catch {
    return "";
  }
}

async function main() {
  const raw = readStdin();
  if (!raw.trim()) return;

  const payload = JSON.parse(raw);
  const projectDir = process.env.CURSOR_PROJECT_DIR || process.cwd();
  const stateDir = path.join(
    projectDir,
    ".cursor",
    "hooks",
    "state",
    "agent-runtime",
  );
  const now = Date.now();

  const taskState = readJsonSafe(path.join(stateDir, "current-task.json"));
  const sessionState = readJsonSafe(
    path.join(stateDir, "current-session.json"),
  );

  const status = String(payload.status || "completed");
  const meta = STATUS_LABELS[status] || STATUS_LABELS.completed;
  const taskId = resolveTaskId(taskState, sessionState, payload);
  const taskIdForFeishu = shortTaskIdForFeishuDisplay(taskId);

  // Build timing parts
  const timingParts = [];

  // 1. Per-turn (task) duration
  if (taskState?.startedAtMs) {
    const taskStarted = normalizeEpochMs(Number(taskState.startedAtMs));
    const taskDurationMs = now - taskStarted;
    timingParts.push(`本轮对话运行：${formatDuration(taskDurationMs)}`);
  }

  // 2. Session duration (cumulative since sessionStart)
  if (sessionState?.startedAtMs) {
    const sessionStarted = normalizeEpochMs(Number(sessionState.startedAtMs));
    const sessionDurationMs = now - sessionStarted;
    timingParts.push(`本次会话运行：${formatDuration(sessionDurationMs)}`);
  }

  // Build message
  let msg = meta.label;

  if (taskState?.promptSummary) {
    msg += `：${taskState.promptSummary}`;
  }

  const gitChanges = getGitChangeSummary(projectDir);
  if (gitChanges) {
    msg += `；${gitChanges}`;
  }

  if (timingParts.length > 0) {
    msg += `；${timingParts.join("；")}`;
  }

  if (taskIdForFeishu) {
    msg += `；task_id：${taskIdForFeishu}`;
  }

  // Send webhook
  const url = process.env.FEISHU_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;
  const body = JSON.stringify({ event: meta.event, msg, type: meta.type });

  appendAuditLog(projectDir, {
    event: meta.event,
    type: meta.type,
    task_id: taskId || null,
    msg,
    status,
    phase: "send_attempt",
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    if (data.code !== 0) throw new Error(data.msg || "Feishu API error");

    appendAuditLog(projectDir, {
      event: meta.event,
      type: meta.type,
      task_id: taskId || null,
      msg,
      status,
      phase: "send_ok",
      feishu_msg: data.msg || "success",
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Feishu stop-notify failed: ${errMsg}\n`);
    appendAuditLog(projectDir, {
      event: meta.event,
      type: meta.type,
      task_id: taskId || null,
      msg,
      status,
      phase: "send_error",
      error: errMsg,
    });
  }
}

main().catch((error) => {
  process.stderr.write(
    `stop-notify error: ${error instanceof Error ? error.stack : String(error)}\n`,
  );
});
