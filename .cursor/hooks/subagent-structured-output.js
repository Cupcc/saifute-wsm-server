const {
  appendFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const path = require("node:path");

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function appendLog(filePath, value) {
  appendFileSync(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

function ensureDir(dirPath) {
  mkdirSync(dirPath, { recursive: true });
}

function sanitizeFilePart(value) {
  return (
    String(value || "unknown")
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "unknown"
  );
}

function extractStructuredResult(summary) {
  if (!summary) return null;

  const matches = [...String(summary).matchAll(/```json\s*([\s\S]*?)```/g)];
  for (let i = matches.length - 1; i >= 0; i -= 1) {
    const candidate = matches[i]?.[1]?.trim();
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate);
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof parsed.agent === "string"
      ) {
        return parsed;
      }
    } catch {
      // Keep scanning older fenced blocks.
    }
  }

  return null;
}

function isStringArray(value) {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  );
}

function validateResult(result) {
  const commonErrors = [];

  if (!result || typeof result !== "object") {
    return ["structured result is missing or not an object"];
  }

  if (typeof result.agent !== "string" || !result.agent) {
    commonErrors.push("field `agent` must be a non-empty string");
  }

  if (typeof result.status !== "string" || !result.status) {
    commonErrors.push("field `status` must be a non-empty string");
  }

  if (typeof result.task_doc_path !== "string" || !result.task_doc_path) {
    commonErrors.push("field `task_doc_path` must be a non-empty string");
  }

  if (!isStringArray(result.summary ?? [])) {
    commonErrors.push("field `summary` must be an array of strings");
  }

  if (!isStringArray(result.risks ?? [])) {
    commonErrors.push("field `risks` must be an array of strings");
  }

  if (typeof result.next_step !== "string" || !result.next_step) {
    commonErrors.push("field `next_step` must be a non-empty string");
  }

  switch (result.agent) {
    case "planner":
      if (typeof result.acceptance_mode !== "string") {
        commonErrors.push("planner result requires `acceptance_mode`");
      }
      if (typeof result.parallelization !== "string") {
        commonErrors.push("planner result requires `parallelization`");
      }
      if (!isStringArray(result.impacted_scope ?? [])) {
        commonErrors.push(
          "planner result requires `impacted_scope` as string array",
        );
      }
      if (!isStringArray(result.validation ?? [])) {
        commonErrors.push(
          "planner result requires `validation` as string array",
        );
      }
      break;
    case "coder":
      if (!isStringArray(result.changed_paths ?? [])) {
        commonErrors.push(
          "coder result requires `changed_paths` as string array",
        );
      }
      if (!isStringArray(result.contracts ?? [])) {
        commonErrors.push("coder result requires `contracts` as string array");
      }
      if (!isStringArray(result.validation_ran ?? [])) {
        commonErrors.push(
          "coder result requires `validation_ran` as string array",
        );
      }
      if (!isStringArray(result.validation_needed ?? [])) {
        commonErrors.push(
          "coder result requires `validation_needed` as string array",
        );
      }
      if (!isStringArray(result.checklist_items ?? [])) {
        commonErrors.push(
          "coder result requires `checklist_items` as string array",
        );
      }
      break;
    case "code-reviewer":
      if (typeof result.acceptance_mode !== "string") {
        commonErrors.push("code-reviewer result requires `acceptance_mode`");
      }
      if (!Array.isArray(result.findings)) {
        commonErrors.push("code-reviewer result requires `findings` as array");
      }
      if (!isStringArray(result.validation_ran ?? [])) {
        commonErrors.push(
          "code-reviewer result requires `validation_ran` as string array",
        );
      }
      if (typeof result.validation_status !== "string") {
        commonErrors.push("code-reviewer result requires `validation_status`");
      }
      if (!isStringArray(result.evidence ?? [])) {
        commonErrors.push(
          "code-reviewer result requires `evidence` as string array",
        );
      }
      break;
    case "acceptance-qa":
      if (
        typeof result.requirement_path !== "string" &&
        result.requirement_path !== null
      ) {
        commonErrors.push(
          "acceptance-qa result requires `requirement_path` string or null",
        );
      }
      if (typeof result.acceptance_mode !== "string") {
        commonErrors.push("acceptance-qa result requires `acceptance_mode`");
      }
      if (!Array.isArray(result.verification_results)) {
        commonErrors.push(
          "acceptance-qa result requires `verification_results` as array",
        );
      }
      if (
        !(typeof result.spec_path === "string" || result.spec_path === null)
      ) {
        commonErrors.push(
          "acceptance-qa result requires `spec_path` string or null",
        );
      }
      if (!(typeof result.run_path === "string" || result.run_path === null)) {
        commonErrors.push(
          "acceptance-qa result requires `run_path` string or null",
        );
      }
      break;
    default:
      commonErrors.push(`unsupported agent type: ${String(result.agent)}`);
      break;
  }

  return commonErrors;
}

function buildFollowupMessage(validationErrors) {
  const errorText =
    validationErrors.length > 0
      ? validationErrors.map((item) => `- ${item}`).join("\n")
      : "- structured result is missing";

  return [
    "Your previous final response did not satisfy the required Structured Result contract.",
    "Send a corrected final response now.",
    "Requirements:",
    "- Keep your normal required sections.",
    "- End with exactly one fenced `json` block under the `### Structured Result` heading.",
    "- Do not put any prose after that JSON block.",
    "- Ensure the JSON is valid and matches your role-specific required fields from your prompt.",
    "Validation errors:",
    errorText,
  ].join("\n");
}

function main() {
  const raw = readStdin();
  if (!raw.trim()) {
    process.stdout.write("{}\n");
    return;
  }

  const payload = JSON.parse(raw);
  const summary = String(payload.summary || "");
  const structured = extractStructuredResult(summary);
  const validationErrors = validateResult(structured);

  const projectDir = process.env.CURSOR_PROJECT_DIR || process.cwd();
  const stateDir = path.join(
    projectDir,
    ".cursor",
    "hooks",
    "state",
    "subagents",
  );
  ensureDir(stateDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const taskPart = sanitizeFilePart(
    payload.task || payload.description || payload.subagent_type,
  );
  const record = {
    recorded_at: new Date().toISOString(),
    hook_event_name: payload.hook_event_name || "subagentStop",
    conversation_id: payload.conversation_id || null,
    generation_id: payload.generation_id || null,
    subagent_type: payload.subagent_type || null,
    description: payload.description || null,
    task: payload.task || null,
    status: payload.status || null,
    duration_ms: payload.duration_ms || null,
    modified_files: payload.modified_files || [],
    structured_result: structured,
    validation: {
      valid: validationErrors.length === 0,
      errors: validationErrors,
    },
    transcript_path: payload.agent_transcript_path || null,
  };

  const recordFile = path.join(stateDir, `${timestamp}-${taskPart}.json`);
  writeJson(recordFile, record);

  if (structured && typeof structured.agent === "string") {
    writeJson(path.join(stateDir, `latest-${structured.agent}.json`), record);
  }

  appendLog(path.join(stateDir, "subagent-results.jsonl"), record);

  if (validationErrors.length > 0) {
    process.stderr.write(
      `subagent structured output validation failed: ${validationErrors.join("; ")}\n`,
    );

    if (payload.status === "completed" && Number(payload.loop_count || 0) < 1) {
      process.stdout.write(
        `${JSON.stringify({
          followup_message: buildFollowupMessage(validationErrors),
        })}\n`,
      );
      return;
    }
  }

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
