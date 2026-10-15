#!/usr/bin/env node
/**
 * Sync the reference research corpus from scripts/reference-corpus.json.
 *
 * The corpus is a set of shallow (depth-1) clones of third-party repos, used as
 * read-only research material. They are gitignored, so this script (plus the
 * committed manifest) is the only reproducible way to rebuild them.
 *
 * Usage:
 *   node scripts/sync-reference.mjs [--dir <path>] [--manifest <path>]
 *                                   [--concurrency N] [--json] [--dry-run]
 *
 * Behaviour per repo:
 *   existing dir -> rev-parse HEAD, fetch --depth 1 origin, reset --hard FETCH_HEAD
 *                   status updated    (HEAD moved)
 *                        | unchanged  (HEAD identical)
 *                        | error      (any git command failed; clone left untouched)
 *   missing dir  -> clone --depth 1 <url> <dir>
 *                   status cloned | error
 *
 * Manifest entries may declare `sparse: [<repo-relative path>, ...]`. Such a repo
 * is cloned with `--filter=blob:none --sparse` and then narrowed with
 * `git sparse-checkout set <paths...>`; refreshes of an existing clone stay
 * byte-for-byte the same operations as a full clone, because
 * `git reset --hard FETCH_HEAD` leaves the repo's own sparse-checkout config in
 * place.
 *
 * Every failure is surfaced: exit code 1 when any repo ended in `error`, but the
 * run always continues through the whole manifest.
 */

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);
const DEFAULT_DIR = path.resolve(SCRIPT_PATH, "../../reference");
const DEFAULT_MANIFEST = path.join(SCRIPT_DIR, "reference-corpus.json");
const STATE_FILENAME = "CORPUS_STATE.json";
const DEFAULT_CONCURRENCY = 4;
const GIT_TIMEOUT_MS = 300_000;
const SAFE_DIR_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

const USAGE = `Usage: node scripts/sync-reference.mjs [options]

Options:
  --dir <path>        corpus directory (default: <repo root>/reference)
  --manifest <path>   corpus manifest (default: scripts/reference-corpus.json)
  --concurrency N     repos synced in parallel (default: ${DEFAULT_CONCURRENCY})
  --json              print one JSON object instead of a table
  --dry-run           report what would happen; no fetch, clone, reset or write
  -h, --help          show this help`;

function fail(message) {
  process.stderr.write(`sync-reference: ${message}\n`);
  process.exitCode = 1;
}

function parseArgs(argv) {
  const options = {
    dir: DEFAULT_DIR,
    manifest: DEFAULT_MANIFEST,
    concurrency: DEFAULT_CONCURRENCY,
    json: false,
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const nextValue = () => {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`${arg} requires a value`);
      }
      i += 1;
      return value;
    };

    switch (arg) {
      case "--dir":
        options.dir = path.resolve(nextValue());
        break;
      case "--manifest":
        options.manifest = path.resolve(nextValue());
        break;
      case "--concurrency": {
        const raw = nextValue();
        const parsed = Number(raw);
        if (!Number.isInteger(parsed) || parsed < 1) {
          throw new Error(`--concurrency expects a positive integer, got "${raw}"`);
        }
        options.concurrency = parsed;
        break;
      }
      case "--json":
        options.json = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "-h":
      case "--help":
        options.help = true;
        break;
      default:
        throw new Error(`unknown argument "${arg}"\n\n${USAGE}`);
    }
  }

  return options;
}

async function loadManifest(manifestPath) {
  let raw;
  try {
    raw = await readFile(manifestPath, "utf8");
  } catch (error) {
    throw new Error(`cannot read manifest ${manifestPath}: ${error.message}`);
  }

  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (error) {
    throw new Error(`manifest ${manifestPath} is not valid JSON: ${error.message}`);
  }

  if (manifest === null || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error(`manifest ${manifestPath} must be a JSON object`);
  }
  if (manifest.version !== 1) {
    throw new Error(`manifest ${manifestPath} has unsupported version ${JSON.stringify(manifest.version)} (expected 1)`);
  }
  if (!Array.isArray(manifest.repos) || manifest.repos.length === 0) {
    throw new Error(`manifest ${manifestPath} must contain a non-empty "repos" array`);
  }

  const seen = new Set();
  const repos = manifest.repos.map((entry, index) => {
    const where = `${manifestPath}:repos[${index}]`;
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`${where} must be an object`);
    }
    for (const field of ["name", "url", "group"]) {
      if (typeof entry[field] !== "string" || entry[field].trim() === "") {
        throw new Error(`${where}.${field} must be a non-empty string`);
      }
    }
    if (!SAFE_DIR_NAME.test(entry.name) || entry.name === ".." || entry.name === ".") {
      throw new Error(`${where}.name "${entry.name}" is not a safe directory name`);
    }
    if (seen.has(entry.name)) {
      throw new Error(`${where}.name "${entry.name}" is duplicated in the manifest`);
    }
    seen.add(entry.name);

    let sparse;
    if (entry.sparse !== undefined) {
      if (!Array.isArray(entry.sparse) || entry.sparse.length === 0) {
        throw new Error(`${where}.sparse must be a non-empty array of repo-relative paths`);
      }
      sparse = entry.sparse.map((value, position) => {
        const at = `${where}.sparse[${position}]`;
        if (typeof value !== "string" || value.trim() === "") {
          throw new Error(`${at} must be a non-empty string`);
        }
        if (value.startsWith("/") || /^[A-Za-z]:/.test(value)) {
          throw new Error(`${at} "${value}" must be a repo-relative path`);
        }
        if (value.includes("\\")) {
          throw new Error(`${at} "${value}" must use forward slashes`);
        }
        const segments = value.split("/");
        for (const segment of segments) {
          if (segment === "" || segment === "." || segment === ".." || !SAFE_DIR_NAME.test(segment)) {
            throw new Error(`${at} "${value}" is not a safe repo-relative path`);
          }
        }
        return value;
      });
    }

    return sparse
      ? { name: entry.name, url: entry.url, group: entry.group, sparse }
      : { name: entry.name, url: entry.url, group: entry.group };
  });

  repos.sort((a, b) => a.name.localeCompare(b.name, "en"));
  return repos;
}

function runGit(args, cwd) {
  return new Promise((resolve) => {
    execFile(
      "git",
      args,
      {
        cwd,
        encoding: "utf8",
        windowsHide: true,
        timeout: GIT_TIMEOUT_MS,
        maxBuffer: 8 * 1024 * 1024,
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
      },
      (error, stdout, stderr) => {
        if (!error) {
          resolve({ ok: true, stdout: stdout.trim() });
          return;
        }
        const detail = [stderr, stdout]
          .map((stream) => (typeof stream === "string" ? stream.trim() : ""))
          .filter(Boolean)
          .join("\n");
        resolve({ ok: false, message: detail || error.message });
      },
    );
  });
}

function shortRev(rev) {
  return rev.slice(0, 7);
}

async function syncRepo(repo, options, errors) {
  const target = path.join(options.dir, repo.name);
  const record = {
    name: repo.name,
    url: repo.url,
    group: repo.group,
    status: "error",
    prevRev: null,
    rev: null,
  };

  const recordError = (message) => {
    record.status = "error";
    errors.push({ name: repo.name, message });
    return record;
  };

  const present = existsSync(target);

  if (options.dryRun) {
    if (!present) {
      record.status = "missing";
      return record;
    }
    const head = await runGit(["rev-parse", "HEAD"], target);
    if (!head.ok) {
      return recordError(head.message);
    }
    record.status = "present";
    record.rev = shortRev(head.stdout);
    return record;
  }

  if (!present) {
    const cloneArgs = ["clone", "--quiet", "--depth", "1"];
    if (repo.sparse) {
      cloneArgs.push("--filter=blob:none", "--sparse");
    }
    cloneArgs.push(repo.url, target);
    const clone = await runGit(cloneArgs, undefined);
    if (!clone.ok) {
      return recordError(`clone failed: ${clone.message}`);
    }
    if (repo.sparse) {
      const sparseSet = await runGit(["sparse-checkout", "set", ...repo.sparse], target);
      if (!sparseSet.ok) {
        return recordError(`sparse-checkout set failed: ${sparseSet.message}`);
      }
    }
    const head = await runGit(["rev-parse", "HEAD"], target);
    if (!head.ok) {
      return recordError(`rev-parse HEAD after clone failed: ${head.message}`);
    }
    record.status = "cloned";
    record.rev = shortRev(head.stdout);
    return record;
  }

  const before = await runGit(["rev-parse", "HEAD"], target);
  if (!before.ok) {
    return recordError(`rev-parse HEAD before fetch failed: ${before.message}`);
  }
  record.prevRev = shortRev(before.stdout);

  const fetch = await runGit(["fetch", "--quiet", "--depth", "1", "origin"], target);
  if (!fetch.ok) {
    return recordError(`fetch failed: ${fetch.message}`);
  }

  const reset = await runGit(["reset", "--hard", "--quiet", "FETCH_HEAD"], target);
  if (!reset.ok) {
    return recordError(`reset --hard FETCH_HEAD failed: ${reset.message}`);
  }

  const after = await runGit(["rev-parse", "HEAD"], target);
  if (!after.ok) {
    return recordError(`rev-parse HEAD after reset failed: ${after.message}`);
  }

  record.rev = shortRev(after.stdout);
  record.status = record.rev === record.prevRev ? "unchanged" : "updated";
  return record;
}

async function mapPool(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const size = Math.max(1, Math.min(limit, items.length));

  await Promise.all(
    Array.from({ length: size }, async () => {
      for (;;) {
        const index = cursor;
        cursor += 1;
        if (index >= items.length) {
          return;
        }
        results[index] = await worker(items[index], index);
      }
    }),
  );

  return results;
}

function renderTable(repos, dryRun) {
  const headers = ["NAME", "STATUS", dryRun ? "REV" : "PREV → NEW"];
  const cells = repos.map((repo) => {
    let rev;
    if (dryRun) {
      rev = repo.rev ?? "-";
    } else if (repo.prevRev && repo.rev) {
      rev = `${repo.prevRev} → ${repo.rev}`;
    } else {
      rev = repo.rev ?? "-";
    }
    return [repo.name, repo.status, rev];
  });

  const widths = headers.map((header, column) =>
    Math.max(header.length, ...cells.map((row) => row[column].length)),
  );

  const line = (row) =>
    row
      .map((value, column) => (column === row.length - 1 ? value : value.padEnd(widths[column])))
      .join("  ")
      .trimEnd();

  return [line(headers), widths.map((width) => "-".repeat(width)).join("  "), ...cells.map(line)].join("\n");
}

function summarize(repos) {
  const counts = new Map();
  for (const repo of repos) {
    counts.set(repo.status, (counts.get(repo.status) ?? 0) + 1);
  }
  const order = ["updated", "unchanged", "cloned", "present", "missing", "error"];
  const parts = order
    .filter((status) => counts.has(status))
    .map((status) => `${counts.get(status)} ${status}`);
  return `${repos.length} repos: ${parts.join(", ")}`;
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    fail(error.message);
    return;
  }

  if (options.help) {
    process.stdout.write(`${USAGE}\n`);
    return;
  }

  let repos;
  try {
    repos = await loadManifest(options.manifest);
  } catch (error) {
    fail(error.message);
    return;
  }

  if (!options.dryRun) {
    try {
      await mkdir(options.dir, { recursive: true });
    } catch (error) {
      fail(`cannot create corpus directory ${options.dir}: ${error.message}`);
      return;
    }
  }

  const errors = [];
  const results = await mapPool(repos, options.concurrency, (repo) => syncRepo(repo, options, errors));

  const report = {
    dir: options.dir,
    syncedAt: new Date().toISOString(),
    repos: results,
    errors,
  };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(
      `${options.dryRun ? "dry run — no fetch, clone, reset or writes" : "syncing"} ${report.dir}\n\n`,
    );
    process.stdout.write(`${renderTable(results, options.dryRun)}\n`);
    if (errors.length > 0) {
      process.stdout.write(`\n${errors.length} error(s):\n`);
      for (const error of errors) {
        process.stdout.write(`  ${error.name}: ${error.message}\n`);
      }
    }
    process.stdout.write(`\n${summarize(results)}\n`);
  }

  if (!options.dryRun) {
    const statePath = path.join(options.dir, STATE_FILENAME);
    try {
      await writeFile(statePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    } catch (error) {
      fail(`cannot write ${statePath}: ${error.message}`);
      return;
    }
    if (!options.json) {
      process.stdout.write(`wrote ${statePath}\n`);
    }
  }

  if (errors.length > 0) {
    process.exitCode = 1;
  }
}

await main();
