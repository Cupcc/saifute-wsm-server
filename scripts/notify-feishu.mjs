#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * 发送飞书 webhook 通知（agent 停止时提示用户）
 * 用法:
 *   node scripts/notify-feishu.mjs [event] [msg] [type]
 *   node scripts/notify-feishu.mjs [event] [msg] [type] --duration-ms <ms>
 *   node scripts/notify-feishu.mjs [event] [msg] [type] --started-at-ms <epoch_ms>
 * 或:
 *   pnpm notify:feishu "事件" "消息内容" "消息类型"
 *
 * 规则：
 * - `task_complete` / `complete` 必须传入精确耗时（毫秒）或精确开始时间，或依赖 hooks 记录的开始时间。
 * - 完成事件会自动追加人类可读的耗时描述，例如 `本次任务运行：1小时23分钟`。
 * - 其他事件不允许在消息中携带 `运行时间`。
 *
 * 可通过环境变量 FEISHU_WEBHOOK_URL 覆盖默认 webhook 地址。
 */
const DEFAULT_WEBHOOK_URL =
  "https://www.feishu.cn/flow/api/trigger-webhook/1a54408c02fef6b22f2c9fcfaa50a6da";
const RUNTIME_STATE_CANDIDATES = [
  ".cursor/hooks/state/agent-runtime/current-task.json",
  ".cursor/hooks/state/agent-runtime/current-session.json",
];

function parseArgs(argv) {
  const positionals = [];
  let durationMs;
  let startedAtMs;

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--duration-ms") {
      durationMs = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith("--duration-ms=")) {
      durationMs = arg.slice("--duration-ms=".length);
      continue;
    }

    if (arg === "--started-at-ms") {
      startedAtMs = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith("--started-at-ms=")) {
      startedAtMs = arg.slice("--started-at-ms=".length);
      continue;
    }

    positionals.push(arg);
  }

  return { positionals, durationMs, startedAtMs };
}

function isCompletionEvent(event) {
  return event === "task_complete" || event === "complete";
}

function hasRuntimeInMessage(message) {
  return /(运行时间|本次运行耗时|本次任务运行)\s*[:：]/u.test(message);
}

function parsePositiveInteger(value, flagName) {
  if (value === undefined) {
    return undefined;
  }

  if (!/^\d+$/u.test(String(value))) {
    throw new Error(`${flagName} 必须是非负整数毫秒值`);
  }

  return Number(value);
}

function formatDuration(durationMs) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const parts = [];

  if (hours > 0) {
    parts.push(`${hours}小时`);
  }

  if (minutes > 0) {
    parts.push(`${minutes}分钟`);
  }

  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds}秒`);
  }

  return parts.join("");
}

function injectRuntime(message, runtimeText) {
  const nextStepPattern = /([；;]\s*下一步计划\s*[:：])/u;
  const match = nextStepPattern.exec(message);

  if (!match || match.index === undefined) {
    return `${message}；本次任务运行：${runtimeText}`;
  }

  return `${message.slice(0, match.index)}；本次任务运行：${runtimeText}${message.slice(match.index)}`;
}

function readStartedAtMsFromState(projectDir) {
  for (const relativePath of RUNTIME_STATE_CANDIDATES) {
    try {
      const raw = readFileSync(path.join(projectDir, relativePath), "utf8");
      const parsed = JSON.parse(raw);
      const startedAtMs = parsePositiveInteger(
        parsed.startedAtMs,
        "state.startedAtMs",
      );
      if (startedAtMs !== undefined) {
        return startedAtMs;
      }
    } catch {}
  }

  return undefined;
}

const {
  positionals,
  durationMs: durationArg,
  startedAtMs: startedAtArg,
} = parseArgs(process.argv);
const projectDir = process.env.CURSOR_PROJECT_DIR || process.cwd();
const url = process.env.FEISHU_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;
const event = positionals[0] || "agent_stop";
const rawMsg = positionals[1] || "Agent 已停止，请查看结果。";
const type = positionals[2] || "info";

const durationMs = parsePositiveInteger(durationArg, "--duration-ms");
const startedAtMs =
  parsePositiveInteger(startedAtArg, "--started-at-ms") ??
  parsePositiveInteger(
    process.env.FEISHU_NOTIFY_STARTED_AT_MS,
    "FEISHU_NOTIFY_STARTED_AT_MS",
  ) ??
  readStartedAtMsFromState(projectDir);

if (durationMs !== undefined && startedAtMs !== undefined) {
  throw new Error("不能同时传入 --duration-ms 和 --started-at-ms");
}

let msg = rawMsg;

if (isCompletionEvent(event)) {
  if (hasRuntimeInMessage(rawMsg)) {
    throw new Error(
      "完成事件的消息内容不能手写运行时间，请通过 --duration-ms、--started-at-ms 或 hooks 自动计时",
    );
  }

  const exactDurationMs =
    durationMs ??
    (startedAtMs !== undefined
      ? Math.max(0, Date.now() - startedAtMs)
      : undefined);

  if (exactDurationMs === undefined) {
    throw new Error(
      "完成事件必须通过 --duration-ms、--started-at-ms 或 hooks 自动计时提供准确耗时",
    );
  }

  msg = injectRuntime(rawMsg, formatDuration(exactDurationMs));
} else if (hasRuntimeInMessage(rawMsg)) {
  throw new Error("非完成事件的消息内容不应包含运行时间");
}

const body = JSON.stringify({ event, msg, type });

fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body,
})
  .then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
  })
  .then((data) => {
    if (data.code !== 0) throw new Error(data.msg || "Feishu API error");
    console.log("Feishu notify OK:", data.msg || "success");
  })
  .catch((err) => {
    console.error("Feishu notify failed:", err.message);
    process.exit(1);
  });
