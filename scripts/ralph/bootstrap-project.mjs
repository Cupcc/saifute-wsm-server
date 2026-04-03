import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const instructionSourcePath = resolve(
  projectRoot,
  "docs/playbooks/ralph/project-instructions.md",
);

const args = parseArgs(process.argv.slice(2));

ensureRalphInstalled();

const projectInfo = getCurrentProject();
const agent = resolveAgent(args.agent);
const storagePath = projectInfo.storagePath;
const markerFilePath = resolve(storagePath, "complete.marker");

mkdirSync(storagePath, { recursive: true });

const config = {
  agent,
  maxRetries: 5,
  retryDelayMs: 10000,
  agentTimeoutMs: 14400000,
  stuckThresholdMs: 1800000,
  maxRuntimeMs: 43200000,
  notifications: {
    systemNotification: true,
    markerFilePath,
  },
  memory: {
    maxOutputBufferBytes: 10485760,
    memoryWarningThresholdMb: 1536,
    memoryThresholdMb: 3072,
    enableGarbageCollectionHints: true,
  },
};

writeFileSync(
  resolve(storagePath, "config.json"),
  `${JSON.stringify(config, null, 2)}\n`,
);

const instructionTemplate = readFileSync(instructionSourcePath, "utf8");
const instructionBody = instructionTemplate
  .replaceAll("__PROJECT_ROOT__", projectRoot)
  .replaceAll("__RALPH_STORAGE_PATH__", storagePath)
  .replaceAll("__DEFAULT_AGENT__", agent);

writeFileSync(resolve(storagePath, "instructions.md"), instructionBody);

console.log(`Ralph project bootstrapped for ${projectInfo.name}`);
console.log(`Storage path: ${storagePath}`);
console.log(`Default agent: ${agent}`);
console.log("Wrote:");
console.log(`- ${resolve(storagePath, "config.json")}`);
console.log(`- ${resolve(storagePath, "instructions.md")}`);
console.log("");
console.log("Next steps:");
console.log(
  "1. Run `pnpm ralph:init` in an interactive terminal to create the PRD.",
);
console.log("2. Review tasks with `ralph task list`.");
console.log("3. Start a long-running session with `pnpm ralph:run:bg -- 20`.");
console.log(
  "4. Monitor with `pnpm ralph:status` and resume with `pnpm ralph:resume:bg`.",
);

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--agent") {
      parsed.agent = argv[index + 1];
      index += 1;
      continue;
    }

    if (token.startsWith("--agent=")) {
      parsed.agent = token.slice("--agent=".length);
    }
  }

  return parsed;
}

function ensureRalphInstalled() {
  const result = spawnSync("ralph", ["--version"], {
    encoding: "utf8",
  });

  if (result.status === 0) {
    return;
  }

  fail(
    "Ralph CLI is not available. Install it first, then rerun `pnpm ralph:bootstrap`.",
  );
}

function getCurrentProject() {
  const result = spawnSync("ralph", ["projects", "current", "--json"], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    fail(readBestEffortMessage(result.stderr, result.stdout));
  }

  try {
    return JSON.parse(extractJson(result.stdout));
  } catch (error) {
    fail(
      `Unable to parse \`ralph projects current --json\` output: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function resolveAgent(explicitAgent) {
  const requestedAgent = explicitAgent ?? process.env.RALPH_AGENT;

  if (requestedAgent) {
    ensureAgentExists(requestedAgent);
    return requestedAgent;
  }

  for (const candidate of ["cursor", "codex", "claude"]) {
    if (hasExecutable(candidate)) {
      return candidate;
    }
  }

  fail(
    "No supported agent CLI found. Install one of `cursor`, `codex`, or `claude`, or pass `--agent` explicitly.",
  );
}

function ensureAgentExists(agent) {
  if (hasExecutable(agent)) {
    return;
  }

  fail(
    `Requested agent \`${agent}\` was not found in PATH. Install it first or choose another agent.`,
  );
}

function hasExecutable(command) {
  const result = spawnSync("/bin/zsh", ["-lc", `whence -p ${command}`], {
    encoding: "utf8",
  });

  return result.status === 0 && result.stdout.trim().startsWith("/");
}

function extractJson(rawOutput) {
  const cleaned = stripAnsi(rawOutput);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    fail("Could not locate JSON payload in Ralph command output.");
  }

  return cleaned.slice(start, end + 1);
}

function stripAnsi(text) {
  const escapeChar = String.fromCharCode(27);
  const ansiPattern = new RegExp(`${escapeChar}\\[[0-9;?]*[ -/]*[@-~]`, "g");
  return text.replaceAll(ansiPattern, "").trim();
}

function readBestEffortMessage(stderr, stdout) {
  const message = [stderr, stdout].map(stripAnsi).filter(Boolean).join("\n");
  return message || "Ralph command failed without output.";
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
