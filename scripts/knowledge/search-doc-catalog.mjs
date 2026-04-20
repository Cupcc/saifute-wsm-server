#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_CATALOG_PATH = "docs/catalog/catalog.jsonl";
const DEFAULT_LIMIT = 5;

function printHelp() {
  console.log(`Usage: node ./scripts/knowledge/search-doc-catalog.mjs [options]

Options:
  --query <text>           Natural-language query for the current task
  --agent <name>           Agent role, for example orchestrator or coder
  --stage <name>           Task stage, for example discovery or review
  --surface <path>         Changed path or semantic surface. Repeatable
  --limit <number>         Maximum number of hits. Default: ${DEFAULT_LIMIT}
  --catalog <path>         Catalog path. Default: ${DEFAULT_CATALOG_PATH}
  --pretty                 Print a readable text report instead of JSON
  --help                   Show this help message
`);
}

function parsePositiveInteger(value, flagName) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flagName} expects a positive integer.`);
  }

  return parsed;
}

function readFlagValue(argv, index, flagName) {
  const value = argv[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${flagName} expects a value.`);
  }

  return value;
}

function parseArgs(argv) {
  const options = {
    agent: null,
    catalogPath: DEFAULT_CATALOG_PATH,
    help: false,
    limit: DEFAULT_LIMIT,
    pretty: false,
    query: "",
    stage: null,
    surfaces: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--") {
      continue;
    }

    if (argument === "--help") {
      options.help = true;
      continue;
    }

    if (argument === "--pretty") {
      options.pretty = true;
      continue;
    }

    if (argument === "--query" || argument.startsWith("--query=")) {
      options.query =
        argument === "--query"
          ? readFlagValue(argv, index, "--query")
          : argument.slice("--query=".length);

      if (argument === "--query") {
        index += 1;
      }

      continue;
    }

    if (argument === "--agent" || argument.startsWith("--agent=")) {
      options.agent =
        argument === "--agent"
          ? readFlagValue(argv, index, "--agent")
          : argument.slice("--agent=".length);

      if (argument === "--agent") {
        index += 1;
      }

      continue;
    }

    if (argument === "--stage" || argument.startsWith("--stage=")) {
      options.stage =
        argument === "--stage"
          ? readFlagValue(argv, index, "--stage")
          : argument.slice("--stage=".length);

      if (argument === "--stage") {
        index += 1;
      }

      continue;
    }

    if (argument === "--surface" || argument.startsWith("--surface=")) {
      const value =
        argument === "--surface"
          ? readFlagValue(argv, index, "--surface")
          : argument.slice("--surface=".length);

      options.surfaces.push(value);

      if (argument === "--surface") {
        index += 1;
      }

      continue;
    }

    if (argument === "--limit" || argument.startsWith("--limit=")) {
      const value =
        argument === "--limit"
          ? readFlagValue(argv, index, "--limit")
          : argument.slice("--limit=".length);

      options.limit = parsePositiveInteger(value, "--limit");

      if (argument === "--limit") {
        index += 1;
      }

      continue;
    }

    if (argument === "--catalog" || argument.startsWith("--catalog=")) {
      options.catalogPath =
        argument === "--catalog"
          ? readFlagValue(argv, index, "--catalog")
          : argument.slice("--catalog=".length);

      if (argument === "--catalog") {
        index += 1;
      }

      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  if (
    !options.help &&
    !options.query.trim() &&
    !options.agent &&
    !options.stage &&
    options.surfaces.length === 0
  ) {
    throw new Error(
      "At least one of --query, --agent, --stage, or --surface is required.",
    );
  }

  return options;
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeList(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.map((value) => normalizeString(String(value))).filter(Boolean);
}

function tokenize(text) {
  const tokens = text.toLowerCase().match(/[\p{L}\p{N}./_-]+/gu);

  if (!tokens) {
    return [];
  }

  return [...new Set(tokens.filter((token) => token.length > 1))];
}

function escapeRegExp(text) {
  return text.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function globToRegExp(pattern) {
  const escaped = pattern
    .replaceAll("**", "___DOUBLE_WILDCARD___")
    .replaceAll("*", "___SINGLE_WILDCARD___");
  const normalized = escapeRegExp(escaped)
    .replaceAll("___DOUBLE_WILDCARD___", ".*")
    .replaceAll("___SINGLE_WILDCARD___", "[^/]*");

  return new RegExp(`^${normalized}$`, "i");
}

function surfaceMatches(pattern, surface) {
  const normalizedPattern = normalizeString(pattern);
  const normalizedSurface = normalizeString(surface);

  if (!normalizedPattern || !normalizedSurface) {
    return false;
  }

  if (normalizedPattern === normalizedSurface) {
    return true;
  }

  if (normalizedPattern.includes("*")) {
    return globToRegExp(normalizedPattern).test(normalizedSurface);
  }

  if (normalizedSurface.includes("*")) {
    return globToRegExp(normalizedSurface).test(normalizedPattern);
  }

  return (
    normalizedSurface.startsWith(normalizedPattern) ||
    normalizedPattern.startsWith(normalizedSurface) ||
    normalizedSurface.includes(normalizedPattern)
  );
}

function buildSearchText(record) {
  return [
    record.id,
    record.doc_type,
    record.topic,
    record.title,
    record.summary,
    record.source_path,
    record.source_heading,
    ...normalizeList(record.keywords),
    ...normalizeList(record.tags),
    ...normalizeList(record.audiences),
    ...normalizeList(record.stages),
    ...normalizeList(record.surfaces),
    ...normalizeList(record.when_to_read),
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

function scoreRecord(record, options) {
  const reasons = [];
  let score = 0;

  const audiences = normalizeList(record.audiences);
  const stages = normalizeList(record.stages);
  const keywords = normalizeList(record.keywords);
  const tags = normalizeList(record.tags);
  const surfaces = normalizeList(record.surfaces);
  const whenToRead = normalizeList(record.when_to_read);
  const docType = normalizeString(record.doc_type);
  const topic = normalizeString(record.topic);
  const title = normalizeString(record.title);
  const summary = normalizeString(record.summary);
  const sourceHeading = normalizeString(record.source_heading);
  const searchText = buildSearchText(record);

  const normalizedAgent = normalizeString(options.agent);

  if (normalizedAgent && audiences.includes(normalizedAgent)) {
    score += 20;
    reasons.push(`audience:${normalizedAgent}`);
  }

  const normalizedStage = normalizeString(options.stage);

  if (normalizedStage && stages.includes(normalizedStage)) {
    score += 16;
    reasons.push(`stage:${normalizedStage}`);
  }

  const surfaceHits = [];
  let hasMeaningfulSignal = false;

  for (const surface of options.surfaces) {
    if (surfaces.some((pattern) => surfaceMatches(pattern, surface))) {
      score += 18;
      surfaceHits.push(surface);
      hasMeaningfulSignal = true;
    }
  }

  if (surfaceHits.length > 0) {
    reasons.push(`surface:${surfaceHits.join(",")}`);
  }

  const query = normalizeString(options.query);

  if (query) {
    if (title.includes(query)) {
      score += 20;
      reasons.push("phrase:title");
      hasMeaningfulSignal = true;
    } else if (summary.includes(query) || sourceHeading.includes(query)) {
      score += 14;
      reasons.push("phrase:summary");
      hasMeaningfulSignal = true;
    }
  }

  const tokenHits = new Set();

  for (const token of tokenize(options.query)) {
    let tokenScore = 0;

    if (keywords.includes(token)) {
      tokenScore = Math.max(tokenScore, 8);
    }

    if (tags.includes(token)) {
      tokenScore = Math.max(tokenScore, 7);
    }

    if (whenToRead.includes(token) || docType === token || topic === token) {
      tokenScore = Math.max(tokenScore, 6);
    }

    if (
      token.length >= 3 &&
      (keywords.some(
        (value) => value.includes(token) || token.includes(value),
      ) ||
        tags.some((value) => value.includes(token) || token.includes(value)) ||
        topic.includes(token))
    ) {
      tokenScore = Math.max(tokenScore, 6);
    }

    if (searchText.includes(token)) {
      tokenScore = Math.max(tokenScore, 4);
    }

    if (tokenScore > 0) {
      score += tokenScore;
      tokenHits.add(token);
      hasMeaningfulSignal = true;
    }
  }

  if (tokenHits.size > 0) {
    reasons.push(`tokens:${[...tokenHits].join(",")}`);
  }

  if (normalizedAgent && normalizedStage && tokenHits.size > 0) {
    score += 4;
  }

  if (query && !hasMeaningfulSignal) {
    return { reasons: [], score: 0 };
  }

  return { reasons, score };
}

async function loadCatalog(catalogPath) {
  const content = await readFile(catalogPath, "utf8");
  const records = [];

  for (const [index, rawLine] of content.split(/\r?\n/).entries()) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    try {
      records.push(JSON.parse(line));
    } catch (error) {
      throw new Error(
        `Invalid JSON on line ${index + 1} of ${catalogPath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  return records;
}

function formatPretty(results, catalogPath) {
  if (results.length === 0) {
    return `No catalog matches in ${catalogPath}`;
  }

  const lines = [`Catalog matches from ${catalogPath}:`];

  for (const result of results) {
    lines.push(
      `- ${result.id} [score=${result.score}] ${result.title} -> ${result.source_path}`,
    );

    if (result.source_heading) {
      lines.push(`  heading: ${result.source_heading}`);
    }

    lines.push(`  matched_on: ${result.matched_on.join(", ")}`);
    lines.push(`  summary: ${result.summary}`);
  }

  return lines.join("\n");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const catalogPath = path.resolve(process.cwd(), options.catalogPath);
  const records = await loadCatalog(catalogPath);
  const results = records
    .map((record) => {
      const { reasons, score } = scoreRecord(record, options);

      return {
        doc_type: record.doc_type,
        id: record.id,
        matched_on: reasons,
        maturity: record.maturity,
        score,
        source_heading: record.source_heading,
        source_path: record.source_path,
        summary: record.summary,
        title: record.title,
        topic: record.topic,
      };
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.id.localeCompare(right.id);
    })
    .slice(0, options.limit);

  if (options.pretty) {
    console.log(formatPretty(results, catalogPath));
    return;
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
