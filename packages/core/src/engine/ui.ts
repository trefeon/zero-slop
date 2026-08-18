/**
 * UI + a11y file/code-markup scan engine (M1).
 *
 * Applies matchers of type `regex` and `list` line-by-line over file and
 * code-markup content (HTML/JSX/CSS/Tailwind class strings). The caller
 * decides what content to pass in and supplies the ui-domain rules plus the
 * a11y rules; this engine does not filter by domain.
 *
 * Deferred matcher categories (skipped silently):
 * - statistical: ZS-UI-009/023/057 and ZS-A11Y-001/002/003/010 — contrast
 *   ratio checks, per-file palette/font aggregation and motion timing need
 *   CSS color parsing -> M1.5.
 * - semantic: 19 ui + 8 a11y rules (fake testimonials, dead interactive
 *   elements, stock art, fabricated metrics) -> M3 triage agent.
 * - ast: no ui/a11y rules use it today; ignored for forward compatibility.
 *
 * Param coverage:
 * - caseInsensitive / caseSensitive / unicode regex flags.
 * - maxPerPiece / maxPerWords (+ wordsWindow) caps, shared with the prose
 *   engine: word-based allowance = max(1, floor(wordCount / (wordsWindow ??
 *   maxPerWords))); maxPerPiece is a fixed per-content allowance. The
 *   maxPerNWords family (maxPer500Words, maxPer1000Words, ...) allows
 *   floor(wordCount * N / window) with no max(1), so a short piece under one
 *   full window fails on any hit. A rule fails when its hit count exceeds
 *   the allowance (one finding, count set).
 * - ZS-UI-010 `scope` (values outside the :root/[data-theme] token block)
 *   and ZS-A11Y-012 `requiresFallback` (prefers-reduced-motion fallback in
 *   the same stylesheet) are block/file-level refinements; line-level
 *   scanning flags the raw pattern. Both rules' fixtures still pass.
 * - Patterns that fail to compile are skipped without throwing; the rest of
 *   the rules are still scanned.
 *
 * Findings carry ruleId/domain/tier/title/message/evidence/count and, for
 * each match location, file/line/column. `minTier` drops findings below the
 * tier and `maxFindingsPerRule` (default 50) caps the number of finding
 * entries emitted per rule (count keeps the true total).
 */
import type { Rule, Tier } from "../rules.js";
import type { Finding, ScanOptions } from "./types.js";

const TIER_ORDER: Record<Tier, number> = { error: 0, warning: 1, info: 2 };
const MAX_EVIDENCE = 80;
const DEFAULT_MAX_FINDINGS = 50;

interface Hit {
  line: number;
  column: number;
  evidence: string;
}

function countWords(content: string): number {
  const trimmed = content.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** Cap allowance for a rule; Infinity means uncapped. */
function capAllowance(
  params: Record<string, unknown> | undefined,
  wordCount: number,
): number {
  if (!params) return Infinity;
  const maxPerPiece = params.maxPerPiece;
  if (typeof maxPerPiece === "number" && Number.isFinite(maxPerPiece)) {
    return Math.max(0, maxPerPiece);
  }
  const maxPerWords = params.maxPerWords;
  const wordsWindow = params.wordsWindow;
  if (typeof maxPerWords === "number" && Number.isFinite(maxPerWords) && maxPerWords > 0) {
    const window =
      typeof wordsWindow === "number" && Number.isFinite(wordsWindow) && wordsWindow > 0
        ? wordsWindow
        : maxPerWords;
    return Math.max(1, Math.floor(wordCount / window));
  }
  // maxPerNWords family (maxPer500Words, maxPer1000Words, ...): N hits per
  // N-word window, floored with no max(1) — under one full window the
  // allowance is 0, so any hit fails (matches the prose engine).
  for (const [key, value] of Object.entries(params)) {
    const match = /^maxPer(\d+)Words$/.exec(key);
    if (match && typeof value === "number" && Number.isFinite(value) && value > 0) {
      const window = Number(match[1]);
      return Math.floor((wordCount * value) / window);
    }
  }
  return Infinity;
}

function regexFlags(params: Record<string, unknown> | undefined): string {
  let flags = "g";
  // Case-insensitive unless the rule explicitly opts into case sensitivity.
  if (!(params?.caseSensitive === true)) flags += "i";
  if (params?.unicode === true) flags += "u";
  return flags;
}

/** Sentinel for a matcher that cannot compile (rule is skipped, see header). */
const INVALID_MATCHER = "invalid" as const;
type CompiledMatcher = RegExp | typeof INVALID_MATCHER;

/**
 * Compile a matcher into a global regex, or INVALID_MATCHER when it cannot
 * compile. A failed compile is a documented rule-config skip, not a swallowed
 * failure — callers check the sentinel explicitly.
 */
function compileMatcher(rule: Rule): CompiledMatcher {
  const matcher = rule.matcher;
  if (matcher.type === "regex") {
    try {
      return new RegExp(matcher.pattern, regexFlags(matcher.params));
    } catch {
      return INVALID_MATCHER;
    }
  }
  if (matcher.type === "list") {
    const body = matcher.terms
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");
    // Word-boundary lookarounds: term must be a standalone word.
    const flags = matcher.params?.caseSensitive === true ? "g" : "gi";
    try {
      return new RegExp(`(?<![A-Za-z0-9_])(${body})(?![A-Za-z0-9_])`, flags);
    } catch {
      return INVALID_MATCHER;
    }
  }
  return INVALID_MATCHER;
}

function makeFinding(
  rule: Rule,
  hit: Hit,
  count: number,
  opts: ScanOptions & { file?: string },
  allowance?: number,
): Finding {
  const message =
    allowance !== undefined
      ? `${rule.title}: ${count} occurrences (allowed ${allowance}) — ${hit.evidence}`
      : `${rule.title}: ${hit.evidence}`;
  return {
    ruleId: rule.id,
    domain: rule.domain,
    tier: rule.tier,
    title: rule.title,
    message,
    evidence: hit.evidence,
    count,
    file: opts.file,
    line: hit.line,
    column: hit.column,
  };
}

/** Scan file/code-markup content with ui + a11y regex/list rules. */
export function scanUi(
  rules: Rule[],
  content: string,
  opts: ScanOptions & { file?: string } = {},
): Finding[] {
  const findings: Finding[] = [];
  const wordCount = countWords(content);
  const lines = content.split("\n");
  const maxFindings = opts.maxFindingsPerRule ?? DEFAULT_MAX_FINDINGS;

  for (const rule of rules) {
    if (opts.minTier && TIER_ORDER[rule.tier] > TIER_ORDER[opts.minTier]) continue;
    const matcher = rule.matcher;
    if (
      matcher.type === "statistical" ||
      matcher.type === "semantic" ||
      matcher.type === "ast"
    ) {
      continue; // Deferred — see header comment.
    }
    const re = compileMatcher(rule);
    if (re === INVALID_MATCHER) continue; // Un-compilable rule config — skip.

    const hits: Hit[] = [];
    for (const [i, line] of lines.entries()) {
      for (const m of line.matchAll(re)) {
        const evidence = m[0].trim();
        hits.push({
          line: i + 1,
          column: m.index + 1,
          evidence:
            evidence.length > MAX_EVIDENCE ? evidence.slice(0, MAX_EVIDENCE) : evidence,
        });
      }
    }
    if (hits.length === 0) continue;

    const count = hits.length;
    const allowance = capAllowance(matcher.params, wordCount);

    if (Number.isFinite(allowance)) {
      // Cap rule: one finding at the first occurrence when the cap is hit.
      // count > allowance implies at least one hit, so hits[0] is defined.
      const first = hits[0];
      if (count > allowance && first) {
        findings.push(makeFinding(rule, first, count, opts, allowance));
      }
      continue;
    }

    for (const hit of hits.slice(0, maxFindings)) {
      findings.push(makeFinding(rule, hit, count, opts));
    }
  }
  return findings;
}
