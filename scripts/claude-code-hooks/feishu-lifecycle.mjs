#!/usr/bin/env node
/**
 * Claude Code 生命周期 Hook — 飞书通知与计时
 *
 * 自动追踪并发送以下时间：
 *   1. Session（会话）从开始到结束的运行时间
 *   2. Subagent（子代理）从启动到完成的运行时间
 *
 * 处理的事件：
 *   SessionStart  → 记录会话开始时间（state file + CLAUDE_ENV_FILE）
 *   SessionEnd    → 计算会话时长，发送飞书通知
 *   SubagentStart → 记录子代理开始时间（state file per agent_id）
 *   SubagentStop  → 计算子代理时长，发送飞书通知
 *
 * State 文件存储在 .claude/hooks/state/（已被 .gitignore 忽略）。
 * 审计日志追加到 logs/feishu-notify.log（与 Cursor 侧共享同一文件）。
 *
 * 可配置的环境变量：
 *   FEISHU_WEBHOOK_URL                — 覆盖默认飞书 webhook 地址
 *   FEISHU_SUBAGENT_MIN_DURATION_MS   — 子代理最短通知时长阈值（毫秒），默认 0（全部通知）
 *
 * 在 .claude/settings.local.json 中配置 hooks 引用此脚本。
 */
import {
  appendFileSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const DEFAULT_WEBHOOK_URL =
  "https://www.feishu.cn/flow/api/trigger-webhook/1a54408c02fef6b22f2c9fcfaa50a6da";

const PROJECT_DIR = process.cwd();
const STATE_DIR = path.join(PROJECT_DIR, ".claude", "hooks", "state");
const LOG_DIR = path.join(PROJECT_DIR, "logs");
const LOG_PATH = path.join(LOG_DIR, "feishu-notify.log");

const SUBAGENT_MIN_DURATION_MS = Number(
  process.env.FEISHU_SUBAGENT_MIN_DURATION_MS || "0",
);

// ─── Utilities ──────────────────────────────────────────

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function writeState(filename, data) {
  ensureDir(STATE_DIR);
  writeFileSync(
    path.join(STATE_DIR, filename),
    `${JSON.stringify(data, null, 2)}\n`,
    "utf8",
  );
}

function readState(filename) {
  const filepath = path.join(STATE_DIR, filename);
  if (!existsSync(filepath)) return null;
  try {
    return JSON.parse(readFileSync(filepath, "utf8"));
  } catch {
    return null;
  }
}

function removeState(filename) {
  try {
    unlinkSync(path.join(STATE_DIR, filename));
  } catch {
    /* file may already be gone */
  }
}

function appendAuditLog(record) {
  try {
    ensureDir(LOG_DIR);
    appendFileSync(
      LOG_PATH,
      `${JSON.stringify({ ts: new Date().toISOString(), source: "claude-code-hook", ...record })}\n`,
      "utf8",
    );
  } catch (e) {
    process.stderr.write(
      `Audit log failed: ${e instanceof Error ? e.message : String(e)}\n`,
    );
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

function extractTextContent(message) {
  if (!message) return "";
  const content = message.content ?? message;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    for (const block of content) {
      if (block?.type === "text" && block.text) return block.text;
    }
  }
  return "";
}

function extractFirstUserMessage(transcriptPath) {
  try {
    const MAX_READ = 204800; // 200KB — first user message is near the top
    const fd = openSync(transcriptPath, "r");
    try {
      const buf = Buffer.alloc(MAX_READ);
      const n = readSync(fd, buf, 0, MAX_READ, 0);
      const text = buf.subarray(0, n).toString("utf8");
      for (const line of text.split("\n")) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line);
          if (
            entry.type === "user" &&
            entry.userType !== "system" &&
            !entry.isMeta
          ) {
            const msgText = extractTextContent(entry.message)
              .replace(/<[^>]*>/g, "")
              .replace(/\s+/g, " ")
              .trim();
            if (msgText.length > 3) return msgText;
          }
        } catch {
          /* skip malformed lines */
        }
      }
    } finally {
      closeSync(fd);
    }
  } catch {
    /* non-critical */
  }
  return "";
}

function truncateText(text, maxLen = 100) {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}

async function sendWebhook(event, msg, type = "info") {
  const url = process.env.FEISHU_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;
  const body = JSON.stringify({ event, msg, type });

  appendAuditLog({ event, type, msg, phase: "send_attempt" });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    if (data.code !== 0) throw new Error(data.msg || "Feishu API error");

    appendAuditLog({
      event,
      type,
      msg,
      phase: "send_ok",
      feishu_msg: data.msg || "success",
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`Feishu webhook failed: ${errMsg}\n`);
    appendAuditLog({
      event,
      type,
      msg,
      phase: "send_error",
      error: errMsg,
    });
  }
}

// ─── Event Handlers ─────────────────────────────────────

async function handleSessionStart(input) {
  const now = Date.now();
  const state = {
    sessionId: input.session_id || "unknown",
    startedAtMs: now,
    startedAtIso: new Date(now).toISOString(),
    source: input.source || "unknown",
  };
  writeState("session-current.json", state);

  // Persist env var via CLAUDE_ENV_FILE so SessionEnd can read it
  // even if the state file is lost or overwritten
  const envFile = process.env.CLAUDE_ENV_FILE;
  if (envFile) {
    try {
      appendFileSync(envFile, `export FEISHU_SESSION_STARTED_AT_MS=${now}\n`);
    } catch {
      /* non-critical */
    }
  }

  appendAuditLog({
    event: "session_start",
    phase: "state_written",
    sessionId: state.sessionId,
    startedAtMs: now,
  });

  // No stdout output — don't inject anything into Claude's context
}

async function handleSessionEnd(input) {
  // Try env var first (most reliable across compactions), then state file
  const envStartedAt = Number(process.env.FEISHU_SESSION_STARTED_AT_MS);
  const stateData = readState("session-current.json");
  const startedAtMs = envStartedAt || stateData?.startedAtMs;

  if (!startedAtMs) {
    process.stderr.write(
      "No session start time found, skipping session_complete notification\n",
    );
    return;
  }

  const durationMs = Date.now() - startedAtMs;
  const durationText = formatDuration(durationMs);
  const sessionId = input.session_id || stateData?.sessionId || "unknown";
  const reason = input.reason || "unknown";

  // Read task summary captured by Stop hook, or try transcript as fallback
  let taskSummary = stateData?.taskSummary || "";
  if (!taskSummary && input.transcript_path) {
    const firstMsg = extractFirstUserMessage(input.transcript_path);
    if (firstMsg) taskSummary = truncateText(firstMsg, 100);
  }

  let msg = `会话结束（${reason}）`;
  if (taskSummary) msg += `：${taskSummary}`;
  msg += `；本次会话运行：${durationText}；session_id：${sessionId}`;

  await sendWebhook("session_complete", msg, "info");

  removeState("session-current.json");
}

async function handleSubagentStart(input) {
  const agentId = input.agent_id || "unknown";
  const now = Date.now();
  const state = {
    agentId,
    agentType: input.agent_type || "unknown",
    startedAtMs: now,
    startedAtIso: new Date(now).toISOString(),
  };
  writeState(`agent-${agentId}.json`, state);

  appendAuditLog({
    event: "subagent_start",
    phase: "state_written",
    agentId,
    agentType: state.agentType,
    startedAtMs: now,
  });
}

async function handleSubagentStop(input) {
  // Guard against infinite loops when Stop hook is active
  if (input.stop_hook_active) return;

  const agentId = input.agent_id || "unknown";
  const agentType = input.agent_type || "unknown";
  const state = readState(`agent-${agentId}.json`);

  if (!state?.startedAtMs) {
    // Agent started before hook was installed, or state was lost — skip silently
    return;
  }

  const durationMs = Date.now() - state.startedAtMs;

  // Skip short-lived subagents if threshold is configured
  if (SUBAGENT_MIN_DURATION_MS > 0 && durationMs < SUBAGENT_MIN_DURATION_MS) {
    removeState(`agent-${agentId}.json`);
    return;
  }

  const durationText = formatDuration(durationMs);
  const msg = `子代理完成（${agentType}）；本次子代理运行：${durationText}；agent_id：${agentId}`;
  await sendWebhook("subagent_complete", msg, "info");

  removeState(`agent-${agentId}.json`);
}

async function handleStop(input) {
  const transcriptPath = input.transcript_path;
  if (!transcriptPath) return;

  const stateData = readState("session-current.json");
  if (!stateData) return;

  // Only extract summary once per session (first user message won't change)
  if (stateData.taskSummary) return;

  const firstMsg = extractFirstUserMessage(transcriptPath);
  if (firstMsg) {
    stateData.taskSummary = truncateText(firstMsg, 100);
    writeState("session-current.json", stateData);
  }
}

// ─── Main ───────────────────────────────────────────────

async function main() {
  const raw = readStdin();
  if (!raw.trim()) {
    process.exit(0);
  }

  let input;
  try {
    input = JSON.parse(raw);
  } catch (e) {
    process.stderr.write(
      `Failed to parse stdin JSON: ${e instanceof Error ? e.message : String(e)}\n`,
    );
    process.exit(0);
  }

  switch (input.hook_event_name) {
    case "SessionStart":
      await handleSessionStart(input);
      break;
    case "SessionEnd":
      await handleSessionEnd(input);
      break;
    case "SubagentStart":
      await handleSubagentStart(input);
      break;
    case "SubagentStop":
      await handleSubagentStop(input);
      break;
    case "Stop":
      await handleStop(input);
      break;
    default:
      process.stderr.write(
        `feishu-lifecycle: unhandled event ${input.hook_event_name}\n`,
      );
  }
}

main().catch((e) => {
  process.stderr.write(
    `feishu-lifecycle error: ${e instanceof Error ? e.stack : String(e)}\n`,
  );
});
