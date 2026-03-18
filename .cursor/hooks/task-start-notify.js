const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
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

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function summarizePrompt(prompt) {
  const normalized = normalizeText(prompt);
  if (!normalized) {
    return "收到新的任务请求";
  }

  const maxLength = 60;
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 1)}...`
    : normalized;
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeTaskState(projectDir, payload, startedAtMs, promptSummary) {
  const conversationId = String(
    payload.conversation_id || "unknown-conversation",
  );
  const stateDir = path.join(
    projectDir,
    ".cursor",
    "hooks",
    "state",
    "agent-runtime",
  );
  const state = {
    conversationId,
    generationId: String(payload.generation_id || ""),
    startedAtMs,
    startedAtIso: new Date(startedAtMs).toISOString(),
    promptSummary,
  };

  mkdirSync(stateDir, { recursive: true });
  writeJson(path.join(stateDir, `${conversationId}.json`), state);
  writeJson(path.join(stateDir, "current-task.json"), state);
}

async function sendStartNotification(promptSummary) {
  const url = process.env.FEISHU_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;
  const body = JSON.stringify({
    event: "task_start",
    msg: `开始处理任务：${promptSummary}；下一步计划：分析需求并执行本次请求。`,
    type: "info",
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(data.msg || "Feishu API error");
  }
}

async function main() {
  const raw = readStdin();
  if (!raw.trim()) {
    process.stdout.write('{"continue":true}\n');
    return;
  }

  const payload = JSON.parse(raw);
  const projectDir = process.env.CURSOR_PROJECT_DIR || process.cwd();
  const startedAtMs = Date.now();
  const promptSummary = summarizePrompt(payload.prompt);

  writeTaskState(projectDir, payload, startedAtMs, promptSummary);
  await sendStartNotification(promptSummary);

  process.stdout.write(
    `${JSON.stringify({
      continue: true,
    })}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack : String(error)}\n`,
  );
  process.stdout.write('{"continue":true}\n');
});
