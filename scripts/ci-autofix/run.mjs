#!/usr/bin/env node

import { spawn } from "node:child_process";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const HELP_TEXT = `ci-autofix runner

Required environment variables:
  GITHUB_TOKEN
  CI_AUTOFIX_SOURCE_RUN_ID

Recommended environment variables:
  CI_AUTOFIX_ALLOWED_BRANCH_REGEX
  CI_AUTOFIX_PROTECTED_BRANCH_REGEX
  CI_AUTOFIX_MAX_ATTEMPTS
  CI_AUTOFIX_CODEX_MODEL

Optional environment variables:
  OPENAI_API_KEY
  CI_AUTOFIX_LOG_ROOT
  CI_AUTOFIX_WORKFLOW_NAME
  CI_AUTOFIX_COMMENT_ON_PR
  CI_AUTOFIX_VALIDATE_COMMANDS_JSON
  CI_AUTOFIX_GIT_USER_NAME
  CI_AUTOFIX_GIT_USER_EMAIL
  CI_AUTOFIX_DATABASE_URL
  CI_AUTOFIX_COMMIT_PREFIX
`;

const DEFAULT_DATABASE_URL = "mysql://ci:ci@127.0.0.1:3306/saifute_ci";

function parseBoolean(value, fallback) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeFileSegment(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function nowIso() {
  return new Date().toISOString();
}

function buildRunUrl(serverUrl, repository, runId) {
  return `${serverUrl}/${repository}/actions/runs/${runId}`;
}

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getConfig() {
  const sourceRunId = getRequiredEnv("CI_AUTOFIX_SOURCE_RUN_ID");
  const githubToken = getRequiredEnv("GITHUB_TOKEN");
  const repository = (
    process.env.GITHUB_REPOSITORY?.trim() || getRequiredEnv("CI_AUTOFIX_REPOSITORY")
  ).replace(/^\/+|\/+$/g, "");

  return {
    sourceRunId,
    githubToken,
    repository,
    serverUrl: process.env.GITHUB_SERVER_URL?.trim() || "https://github.com",
    currentWorkflowRunId:
      process.env.GITHUB_RUN_ID?.trim() || `local-${Date.now()}`,
    currentWorkflowUrl: buildRunUrl(
      process.env.GITHUB_SERVER_URL?.trim() || "https://github.com",
      repository,
      process.env.GITHUB_RUN_ID?.trim() || "local",
    ),
    workspace: path.resolve(
      process.env.GITHUB_WORKSPACE?.trim() || process.cwd(),
    ),
    logRoot: path.resolve(
      process.env.CI_AUTOFIX_LOG_ROOT?.trim() || "logs/ci-autofix",
    ),
    workflowName: process.env.CI_AUTOFIX_WORKFLOW_NAME?.trim() || "CI",
    allowedBranchRegex:
      process.env.CI_AUTOFIX_ALLOWED_BRANCH_REGEX?.trim() || ".*",
    protectedBranchRegex:
      process.env.CI_AUTOFIX_PROTECTED_BRANCH_REGEX?.trim() ||
      "^(main|master|release\\/.*)$",
    maxAttempts: parseNumber(process.env.CI_AUTOFIX_MAX_ATTEMPTS, 2),
    commentOnPr: parseBoolean(process.env.CI_AUTOFIX_COMMENT_ON_PR, true),
    codexBin: process.env.CI_AUTOFIX_CODEX_BIN?.trim() || "codex",
    codexModel: process.env.CI_AUTOFIX_CODEX_MODEL?.trim() || "",
    codexDangerouslyBypassSandbox: parseBoolean(
      process.env.CI_AUTOFIX_CODEX_DANGEROUSLY_BYPASS_SANDBOX,
      true,
    ),
    openAiApiKey: process.env.OPENAI_API_KEY?.trim() || "",
    gitUserName:
      process.env.CI_AUTOFIX_GIT_USER_NAME?.trim() || "github-actions[bot]",
    gitUserEmail:
      process.env.CI_AUTOFIX_GIT_USER_EMAIL?.trim() ||
      "41898282+github-actions[bot]@users.noreply.github.com",
    databaseUrl:
      process.env.CI_AUTOFIX_DATABASE_URL?.trim() || DEFAULT_DATABASE_URL,
    commitPrefix:
      process.env.CI_AUTOFIX_COMMIT_PREFIX?.trim() ||
      "fix(ci): auto-repair",
    validationCommandsJson:
      process.env.CI_AUTOFIX_VALIDATE_COMMANDS_JSON?.trim() || "",
  };
}

function getDefaultValidationCommands(config) {
  return [
    {
      name: "root-install",
      command: "HUSKY=0 pnpm install --frozen-lockfile",
    },
    {
      name: "prisma-validate",
      command: `DATABASE_URL='${config.databaseUrl}' pnpm prisma:validate`,
    },
    {
      name: "typecheck",
      command: "pnpm typecheck",
    },
    {
      name: "build",
      command: "pnpm build",
    },
    {
      name: "web-install",
      command: "HUSKY=0 pnpm --dir web install --frozen-lockfile",
    },
    {
      name: "web-build",
      command: "pnpm --dir web build:prod",
    },
  ];
}

function getValidationCommands(config) {
  if (!config.validationCommandsJson) {
    return getDefaultValidationCommands(config);
  }

  const parsed = JSON.parse(config.validationCommandsJson);
  if (!Array.isArray(parsed)) {
    throw new Error("CI_AUTOFIX_VALIDATE_COMMANDS_JSON must be an array");
  }

  return parsed.map((entry, index) => {
    if (typeof entry === "string") {
      return {
        name: `custom-${index + 1}`,
        command: entry,
      };
    }

    if (
      typeof entry === "object" &&
      entry &&
      typeof entry.name === "string" &&
      typeof entry.command === "string"
    ) {
      return {
        name: entry.name,
        command: entry.command,
      };
    }

    throw new Error(
      "CI_AUTOFIX_VALIDATE_COMMANDS_JSON entries must be strings or {name, command}",
    );
  });
}

async function writeJson(filePath, payload) {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function appendJsonl(filePath, payload) {
  await appendFile(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

function createRecorder(attemptDir) {
  const operationLogPath = path.join(attemptDir, "operation-log.jsonl");
  const summary = {
    status: "running",
    startedAt: nowIso(),
    finishedAt: null,
    repository: null,
    sourceRunId: null,
    sourceRunUrl: null,
    autofixWorkflowUrl: null,
    branch: null,
    headSha: null,
    reason: null,
    attemptCountBeforeRun: 0,
    failingJobs: [],
    validationResults: [],
    codexExitCode: null,
    commitSha: null,
    prComments: [],
  };

  return {
    summary,
    async event(type, message, details = null) {
      const payload = {
        at: nowIso(),
        type,
        message,
        details,
      };
      console.log(`[ci-autofix] ${message}`);
      await appendJsonl(operationLogPath, payload);
    },
  };
}

async function runCommand(command, args, options = {}) {
  const {
    cwd = process.cwd(),
    env = process.env,
    stdinText = "",
    stdoutFile = null,
    stderrFile = null,
    allowFailure = false,
  } = options;

  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: "pipe",
    });

    const stdoutChunks = [];
    const stderrChunks = [];

    if (stdinText) {
      child.stdin.write(stdinText);
    }
    child.stdin.end();

    child.stdout.on("data", (chunk) => {
      stdoutChunks.push(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderrChunks.push(chunk);
    });

    child.on("error", reject);
    child.on("close", async (code) => {
      const stdout = Buffer.concat(stdoutChunks).toString("utf8");
      const stderr = Buffer.concat(stderrChunks).toString("utf8");

      if (stdoutFile) {
        await writeFile(stdoutFile, stdout, "utf8");
      }
      if (stderrFile) {
        await writeFile(stderrFile, stderr, "utf8");
      }

      if (code !== 0 && !allowFailure) {
        const error = new Error(
          `Command failed: ${command} ${args.join(" ")} (exit ${code})`,
        );
        error.code = code;
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }

      resolve({
        code: code ?? 0,
        stdout,
        stderr,
      });
    });
  });
}

async function githubRequest(config, pathname, init = {}) {
  const response = await fetch(
    `https://api.github.com/repos/${config.repository}${pathname}`,
    {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${config.githubToken}`,
        "User-Agent": "saifute-ci-autofix",
        ...init.headers,
      },
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `GitHub API ${response.status} ${response.statusText}: ${pathname}\n${body}`,
    );
  }

  return response;
}

function countConsecutiveAutofixCommits(logOutput, commitPrefix) {
  const lines = logOutput
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let count = 0;
  for (const line of lines) {
    if (!line.startsWith(commitPrefix)) {
      break;
    }
    count += 1;
  }

  return count;
}

function buildPrompt({ config, run, failingJobs, attemptDir }) {
  const validationCommands = getValidationCommands(config)
    .map((item) => `- ${item.command}`)
    .join("\n");
  const failingJobSummary = failingJobs
    .map(
      (job) =>
        `## ${job.name}\n- Job id: ${job.id}\n- Log file: ${job.logPath}\n- Failure snippet:\n\`\`\`\n${job.failureSnippet}\n\`\`\``,
    )
    .join("\n\n");

  return `你正在处理一次 GitHub Actions CI 自动修复任务。

仓库信息:
- repository: ${config.repository}
- branch: ${run.head_branch}
- failing workflow run id: ${run.id}
- failing workflow url: ${run.html_url}
- failing workflow name: ${run.name}
- target sha: ${run.head_sha}
- workspace: ${config.workspace}
- audit log directory: ${attemptDir}

要求:
- 只修复当前 CI 失败直接相关的问题。
- 不要提交 commit，也不要 push。
- 不要修改 GitHub secrets、token 或 runner 配置。
- 保持修复范围尽量小，不要顺手做无关重构。
- 如果判断这是外部依赖、凭据、GitHub 配置或受保护分支导致的问题，请不要硬修代码，而是在最终总结中明确说明。
- 修改后请自行运行必要检查，但父脚本仍会再次统一执行验证命令。

当前失败 job:

${failingJobSummary}

父脚本稍后会统一执行这些验证命令:
${validationCommands}

请在仓库内直接修改文件，并在最后给出简洁中文总结:
- 你修了什么
- 哪些命令你实际运行过
- 还有哪些风险或未验证项
`;
}

function getFailureSnippet(logText) {
  const lines = logText.split("\n").filter(Boolean);
  const tail = lines.slice(-80).join("\n").trim();
  if (tail.length <= 4000) {
    return tail;
  }
  return tail.slice(tail.length - 4000);
}

function buildSummaryMarkdown(summary) {
  const failingJobs = summary.failingJobs
    .map((job) => `- ${job.name} (#${job.id})`)
    .join("\n");
  const validations = summary.validationResults.length
    ? summary.validationResults
        .map(
          (result) =>
            `- ${result.name}: ${result.passed ? "passed" : "failed"} (${result.command})`,
        )
        .join("\n")
    : "- none";
  const prComments = summary.prComments.length
    ? summary.prComments.map((entry) => `- PR #${entry.number}: ${entry.status}`).join("\n")
    : "- none";

  return `# CI Autofix Summary

- status: ${summary.status}
- repository: ${summary.repository ?? "unknown"}
- source run id: ${summary.sourceRunId ?? "unknown"}
- source run url: ${summary.sourceRunUrl ?? "unknown"}
- autofix workflow url: ${summary.autofixWorkflowUrl ?? "unknown"}
- branch: ${summary.branch ?? "unknown"}
- head sha: ${summary.headSha ?? "unknown"}
- attempt count before run: ${summary.attemptCountBeforeRun}
- reason: ${summary.reason ?? "n/a"}
- codex exit code: ${summary.codexExitCode ?? "n/a"}
- commit sha: ${summary.commitSha ?? "n/a"}

## Failing Jobs

${failingJobs || "- none"}

## Validation Results

${validations}

## PR Comments

${prComments}
`;
}

async function postPullRequestComment(config, run, recorder) {
  if (!config.commentOnPr) {
    return;
  }

  const pullRequests = Array.isArray(run.pull_requests) ? run.pull_requests : [];
  if (pullRequests.length === 0) {
    return;
  }

  for (const pr of pullRequests) {
    const body = [
      "CI 自动修复任务已执行。",
      "",
      `- 原始 CI Run: ${recorder.summary.sourceRunUrl}`,
      `- 自动修复 Workflow: ${recorder.summary.autofixWorkflowUrl}`,
      `- 当前结果: ${recorder.summary.status}`,
      `- 原因: ${recorder.summary.reason ?? "n/a"}`,
      `- 提交: ${recorder.summary.commitSha ?? "n/a"}`,
    ].join("\n");

    await githubRequest(
      config,
      `/issues/${pr.number}/comments`,
      {
        method: "POST",
        body: JSON.stringify({ body }),
      },
    );

    recorder.summary.prComments.push({
      number: pr.number,
      status: "posted",
    });
    await recorder.event("pr-comment", `Posted PR comment to #${pr.number}`);
  }
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log(HELP_TEXT);
    return;
  }

  const config = getConfig();
  const sourceRunRoot = path.join(config.logRoot, String(config.sourceRunId));
  const attemptDir = path.join(
    sourceRunRoot,
    `autofix-${sanitizeFileSegment(config.currentWorkflowRunId)}`,
  );
  await mkdir(attemptDir, { recursive: true });
  await writeFile(
    path.join(sourceRunRoot, "latest-attempt.txt"),
    `${path.basename(attemptDir)}\n`,
    "utf8",
  );

  const recorder = createRecorder(attemptDir);
  recorder.summary.repository = config.repository;
  recorder.summary.sourceRunId = config.sourceRunId;
  recorder.summary.autofixWorkflowUrl = config.currentWorkflowUrl;

  const finalize = async () => {
    recorder.summary.finishedAt = nowIso();
    const summaryMarkdown = buildSummaryMarkdown(recorder.summary);
    await writeJson(path.join(attemptDir, "summary.json"), recorder.summary);
    await writeFile(path.join(attemptDir, "summary.md"), summaryMarkdown, "utf8");
  };

  try {
    await recorder.event(
      "start",
      `Starting autofix for workflow run ${config.sourceRunId}`,
      {
        repository: config.repository,
        workspace: config.workspace,
        attemptDir,
      },
    );

    const runResponse = await githubRequest(
      config,
      `/actions/runs/${config.sourceRunId}`,
    );
    const run = await runResponse.json();
    recorder.summary.sourceRunUrl = run.html_url;
    recorder.summary.branch = run.head_branch;
    recorder.summary.headSha = run.head_sha;
    await writeJson(path.join(attemptDir, "workflow-run.json"), run);

    if (!run.head_branch || !run.head_sha) {
      recorder.summary.status = "failed";
      recorder.summary.reason = "workflow run is missing head branch or head sha";
      await recorder.event("error", recorder.summary.reason);
      await finalize();
      return;
    }

    if (run.name !== config.workflowName) {
      recorder.summary.status = "skipped";
      recorder.summary.reason = `workflow name mismatch: expected ${config.workflowName}, got ${run.name}`;
      await recorder.event("skip", recorder.summary.reason);
      await finalize();
      return;
    }

    if (run.conclusion === "success") {
      recorder.summary.status = "completed";
      recorder.summary.reason = "source CI already passed";
      await recorder.event("complete", recorder.summary.reason);
      await finalize();
      return;
    }

    if (run.conclusion !== "failure") {
      recorder.summary.status = "skipped";
      recorder.summary.reason = `unsupported conclusion: ${run.conclusion}`;
      await recorder.event("skip", recorder.summary.reason);
      await finalize();
      return;
    }

    if (run.head_repository?.full_name !== config.repository) {
      recorder.summary.status = "skipped";
      recorder.summary.reason = "head repository differs from base repository";
      await recorder.event("skip", recorder.summary.reason);
      await finalize();
      return;
    }

    const allowedBranch = new RegExp(config.allowedBranchRegex);
    const protectedBranch = new RegExp(config.protectedBranchRegex);
    if (!allowedBranch.test(run.head_branch)) {
      recorder.summary.status = "skipped";
      recorder.summary.reason = `branch not allowed by regex: ${run.head_branch}`;
      await recorder.event("skip", recorder.summary.reason);
      await finalize();
      return;
    }

    if (protectedBranch.test(run.head_branch)) {
      recorder.summary.status = "skipped";
      recorder.summary.reason = `branch protected by regex: ${run.head_branch}`;
      await recorder.event("skip", recorder.summary.reason);
      await finalize();
      return;
    }

    await recorder.event("git", `Fetching latest branch state for ${run.head_branch}`);
    await runCommand(
      "git",
      ["fetch", "origin", run.head_branch, "--prune", "--depth", "20"],
      {
        cwd: config.workspace,
        stdoutFile: path.join(attemptDir, "git-fetch.stdout.log"),
        stderrFile: path.join(attemptDir, "git-fetch.stderr.log"),
      },
    );

    const remoteHead = await runCommand(
      "git",
      ["rev-parse", `origin/${run.head_branch}`],
      {
        cwd: config.workspace,
      },
    );
    const remoteHeadSha = remoteHead.stdout.trim();
    if (remoteHeadSha !== run.head_sha) {
      recorder.summary.status = "skipped";
      recorder.summary.reason =
        `stale workflow run: remote head is ${remoteHeadSha}, source run head is ${run.head_sha}`;
      await recorder.event("skip", recorder.summary.reason);
      await finalize();
      return;
    }

    const recentSubjects = await runCommand(
      "git",
      ["log", `origin/${run.head_branch}`, "--max-count", String(config.maxAttempts + 3), "--pretty=%s"],
      {
        cwd: config.workspace,
      },
    );
    recorder.summary.attemptCountBeforeRun = countConsecutiveAutofixCommits(
      recentSubjects.stdout,
      config.commitPrefix,
    );
    if (recorder.summary.attemptCountBeforeRun >= config.maxAttempts) {
      recorder.summary.status = "skipped";
      recorder.summary.reason =
        `reached max autofix attempts (${config.maxAttempts})`;
      await recorder.event("skip", recorder.summary.reason);
      await finalize();
      return;
    }

    const jobsResponse = await githubRequest(
      config,
      `/actions/runs/${config.sourceRunId}/jobs?per_page=100`,
    );
    const jobsPayload = await jobsResponse.json();
    await writeJson(path.join(attemptDir, "jobs.json"), jobsPayload);

    const failingJobs = [];
    for (const job of jobsPayload.jobs ?? []) {
      if (job.conclusion !== "failure") {
        continue;
      }

      const logResponse = await githubRequest(
        config,
        `/actions/jobs/${job.id}/logs`,
      );
      const logText = await logResponse.text();
      const logPath = path.join(
        attemptDir,
        `job-${job.id}-${sanitizeFileSegment(job.name)}.log`,
      );
      await writeFile(logPath, logText, "utf8");

      const failureSnippet = getFailureSnippet(logText);
      const jobRecord = {
        id: job.id,
        name: job.name,
        logPath,
        failureSnippet,
      };
      recorder.summary.failingJobs.push({
        id: job.id,
        name: job.name,
      });
      failingJobs.push(jobRecord);
      await recorder.event("job-log", `Saved failing job log for ${job.name}`, {
        id: job.id,
        logPath,
      });
    }

    if (failingJobs.length === 0) {
      recorder.summary.status = "skipped";
      recorder.summary.reason = "no failing GitHub Actions jobs found";
      await recorder.event("skip", recorder.summary.reason);
      await finalize();
      return;
    }

    await runCommand(
      "git",
      ["config", "user.name", config.gitUserName],
      {
        cwd: config.workspace,
      },
    );
    await runCommand(
      "git",
      ["config", "user.email", config.gitUserEmail],
      {
        cwd: config.workspace,
      },
    );

    if (config.openAiApiKey) {
      await recorder.event("codex-login", "Logging in Codex with OPENAI_API_KEY");
      await runCommand(
        config.codexBin,
        ["login", "--with-api-key"],
        {
          cwd: config.workspace,
          stdinText: config.openAiApiKey,
          stdoutFile: path.join(attemptDir, "codex-login.stdout.log"),
          stderrFile: path.join(attemptDir, "codex-login.stderr.log"),
        },
      );
    } else {
      await recorder.event(
        "codex-login",
        "OPENAI_API_KEY not provided, assuming Codex is already authenticated",
      );
    }

    const promptPath = path.join(attemptDir, "codex-prompt.md");
    const prompt = buildPrompt({
      config,
      run,
      failingJobs,
      attemptDir,
    });
    await writeFile(promptPath, prompt, "utf8");

    await recorder.event("codex", "Running codex exec against the failing workspace");
    const codexArgs = ["exec", "-C", config.workspace, "--json", "-o", path.join(attemptDir, "codex-last-message.md")];
    if (config.codexModel) {
      codexArgs.push("-m", config.codexModel);
    }
    if (config.codexDangerouslyBypassSandbox) {
      codexArgs.push("--dangerously-bypass-approvals-and-sandbox");
    } else {
      codexArgs.push("-s", "danger-full-access");
    }
    codexArgs.push("-");

    const codexResult = await runCommand(config.codexBin, codexArgs, {
      cwd: config.workspace,
      stdinText: prompt,
      stdoutFile: path.join(attemptDir, "codex-events.jsonl"),
      stderrFile: path.join(attemptDir, "codex-stderr.log"),
      allowFailure: true,
    });
    recorder.summary.codexExitCode = codexResult.code;
    if (codexResult.code !== 0) {
      recorder.summary.status = "failed";
      recorder.summary.reason = `codex exec exited with code ${codexResult.code}`;
      await recorder.event("codex", recorder.summary.reason);
      await finalize();
      return;
    }

    const validationCommands = getValidationCommands(config);
    for (const validation of validationCommands) {
      const safeName = sanitizeFileSegment(validation.name);
      const validationResult = await runCommand(
        "zsh",
        ["-lc", validation.command],
        {
          cwd: config.workspace,
          stdoutFile: path.join(attemptDir, `${safeName}.stdout.log`),
          stderrFile: path.join(attemptDir, `${safeName}.stderr.log`),
          allowFailure: true,
        },
      );

      const passed = validationResult.code === 0;
      recorder.summary.validationResults.push({
        name: validation.name,
        command: validation.command,
        passed,
      });
      await recorder.event(
        "validation",
        `${validation.name} ${passed ? "passed" : "failed"}`,
        {
          command: validation.command,
          exitCode: validationResult.code,
        },
      );

      if (!passed) {
        recorder.summary.status = "failed";
        recorder.summary.reason = `validation failed: ${validation.name}`;
        await finalize();
        return;
      }
    }

    const statusResult = await runCommand(
      "git",
      ["status", "--porcelain"],
      {
        cwd: config.workspace,
      },
    );
    const hasChanges = statusResult.stdout.trim().length > 0;
    if (!hasChanges) {
      recorder.summary.status = "completed";
      recorder.summary.reason =
        "validation passed but no file changes were produced";
      await recorder.event("complete", recorder.summary.reason);
      await finalize();
      return;
    }

    await runCommand(
      "git",
      ["fetch", "origin", run.head_branch, "--prune", "--depth", "20"],
      {
        cwd: config.workspace,
        stdoutFile: path.join(attemptDir, "git-refetch.stdout.log"),
        stderrFile: path.join(attemptDir, "git-refetch.stderr.log"),
      },
    );
    const remoteHeadBeforePush = await runCommand(
      "git",
      ["rev-parse", `origin/${run.head_branch}`],
      {
        cwd: config.workspace,
      },
    );
    if (remoteHeadBeforePush.stdout.trim() !== run.head_sha) {
      recorder.summary.status = "skipped";
      recorder.summary.reason =
        "branch advanced while autofix was running; skipping push";
      await recorder.event("skip", recorder.summary.reason);
      await finalize();
      return;
    }

    await runCommand("git", ["add", "-A"], {
      cwd: config.workspace,
    });
    await runCommand(
      "git",
      ["commit", "-m", `${config.commitPrefix} run ${config.sourceRunId}`],
      {
        cwd: config.workspace,
        stdoutFile: path.join(attemptDir, "git-commit.stdout.log"),
        stderrFile: path.join(attemptDir, "git-commit.stderr.log"),
      },
    );

    const commitSha = await runCommand(
      "git",
      ["rev-parse", "HEAD"],
      {
        cwd: config.workspace,
      },
    );
    recorder.summary.commitSha = commitSha.stdout.trim();

    await runCommand(
      "git",
      ["push", "origin", `HEAD:${run.head_branch}`],
      {
        cwd: config.workspace,
        stdoutFile: path.join(attemptDir, "git-push.stdout.log"),
        stderrFile: path.join(attemptDir, "git-push.stderr.log"),
      },
    );

    recorder.summary.status = "pushed";
    recorder.summary.reason = "autofix commit pushed successfully";
    await recorder.event("push", recorder.summary.reason, {
      commitSha: recorder.summary.commitSha,
      branch: run.head_branch,
    });

    await postPullRequestComment(config, run, recorder);
    await finalize();
  } catch (error) {
    recorder.summary.status = "failed";
    recorder.summary.reason =
      error instanceof Error ? error.message : "unknown error";
    await recorder.event("error", recorder.summary.reason);
    await finalize();
    process.exitCode = 1;
  }
}

await main();
