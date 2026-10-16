import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import type { Domain } from "./types.js";

const TEXT_EXTS = new Set([".md", ".mdx", ".txt"]);
const MARKUP_EXTS = new Set([".html", ".jsx", ".tsx", ".vue", ".svelte", ".astro"]);
const STYLE_EXTS = new Set([".css", ".scss"]);
const CODE_EXTS = new Set([".ts", ".js", ".py"]);

/** Basenames (lowercased) of agent instruction artifacts → skill domain. */
const SKILL_BASENAMES: Record<string, true> = {
  "skill.md": true,
  "agents.md": true,
  "claude.md": true,
  "gemini.md": true,
  ".cursorrules": true,
};

/** Directory segments holding agent commands / subagent definitions → skill domain. */
const SKILL_DIR_SEGMENTS: Record<string, true> = { commands: true, agents: true };

/** Path patterns (lowercased, slash-normalized) of CI/CD manifests → config domain. */
const SKILL_PATH_PATTERNS: RegExp[] = [/(?:^|\/)\.github\/copilot-instructions\.md$/];
const CONFIG_PATH_PATTERNS: RegExp[] = [
  /(?:^|\/)\.github\/workflows\/[^/]+\.ya?ml$/,
  /(?:^|\/)action\.ya?ml$/,
  /(?:^|\/)\.gitlab-ci\.yml$/,
  /(?:^|\/)\.circleci\/config\.yml$/,
  /(?:^|\/)\.pre-commit-config\.yaml$/,
];

export interface FileDispatch {
  domains: Domain[];
  isMarkdown: boolean;
}

export function getFileDispatch(filePath: string): FileDispatch | null {
  const norm = filePath.replace(/\\/g, "/").toLowerCase();
  const base = path.basename(norm);

  // Agent instruction artifacts (skill domain) — checked before the markdown
  // extension map so a SKILL.md is judged by skill rules, not prose.
  if (SKILL_BASENAMES[base] === true || SKILL_PATH_PATTERNS.some((re) => re.test(norm))) {
    return { domains: ["skill"], isMarkdown: true };
  }
  if (base.endsWith(".md") && norm.split("/").some((s) => SKILL_DIR_SEGMENTS[s] === true)) {
    return { domains: ["skill"], isMarkdown: true };
  }

  // CI/CD manifests (config domain) — YAML paths the extension map does not cover.
  if (CONFIG_PATH_PATTERNS.some((re) => re.test(norm))) {
    return { domains: ["config"], isMarkdown: false };
  }

  const ext = path.extname(norm);
  if (TEXT_EXTS.has(ext)) {
    return { domains: ["prose", "chat", "integrity"], isMarkdown: true };
  }
  if (MARKUP_EXTS.has(ext)) {
    return { domains: ["ui", "a11y", "code"], isMarkdown: false };
  }
  if (STYLE_EXTS.has(ext)) {
    return { domains: ["ui", "a11y"], isMarkdown: false };
  }
  if (CODE_EXTS.has(ext)) {
    return { domains: ["code"], isMarkdown: false };
  }
  return null;
}

export function isExcluded(targetPath: string, relativePath: string, excludes: string[]): boolean {
  const normRel = relativePath.split(path.sep).join("/");
  const segments = normRel.split("/");
  for (const exc of excludes) {
    const normExc = exc.split(path.sep).join("/");
    if (normExc.includes("*")) {
      const re = new RegExp(
        "^" + normExc.split("*").map(escapeRegExp).join(".*") + "$",
      );
      if (re.test(normRel)) return true;
      continue;
    }
    // Segment match: a bare name excludes any path segment; a slash form
    // ("foo/bar") must match a contiguous run of segments.
    const parts = normExc.split("/");
    if (parts.length === 1) {
      if (segments.includes(normExc)) return true;
    } else {
      for (let i = 0; i <= segments.length - parts.length; i++) {
        if (parts.every((p, j) => segments[i + j] === p)) return true;
      }
    }
  }
  return false;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Dot-prefixed entries that can hold scannable artifacts. Every other dot
 * entry (VCS metadata, caches, editor state) stays pruned so a default scan
 * never walks into `.git`. `.cursorrules` is a file; the rest are directories.
 */
const DOT_ENTRY_ALLOWLIST: Record<string, true> = {
  ".github": true,
  ".cursorrules": true,
  ".claude": true,
  ".agents": true,
  ".omp": true,
  ".cursor": true,
};

export async function walkDirectory(
  dir: string,
  excludes: string[],
  baseCwd: string,
): Promise<string[]> {
  const collected: string[] = [];
  const queue = [dir];

  while (queue.length > 0) {
    const current = queue.shift()!;
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (entry.name.startsWith(".") && DOT_ENTRY_ALLOWLIST[entry.name] !== true) {
        continue;
      }

      const fullPath = path.join(current, entry.name);
      const relPath = path.relative(baseCwd, fullPath);

      if (isExcluded(fullPath, relPath, excludes)) {
        continue;
      }

      if (entry.isDirectory()) {
        queue.push(fullPath);
      } else if (entry.isFile()) {
        if (getFileDispatch(fullPath) !== null) {
          collected.push(fullPath);
        }
      }
    }
  }

  return collected;
}

export async function collectFilesToScan(
  targetPath: string,
  excludes: string[],
  cwd: string,
): Promise<string[]> {
  const resolved = path.resolve(cwd, targetPath);
  let fileStat;
  try {
    fileStat = await stat(resolved);
  } catch (err) {
    throw new Error(`Target path not found: "${targetPath}" (${(err as Error).message})`);
  }

  if (fileStat.isFile()) {
    if (getFileDispatch(resolved) !== null) {
      return [resolved];
    }
    return [];
  }

  if (fileStat.isDirectory()) {
    return walkDirectory(resolved, excludes, cwd);
  }

  return [];
}
