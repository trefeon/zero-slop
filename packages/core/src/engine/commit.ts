import type { Finding, ScanOptions } from "./types.js";
import type { Rule, Tier } from "../rules.js";

/**
 * Commit-domain check engine (M1) over a commit message (header + body).
 *
 * Implemented (message-level, deterministic):
 *  - ZS-COMMIT-001..005  header regex rules (type enum / lower-case / subject
 *                        required / subject case / header max length)
 *  - ZS-COMMIT-006       blank line before body/footer
 *  - ZS-COMMIT-007       body/footer line max length (URL lines exempt)
 *  - ZS-COMMIT-008       conventional-commit format (applied to the header)
 *  - ZS-COMMIT-009       commit message max length
 *  - ZS-COMMIT-012       description required (heuristic, see below)
 *  - ZS-COMMIT-014       emoji cap (counts /[\p{Extended_Pictographic}\u200d]/gu)
 *
 * Skipped / deferred:
 *  - ZS-COMMIT-013, 015  target the PR-description field (PR metadata; M2 CLI)
 *  - ZS-COMMIT-017, 018  target changed-files metadata (PR-level; M2 CLI)
 *  - ZS-COMMIT-019       statistical changed-file count (PR-level)
 *  - ZS-COMMIT-010, 011, 016, 020  semantic (author match, blocked authors,
 *                        PR template, one-change-per-commit) — M3 triage agent.
 *
 * ZS-COMMIT-012 approximation: the DB rule targets the PR-description field. For
 * a commit message, "description" is mapped to the body. To keep the rule's own
 * pass fixture ("Adds refresh-token rotation to the auth service.", a complete
 * one-line description) unflagged, the heuristic only fires on empty messages or
 * on conventional-commit headers with no body — a plain-prose one-liner is
 * treated as self-describing and left to ZS-COMMIT-008.
 */

const DEFAULT_MAX_FINDINGS = 50;

/** Conventional Commits header shape: `type(scope)?(!)?: subject`. */
const CONVENTIONAL_HEADER = /^\w+(?:\([^)]+\))?!?:\s.+/i;

interface FindingSpec {
  evidence: string;
  count?: number;
  line?: number;
  column?: number;
  file?: string;
  message?: string;
}

function truncate(s: string, max = 120): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 3) + "...";
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

function buildRegex(pattern: string, params: Record<string, unknown> | undefined): RegExp {
  let flags = "";
  if (params?.caseSensitive === false) flags += "i";
  if (params?.multiLine === true) flags += "m";
  if (typeof params?.flags === "string") flags += params.flags;
  return new RegExp(pattern, flags);
}

function splitMessage(message: string): { header: string; hasBody: boolean } {
  const lines = message.split("\n");
  const header = lines[0] ?? "";
  const rest = lines.slice(1);
  return { header, hasBody: rest.some((l) => l.trim() !== "") };
}

type CommitHandler = (
  rule: Rule,
  message: string,
  header: string,
  hasBody: boolean,
  opts: ScanOptions,
  max: number,
) => Finding[];

const SPECIAL: Record<string, CommitHandler> = {
  /** PerCommit conventional-format check, applied to the header line. */
  "ZS-COMMIT-008": (rule, _message, header, _hasBody, _opts) => {
    if (rule.matcher.type !== "regex") return [];
    const re = buildRegex(rule.matcher.pattern, rule.matcher.params);
    return re.test(header)
      ? [makeFinding(rule, { evidence: header || "(empty)", line: 1, column: 1 })]
      : [];
  },

  /** Total message length cap (maxLength param; pattern is single-line shaped). */
  "ZS-COMMIT-009": (rule, message, _header, _hasBody, _opts) => {
    if (rule.matcher.type !== "regex") return [];
    const maxLength = typeof rule.matcher.params?.maxLength === "number" ? rule.matcher.params.maxLength : 500;
    return message.length > maxLength
      ? [makeFinding(rule, { evidence: message, line: 1, column: 1 })]
      : [];
  },

  /** Description required: empty message, or conventional header with no body. */
  "ZS-COMMIT-012": (rule, message, header, hasBody, opts) => {
    if (message.trim() === "") {
      return [
        makeFinding(rule, {
          evidence: "(empty message)",
          line: 1,
          column: 1,
          message: `${rule.title}: commit message is empty — add a description body`,
        }),
      ];
    }
    if (CONVENTIONAL_HEADER.test(header.trim()) && !hasBody) {
      return [
        makeFinding(rule, {
          evidence: header.trim(),
          line: 1,
          column: 1,
          message: `${rule.title}: commit has no description body`,
        }),
      ];
    }
    return [];
  },

  /** Emoji cap: count /[\p{Extended_Pictographic}\u200d]/gu over header + body. */
  "ZS-COMMIT-014": (rule, message, _header, _hasBody, _opts) => {
    if (rule.matcher.type !== "regex") return [];
    const params = rule.matcher.params;
    const cap = typeof params?.maxPerPR === "number" ? params.maxPerPR : 2;
    const re = new RegExp(rule.matcher.pattern, `g${typeof params?.flags === "string" ? params.flags : ""}`);
    const matches = message.match(re) ?? [];
    if (matches.length <= cap) return [];
    return [
      makeFinding(rule, {
        evidence: matches.slice(0, 5).join(""),
        count: matches.length,
        line: 1,
        column: 1,
        message: `${rule.title}: ${matches.length} emoji found, cap is ${cap}`,
      }),
    ];
  },

  /** Body/footer line length cap; messages containing a URL are fully exempt. */
  "ZS-COMMIT-007": (rule, message, _header, _hasBody, opts, max) => {
    if (rule.matcher.type !== "regex") return [];
    const maxLineLength =
      typeof rule.matcher.params?.maxLineLength === "number" ? rule.matcher.params.maxLineLength : 100;
    if (/https?:\/\//.test(message)) return [];
    const out: Finding[] = [];
    const lines = message.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (out.length >= max) break;
      const line = lines[i] ?? "";
      if (line.length <= maxLineLength) continue;
      out.push(makeFinding(rule, { evidence: line, line: i + 1, column: maxLineLength + 1 }));
    }
    return out;
  },
};

function runCommitRule(
  rule: Rule,
  message: string,
  header: string,
  hasBody: boolean,
  opts: ScanOptions,
  max: number,
): Finding[] {
  const special = SPECIAL[rule.id];
  if (special) return special(rule, message, header, hasBody, opts, max);
  if (rule.matcher.type === "semantic") return []; // M3 triage agent
  const params = rule.matcher.params ?? {};
  // Field-targeted rules need PR metadata (description/changed files), not a message.
  if (typeof params?.field === "string" && params.field !== "commitMessage") return [];
  const target = params?.headerOnly === true ? header : message;

  if (rule.matcher.type === "list") {
    const terms = rule.matcher.terms ?? [];
    const re = new RegExp(
      `(?:^|[\\s(])(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?=[\\s).:,]|$)`,
      params?.caseSensitive === false ? "i" : "",
    );
    const m = re.exec(target);
    return m
      ? [makeFinding(rule, { evidence: m[1] ?? m[0], line: 1, column: 1 })]
      : [];
  }

  if (rule.matcher.type === "statistical") {
    // ZS-COMMIT-023: PR diff size cap — not decidable from a commit message
    // alone; skipped (PR metadata, M2 CLI).
    return [];
  }

  if (rule.matcher.type !== "regex") return []; // semantic: skipped
  const re = buildRegex(rule.matcher.pattern, params);
  const m = re.exec(target);
  if (params?.negate === true) {
    return m
      ? []
      : [makeFinding(rule, { evidence: target || "(empty)", line: 1, column: 1 })];
  }
  return m
    ? [makeFinding(rule, { evidence: m[0] || target, line: 1, column: 1 })]
    : [];
}

/**
 * Scan commit-domain rules over a commit message (header + body).
 *
 * `opts.minTier` drops lower tiers and `opts.maxFindingsPerRule` (default 50)
 * caps occurrences per rule. CRLF messages are normalized to LF first.
 */
export function scanCommit(rules: Rule[], message: string, opts: ScanOptions = {}): Finding[] {
  const maxPerRule = opts.maxFindingsPerRule ?? DEFAULT_MAX_FINDINGS;
  const normalized = message.replace(/\r\n/g, "\n");
  const { header, hasBody } = splitMessage(normalized);
  const out: Finding[] = [];
  for (const rule of rules) {
    if (rule.domain !== "commit") continue;
    out.push(...runCommitRule(rule, normalized, header, hasBody, opts, maxPerRule));
  }
  return out.filter((f) => atOrAbove(f.tier, opts.minTier)).sort(byPosition);
}
