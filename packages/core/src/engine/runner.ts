import { buildContext } from "./tokenize.js";
import { scanProse } from "./prose.js";
import { scanUi } from "./ui.js";
import { scanCode } from "./code.js";
import { scanCommit } from "./commit.js";
import { DOMAIN_ROUTE, type DomainRoute } from "./routes.js";
import type { Finding, ScanOptions } from "./types.js";
import type { Domain, Rule, Tier } from "../rules.js";

export { DOMAIN_ROUTE } from "./routes.js";
export type { DomainRoute } from "./routes.js";

/** Rules handled by one engine bucket, per the single route table (routes.ts). */
function rulesFor(rules: Rule[], route: DomainRoute): Rule[] {
  return rules.filter((r) => DOMAIN_ROUTE[r.domain] === route);
}

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

/** Scan free text (copy, docs, chat output) with every text-route rule. */
export function scanText(rules: Rule[], content: string, opts: ScanOptions = {}): Finding[] {
  const ctx = buildContext(content, { isMarkdown: opts.isMarkdown });
  return scanProse(rulesFor(rules, "text"), ctx, opts);
}

/** Options for scanFile: engine options plus per-file domain routing. */
export interface ScanFileOptions extends ScanOptions {
  /** Source file path attached to findings. */
  file?: string;
  /**
   * When provided, exactly these domains run (routes resolved via DOMAIN_ROUTE).
   * The CLI passes a file's dispatched domains so text-shaped domains such as
   * `config` also run for non-markdown files.
   */
  domains?: Domain[];
}

/**
 * Scan a file's content with the engines matching its surface:
 * - markdown/plain text: text route (prose + chat + integrity + skill + config)
 * - code/markup: ui route (ui + a11y) + code route
 *
 * With `opts.domains`, only rules of those domains run (routes resolved via
 * DOMAIN_ROUTE); without it the default buckets above apply (text only for
 * markdown).
 */
export function scanFile(rules: Rule[], content: string, opts: ScanFileOptions = {}): Finding[] {
  const ctx = buildContext(content, { file: opts.file, isMarkdown: opts.isMarkdown });
  const domains = opts.domains;
  const allowed = domains ? new Set(domains) : null;
  const scoped = allowed ? rules.filter((r) => allowed.has(r.domain)) : rules;
  const routes: ReadonlySet<DomainRoute> = domains
    ? new Set(domains.map((d) => DOMAIN_ROUTE[d]))
    : new Set<DomainRoute>(ctx.isMarkdown ? ["text", "ui", "code"] : ["ui", "code"]);

  const findings: Finding[] = [];
  if (routes.has("text")) findings.push(...scanProse(rulesFor(scoped, "text"), ctx, opts));
  if (routes.has("ui")) findings.push(...scanUi(rulesFor(scoped, "ui"), content, opts));
  if (routes.has("code")) findings.push(...scanCode(rulesFor(scoped, "code"), content, opts));
  if (routes.has("commit"))
    findings.push(...scanCommit(rulesFor(scoped, "commit"), content, opts));
  return sortFindings(findings.filter((f) => atOrAbove(f, opts.minTier)));
}

/** Scan a commit message (header + body) with commit rules. */
export function scanCommitMessage(
  rules: Rule[],
  message: string,
  opts: ScanOptions = {},
): Finding[] {
  return scanCommit(rulesFor(rules, "commit"), message, opts);
}

export { buildContext, scanProse, scanUi, scanCode, scanCommit };
export type { Finding, ScanOptions } from "./types.js";
