import type { Finding, ScanOptions } from "./types.js";
import type { Rule, Tier } from "../rules.js";

/**
 * Code-domain check engine (M1).
 *
 * Coverage by matcher kind:
 *  - regex       : DB patterns compiled per rules/code.json, honoring
 *                  `caseSensitive` / `multiLine` params. `docstringOnly` rules
 *                  (ZS-CODE-028) are scoped to `"""..."""` blocks so marketing
 *                  adjectives are not matched in identifiers or prose.
 *  - ast         : textual heuristics approximating the AST patterns — each rule
 *                  in AST_HANDLERS documents the exact heuristic regex it runs.
 *                  The approximation is line-based (no parse tree); patterns that
 *                  genuinely need a tree (semantic name/scope resolution) are
 *                  skipped and listed in the module doc. Full tree-sitter AST
 *                  checking is deferred to M1.5.
 *  - statistical : ZS-CODE-015 (pure re-export barrel) is textually decidable on
 *                  a single file and implemented; repo-level metrics (duplicate
 *                  helper/test clusters, directory ratios, PR diff comment caps)
 *                  are skipped — they need multi-file/PR context (M2 CLI).
 *  - list        : none in the code domain today; a generic boundary-term search
 *                  is provided for forward-compat.
 *  - semantic    : skipped silently (M3 triage agent).
 *
 * Deferred (not implemented, documented for M1.5/M2/M3):
 *  - ZS-CODE-012, 013, 014, 016, 032 (statistical, repo/PR-level metrics)
 *  - ZS-CODE-017, 019, 020, 021, 022, 030, 031, 033, 034, 035, 036 (semantic)
 */

const DEFAULT_MAX_FINDINGS = 50;

/** Working context: content plus precomputed line starts for O(log n) locate(). */
interface Ctx {
  content: string;
  starts: number[];
  file?: string;
}

/* ------------------------------------------------------------------ */
/* Position + finding helpers                                          */
/* ------------------------------------------------------------------ */

function lineStarts(content: string): number[] {
  const starts = [0];
  for (let i = 0; i < content.length; i++) {
    if (content[i] === "\n") starts.push(i + 1);
  }
  return starts;
}

function locate(starts: number[], index: number): { line: number; column: number } {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((starts[mid] ?? 0) <= index) lo = mid;
    else hi = mid - 1;
  }
  return { line: lo + 1, column: index - (starts[lo] ?? 0) + 1 };
}

function truncate(s: string, max = 120): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 3) + "...";
}

function firstLine(s: string): string {
  return (s.split(/\r?\n/)[0] ?? "").trim();
}

interface FindingSpec {
  evidence: string;
  count?: number;
  line?: number;
  column?: number;
  file?: string;
  message?: string;
}

function makeFinding(rule: Rule, spec: FindingSpec): Finding {
  const count = spec.count ?? 1;
  return {
    ruleId: rule.id,
    domain: rule.domain,
    tier: rule.tier,
    title: rule.title,
    message:
      spec.message ??
      (count > 1 ? `${rule.title}: ${count} occurrences` : `${rule.title} — ${truncate(spec.evidence)}`),
    evidence: truncate(spec.evidence),
    file: spec.file,
    line: spec.line,
    column: spec.column,
    count,
  };
}

const TIER_ORDER: Record<Tier, number> = { error: 0, warning: 1, info: 2 };

function atOrAbove(tier: Tier, minTier?: Tier): boolean {
  if (!minTier) return true;
  return TIER_ORDER[tier] <= TIER_ORDER[minTier];
}

function byPosition(a: Finding, b: Finding): number {
  return (
    (a.line ?? 0) - (b.line ?? 0) ||
    (a.column ?? 0) - (b.column ?? 0) ||
    a.ruleId.localeCompare(b.ruleId)
  );
}

/* ------------------------------------------------------------------ */
/* Regex helpers                                                       */
/* ------------------------------------------------------------------ */

function buildRegex(
  pattern: string,
  params: Record<string, unknown> | undefined,
  global: boolean,
): RegExp {
  let flags = global ? "g" : "";
  if (params?.caseSensitive === false) flags += "i";
  if (params?.multiLine === true) flags += "m";
  if (typeof params?.flags === "string") flags += params.flags;
  return new RegExp(pattern, flags);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Iterate a global regex and emit one finding per match. */
function collect(
  rule: Rule,
  ctx: Ctx,
  max: number,
  re: RegExp,
  pick?: (m: RegExpMatchArray) => string | null,
): Finding[] {
  const out: Finding[] = [];
  for (const m of ctx.content.matchAll(re)) {
    if (out.length >= max) break;
    const evidence = pick ? pick(m) : m[0];
    if (evidence == null) continue;
    const pos = locate(ctx.starts, m.index);
    out.push(makeFinding(rule, { evidence, line: pos.line, column: pos.column, file: ctx.file }));
  }
  return out;
}

/** ZS-CODE-028: docstringOnly rules run only inside `"""..."""` blocks. */
function scanDocstrings(rule: Rule, ctx: Ctx, max: number): Finding[] {
  if (rule.matcher.type !== "regex") return [];
  const re = buildRegex(rule.matcher.pattern, rule.matcher.params, false);
  const blockRe = /"""[\s\S]*?"""/g;
  const out: Finding[] = [];
  for (const block of ctx.content.matchAll(blockRe)) {
    if (out.length >= max) break;
    const m = block[0].match(re);
    if (!m) continue;
    const pos = locate(ctx.starts, block.index + (m.index ?? 0));
    out.push(makeFinding(rule, { evidence: m[0], line: pos.line, column: pos.column, file: ctx.file }));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* AST-pattern rules: documented textual heuristics                    */
/* ------------------------------------------------------------------ */

interface CatchBlock {
  start: number;
  end: number;
  body: string;
}

/**
 * Extract `catch ... { ... }` blocks with a brace counter, so bodies containing
 * nested braces (e.g. `return {};` or `logger.error({ error, id })`) are
 * captured whole. Approximation: braces inside string literals are not skipped.
 */
function* catchBlocks(content: string): Generator<CatchBlock> {
  const re = /catch\s*(?:\([^)]*\))?\s*\{/g;
  for (const m of content.matchAll(re)) {
    const open = m.index + m[0].length - 1; // index of the opening '{'
    let depth = 1;
    let i = open + 1;
    while (i < content.length && depth > 0) {
      const ch = content[i];
      if (ch === "{") depth += 1;
      else if (ch === "}") depth -= 1;
      i += 1;
    }
    if (depth > 0) continue; // unbalanced braces — not a real block
    yield { start: m.index, end: i - 1, body: content.slice(open + 1, i - 1) };
  }
}

type AstHandler = (rule: Rule, ctx: Ctx, max: number) => Finding[];

const AST_HANDLERS: Record<string, AstHandler> = {
  /**
   * ZS-CODE-001 log-and-continue catch.
   * Heuristic: single-level `catch (e) { ... }` whose body logs (logger./console.)
   * and neither rethrows nor returns. Regex: CATCH_BLOCK + body predicates.
   * Approximation: nested braces inside the catch body are not balanced; multi-
   * statement log-and-continue bodies still match.
   */
  "ZS-CODE-001": (rule, ctx, max) => {
    const out: Finding[] = [];
    for (const block of catchBlocks(ctx.content)) {
      if (out.length >= max) break;
      const body = block.body;
      if (!/(logger|console)\.\w+\(/.test(body)) continue;
      if (/\b(throw|return)\b/.test(body)) continue;
      const pos = locate(ctx.starts, block.start);
      out.push(
        makeFinding(rule, {
          evidence: ctx.content.slice(block.start, block.end + 1),
          line: pos.line,
          column: pos.column,
          file: ctx.file,
        }),
      );
    }
    return out;
  },

  /**
   * ZS-CODE-002 catch replaces failure with a default or a generic error.
   * Heuristic on the catch body: ends with a default-literal return
   * (/\{\}|\[\]|null|undefined|0|""|''|false|true/) or `throw new Error("...")`
   * with no `cause` option (a generic rethrow still flattens the failure).
   */
  "ZS-CODE-002": (rule, ctx, max) => {
    const DEFAULT_RETURN = /return\s*(?:\{\}|\[\]|null|undefined|0|""|''|false|true)\s*;?\s*$/;
    const GENERIC_RETHROW = /throw\s+new\s+Error\(\s*["'][^"']*["']\s*\)\s*;?\s*$/;
    const out: Finding[] = [];
    for (const block of catchBlocks(ctx.content)) {
      if (out.length >= max) break;
      const body = block.body.trim();
      if (!DEFAULT_RETURN.test(body) && !GENERIC_RETHROW.test(body)) continue;
      const pos = locate(ctx.starts, block.start);
      out.push(
        makeFinding(rule, {
          evidence: ctx.content.slice(block.start, block.end + 1),
          line: pos.line,
          column: pos.column,
          file: ctx.file,
        }),
      );
    }
    return out;
  },

  /**
   * ZS-CODE-003 empty catch. Heuristic: a CATCH_BLOCK whose body is blank
   * (whitespace only). A comment inside the braces (documented fallback) is not
   * empty and therefore passes, matching the DB fixture.
   */
  "ZS-CODE-003": (rule, ctx, max) => {
    const out: Finding[] = [];
    for (const block of catchBlocks(ctx.content)) {
      if (out.length >= max) break;
      if (block.body.trim() !== "") continue;
      const pos = locate(ctx.starts, block.start);
      out.push(
        makeFinding(rule, {
          evidence: ctx.content.slice(block.start, block.end + 1),
          line: pos.line,
          column: pos.column,
          file: ctx.file,
        }),
      );
    }
    return out;
  },

  /**
   * ZS-CODE-004 promise .catch() sentinel fallbacks.
   * Heuristic: /\.catch\(\s*(?:\([^)]*\))?\s*=>\s*(?:null|false|0|""|''|\[\]|\{\})\s*\)/
   * — arrow bodies that resolve to a cheap sentinel. Bodies that throw or return
   * a domain-shaped object do not match.
   */
  "ZS-CODE-004": (rule, ctx, max) =>
    collect(
      rule,
      ctx,
      max,
      /\.catch\(\s*(?:\([^)]*\))?\s*=>\s*(?:null|false|0|""|''|\[\]|\{\})\s*\)/g,
    ),

  /**
   * ZS-CODE-005 stringified unknown errors.
   * Heuristic: /([\w.]+)\s+instanceof\s+Error\s*\?\s*\1\.message\s*:\s*String\(\s*\1\s*\)/
   * — the canonical `err instanceof Error ? err.message : String(err)` collapse.
   */
  "ZS-CODE-005": (rule, ctx, max) =>
    collect(
      rule,
      ctx,
      max,
      /([\w.]+)\s+instanceof\s+Error\s*\?\s*\1\.message\s*:\s*String\(\s*\1\s*\)/g,
    ),

  /**
   * ZS-CODE-006 generic status envelopes.
   * Heuristic: `{ success: bool, error|message: ... }` and `{ ok: bool, data|rows: ... }`
   * object shapes (whitespace-flexible, single line).
   */
  "ZS-CODE-006": (rule, ctx, max) => {
    const first = collect(rule, ctx, max, /\{\s*success\s*:\s*(?:true|false)\s*,\s*(?:error|message)\s*:/g);
    if (first.length >= max) return first;
    return first.concat(
      collect(rule, ctx, max - first.length, /\{\s*ok\s*:\s*(?:true|false)\s*,\s*(?:data|rows)\s*:/g),
    );
  },

  /**
   * ZS-CODE-007 generic record casts on parsed payloads.
   * Heuristic: /const\s+(parsed|payload|body|data|result|config)\s*=\s*[^;\n]*\s+as\s+Record\s*<\s*string\s*,\s*unknown\s*>/
   * — bag-shaped variable names cast straight to `Record<string, unknown>`.
   */
  "ZS-CODE-007": (rule, ctx, max) =>
    collect(
      rule,
      ctx,
      max,
      /const\s+(parsed|payload|body|data|result|config)\s*=\s*[^;\n]*\s+as\s+Record\s*<\s*string\s*,\s*unknown\s*>/g,
    ),

  /**
   * ZS-CODE-010 pass-through wrappers.
   * Heuristic: /export\s+(?:async\s+)?function\s+\w+\s*\([^)]*\)\s*\{\s*return\s+\w+\s*\([^)]*\)\s*;?\s*\}/
   * — an exported function whose body is a single direct forward call. Exempted
   * when the last non-blank line above the function is a comment mentioning
   * alias/backward-compat/deprecation (the DB's "compat alias" pass case).
   */
  "ZS-CODE-010": (rule, ctx, max) => {
    const re = /export\s+(?:async\s+)?function\s+\w+\s*\([^)]*\)\s*\{\s*return\s+\w+\s*\([^)]*\)\s*;?\s*\}/g;
    const out: Finding[] = [];
    for (const m of ctx.content.matchAll(re)) {
      if (out.length >= max) break;
      if (hasExemptComment(ctx.content, m.index)) continue;
      const pos = locate(ctx.starts, m.index);
      out.push(makeFinding(rule, { evidence: m[0], line: pos.line, column: pos.column, file: ctx.file }));
    }
    return out;
  },

  /**
   * ZS-CODE-011 async ceremony (redundant `return await` / async pass-through).
   * Heuristic: /async\s+function\s+\w+\s*\([^)]*\)\s*\{\s*return\s+await\s+\w+\s*\([^)]*\)\s*;?\s*\}/
   * — async function whose whole body is `return await other(...)`.
   */
  "ZS-CODE-011": (rule, ctx, max) =>
    collect(
      rule,
      ctx,
      max,
      /async\s+function\s+\w+\s*\([^)]*\)\s*\{\s*return\s+await\s+\w+\s*\([^)]*\)\s*;?\s*\}/g,
    ),

  /**
   * ZS-CODE-024 unjustified try-import fallbacks (Python).
   * Heuristic: /try\s*:\s*import\s+\w+[\s\S]*?except\s+ImportError\s*:\s*import\s+\w+([^\n]*)/
   * Skipped when the import line carries a justification comment naming extras,
   * optional dependencies, benchmarks, fallback tests, platform gates or
   * migrations (the DB's "packaged extras" pass case).
   */
  "ZS-CODE-024": (rule, ctx, max) => {
    const re = /try\s*:\s*import\s+\w+[\s\S]*?except\s+ImportError\s*:\s*import\s+\w+([^\n]*)/g;
    const out: Finding[] = [];
    for (const m of ctx.content.matchAll(re)) {
      if (out.length >= max) break;
      const justification = m[1] ?? "";
      if (/(extras|optional|benchmark|fallback|platform|migration|version|pyproject|package\.json|tested)/i.test(justification)) {
        continue;
      }
      const pos = locate(ctx.starts, m.index);
      out.push(makeFinding(rule, { evidence: m[0], line: pos.line, column: pos.column, file: ctx.file }));
    }
    return out;
  },

  /**
   * ZS-CODE-025 attribute-probing chains (Python).
   * Heuristic: /hasattr\(\s*([\w.]+)\s*,/ followed within a 400-char window by
   * /getattr\(\s*<same object>\s*,/ — a probe ladder on the same receiver.
   */
  "ZS-CODE-025": (rule, ctx, max) => {
    const re = /hasattr\(\s*([\w.]+)\s*,/g;
    const out: Finding[] = [];
    for (const m of ctx.content.matchAll(re)) {
      if (out.length >= max) break;
      const obj = m[1] ?? "";
      const window_ = ctx.content.slice(m.index, m.index + 400);
      if (!new RegExp(`getattr\\(\\s*${obj}\\s*,`).test(window_)) continue;
      const pos = locate(ctx.starts, m.index);
      out.push(makeFinding(rule, { evidence: m[0], line: pos.line, column: pos.column, file: ctx.file }));
    }
    return out;
  },

  /**
   * ZS-CODE-026 paranoid re-validation (Python).
   * Heuristic: /^\s*(\w+)\s*=\s*[^=\n][^\n]*\n\s*if\s+\1\s+is\s+not\s+None\s*:/m
   * — a value assigned on one line is re-checked for `is not None` on the next.
   */
  "ZS-CODE-026": (rule, ctx, max) =>
    collect(
      rule,
      ctx,
      max,
      /^\s*(\w+)\s*=\s*[^=\n][^\n]*\n\s*if\s+\1\s+is\s+not\s+None\s*:/gm,
    ),
};

/** True when the last non-blank line before `index` is a comment naming an
 * alias/backward-compat/deprecation reason (pass-through exemption). */
function hasExemptComment(content: string, index: number): boolean {
  const before = content.slice(0, index);
  const lines = before.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = (lines[i] ?? "").trim();
    if (line === "") continue;
    return /^(\/\/|#|\/\*|\*)/.test(line) && /(alias|backward|compat|deprecat)/i.test(line);
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* Statistical rule: ZS-CODE-015 (pure re-export barrel, textually)    */
/* ------------------------------------------------------------------ */

/**
 * ZS-CODE-045/048: file/class length gates.
 * Counts actual content lines (non-blank, non-comment) and fails when the count
 * exceeds the rule's `maxPerFile` / `maxPerClass` threshold.
 */
function scanLineCount(rule: Rule, ctx: Ctx, _metric: string, capParam: string): Finding[] {
  const params = rule.matcher.type === "statistical" ? rule.matcher.params : undefined;
  const cap = typeof params?.[capParam] === "number" ? (params[capParam] as number) : 1000;
  let lines = 0;
  for (const raw of ctx.content.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "" || line.startsWith("//") || line.startsWith("#") || line.startsWith("/*") || line.startsWith("*")) {
      continue;
    }
    lines++;
  }
  if (lines <= cap) return [];
  return [makeFinding(rule, { evidence: `${lines} content lines`, line: 1, column: 1, file: ctx.file })];
}

/**
 * ZS-CODE-015 pure re-export barrel files.
 * Heuristic: count top-level re-export lines (`export * from`, `export {..} from`,
 * `export name from`). A file is a barrel when it has >= minReExports re-exports
 * and every other top-level statement is an import (no functions/classes/consts).
 */
function scanBarrel(rule: Rule, ctx: Ctx, max: number): Finding[] {
  const params = rule.matcher.type === "statistical" ? rule.matcher.params : undefined;
  const minReExports = typeof params?.minReExports === "number" ? params.minReExports : 2;
  const reExport =
    /^export\s+(?:\*|(?:type\s+)?\{[^}]*\}|[A-Za-z_$][\w$]*)\s+from\s+["']/;
  const importLine = /^import\s+/;
  let reExports = 0;
  let hasOther = false;
  for (const raw of ctx.content.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "" || line.startsWith("//") || line.startsWith("#") || line.startsWith("/*") || line.startsWith("*")) {
      continue;
    }
    if (reExport.test(line)) {
      reExports++;
      continue;
    }
    if (importLine.test(line)) continue;
    hasOther = true;
  }
  if (reExports >= minReExports && !hasOther) {
    return [makeFinding(rule, { evidence: firstLine(ctx.content), line: 1, column: 1, file: ctx.file })];
  }
  return [];
}

/* ------------------------------------------------------------------ */
/* Dispatch + public API                                               */
/* ------------------------------------------------------------------ */

function runCodeRule(rule: Rule, ctx: Ctx, max: number): Finding[] {
  switch (rule.matcher.type) {
    case "regex": {
      if (rule.matcher.params?.docstringOnly === true) return scanDocstrings(rule, ctx, max);
      const re = buildRegex(rule.matcher.pattern, rule.matcher.params, true);
      if (rule.matcher.params?.negate === true) {
        return re.test(ctx.content)
          ? []
          : [makeFinding(rule, { evidence: firstLine(ctx.content), line: 1, column: 1, file: ctx.file })];
      }
      return collect(rule, ctx, max, re);
    }
    case "list": {
      const out: Finding[] = [];
      for (const term of rule.matcher.terms) {
        if (out.length >= max) break;
        const re = new RegExp(
          `\\b${escapeRegExp(term)}\\b`,
          rule.matcher.params?.caseSensitive === false ? "gi" : "g",
        );
        for (const m of ctx.content.matchAll(re)) {
          if (out.length >= max) break;
          const pos = locate(ctx.starts, m.index);
          out.push(makeFinding(rule, { evidence: m[0], line: pos.line, column: pos.column, file: ctx.file }));
        }
      }
      return out;
    }
    case "statistical":
      if (rule.id === "ZS-CODE-015") return scanBarrel(rule, ctx, max);
      if (rule.id === "ZS-CODE-045") return scanLineCount(rule, ctx, "fileLineCount", "maxPerFile");
      if (rule.id === "ZS-CODE-048") return scanLineCount(rule, ctx, "classLineCount", "maxPerClass");
      return [];
    case "ast": {
      const handler = AST_HANDLERS[rule.id];
      return handler ? handler(rule, ctx, max) : [];
    }
    case "semantic":
      return [];
  }
}

/**
 * Scan code-domain rules over a file's content.
 *
 * `opts.file` is attached to every finding; `opts.minTier` drops lower tiers and
 * `opts.maxFindingsPerRule` (default 50) caps occurrences per rule.
 */
export function scanCode(
  rules: Rule[],
  content: string,
  opts: ScanOptions & { file?: string } = {},
): Finding[] {
  const maxPerRule = opts.maxFindingsPerRule ?? DEFAULT_MAX_FINDINGS;
  const ctx: Ctx = { content, starts: lineStarts(content), file: opts.file };
  const out: Finding[] = [];
  for (const rule of rules) {
    if (rule.domain !== "code") continue;
    out.push(...runCodeRule(rule, ctx, maxPerRule));
  }
  return out.filter((f) => atOrAbove(f.tier, opts.minTier)).sort(byPosition);
}
