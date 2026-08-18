import { buildContext } from "./tokenize.js";
import { scanProse } from "./prose.js";
import { scanUi } from "./ui.js";
import { scanCode } from "./code.js";
import { scanCommit } from "./commit.js";
import type { Finding, ScanOptions } from "./types.js";
import type { Rule, Tier } from "../rules.js";

const TEXT_DOMAINS = new Set<string>(["prose", "chat", "integrity"]);

function atOrAbove(f: Finding, minTier?: Tier): boolean {
  if (!minTier) return true;
  const order: Record<Tier, number> = { error: 0, warning: 1, info: 2 };
  return order[f.tier] <= order[minTier];
}

function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const file = (a.file ?? "").localeCompare(b.file ?? "");
    if (file !== 0) return file;
    const line = (a.line ?? 0) - (b.line ?? 0);
    if (line !== 0) return line;
    const col = (a.column ?? 0) - (b.column ?? 0);
    if (col !== 0) return col;
    return a.ruleId.localeCompare(b.ruleId);
  });
}

/** Scan free text (copy, docs, chat output) with prose/chat/integrity rules. */
export function scanText(rules: Rule[], content: string, opts: ScanOptions = {}): Finding[] {
  const ctx = buildContext(content, { isMarkdown: opts.isMarkdown });
  const textRules = rules.filter((r) => TEXT_DOMAINS.has(r.domain));
  return scanProse(textRules, ctx, opts);
}

/**
 * Scan a file's content with the engines matching its surface:
 * - markdown/plain text: prose + chat + integrity (+ ui tells)
 * - code/markup: ui + a11y + code (+ prose ONLY when markdown)
 */
export function scanFile(
  rules: Rule[],
  content: string,
  opts: ScanOptions & { file?: string } = {},
): Finding[] {
  const ctx = buildContext(content, { file: opts.file, isMarkdown: opts.isMarkdown });
  const isMarkdown = ctx.isMarkdown;
  const textRules = isMarkdown ? rules.filter((r) => TEXT_DOMAINS.has(r.domain)) : [];
  const uiRules = rules.filter((r) => r.domain === "ui" || r.domain === "a11y");
  const codeRules = rules.filter((r) => r.domain === "code");
  const findings = [
    ...scanProse(textRules, ctx, opts),
    ...scanUi(uiRules, content, opts),
    ...scanCode(codeRules, content, opts),
  ];
  return sortFindings(findings.filter((f) => atOrAbove(f, opts.minTier)));
}

/** Scan a commit message (header + body) with commit rules. */
export function scanCommitMessage(
  rules: Rule[],
  message: string,
  opts: ScanOptions = {},
): Finding[] {
  return scanCommit(rules.filter((r) => r.domain === "commit"), message, opts);
}

export { buildContext, scanProse, scanUi, scanCode, scanCommit };
export type { Finding, ScanOptions } from "./types.js";
