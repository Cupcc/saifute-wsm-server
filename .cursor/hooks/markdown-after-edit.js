const { spawnSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const path = require("node:path");

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function isMarkdownTarget(filePath) {
  const normalized = filePath.replace(/\\/g, "/");

  if (normalized.includes("/node_modules/") || normalized.includes("/dist/")) {
    return false;
  }

  return /\.(md|markdown|mdown|mkdn|mkd)$/i.test(normalized);
}

function run(command, args, cwd) {
  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
  });
}

function tryMarkdownlint(relativePath, projectDir) {
  const attempts =
    process.platform === "win32"
      ? [
          ["pnpm.cmd", ["exec", "markdownlint-cli2", "--fix", relativePath]],
          ["markdownlint-cli2.cmd", ["--fix", relativePath]],
        ]
      : [
          ["pnpm", ["exec", "markdownlint-cli2", "--fix", relativePath]],
          ["markdownlint-cli2", ["--fix", relativePath]],
        ];

  for (const [command, args] of attempts) {
    const result = run(command, args, projectDir);
    if (result.status === 0) {
      return true;
    }

    if (result.error && result.error.code === "ENOENT") {
    }
  }

  return false;
}

function main() {
  const raw = readStdin();
  if (!raw.trim()) {
    process.stdout.write("{}\n");
    return;
  }

  const payload = JSON.parse(raw);
  const filePath = payload.file_path;
  if (!filePath || !isMarkdownTarget(filePath)) {
    process.stdout.write("{}\n");
    return;
  }

  const projectDir = process.env.CURSOR_PROJECT_DIR || process.cwd();
  const relativePath = path.relative(projectDir, filePath);
  if (relativePath.startsWith("..")) {
    process.stdout.write("{}\n");
    return;
  }

  tryMarkdownlint(relativePath, projectDir);
  process.stdout.write("{}\n");
}

try {
  main();
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.stack : String(error)}\n`,
  );
  process.stdout.write("{}\n");
}
