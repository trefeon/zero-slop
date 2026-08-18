import type { Domain, Finding, JsonOutput, JsonSummary, Tier } from "./types.js";
import { VALID_DOMAINS, VALID_TIERS } from "./types.js";

export const CLI_VERSION = "0.1.0";

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

export function computeSummary(findings: Finding[]): JsonSummary {
  const byTier: Record<Tier, number> = {
    error: 0,
    warning: 0,
    info: 0,
  };
  const byDomain: Record<Domain, number> = {
    prose: 0,
    ui: 0,
    code: 0,
    commit: 0,
    integrity: 0,
    a11y: 0,
    chat: 0,
  };

  for (const f of findings) {
    const currentTierCount = byTier[f.tier];
    if (typeof currentTierCount === "number") {
      byTier[f.tier] = currentTierCount + 1;
    }
    const currentDomainCount = byDomain[f.domain];
    if (typeof currentDomainCount === "number") {
      byDomain[f.domain] = currentDomainCount + 1;
    }
  }

  return { byTier, byDomain };
}

export function formatJsonOutput(
  findings: Finding[],
  scannedCount: number,
  version: string = CLI_VERSION,
): string {
  const output: JsonOutput = {
    tool: "zero-slop",
    version,
    scanned: scannedCount,
    findings,
    summary: computeSummary(findings),
  };
  return JSON.stringify(output, null, 2);
}

function colorizeTier(tier: Tier, useColor: boolean): string {
  if (!useColor) return tier;
  switch (tier) {
    case "error":
      return `${ANSI.red}${tier}${ANSI.reset}`;
    case "warning":
      return `${ANSI.yellow}${tier}${ANSI.reset}`;
    case "info":
      return `${ANSI.cyan}${tier}${ANSI.reset}`;
    default:
      return tier;
  }
}

export function formatFindingsTable(findings: Finding[], useColor: boolean): string {
  if (findings.length === 0) {
    return "No findings.\n";
  }

  const rows = findings.map((f) => {
    const loc = `${f.file ?? "<unknown>"}:${f.line ?? 0}:${f.column ?? 0}`;
    return {
      ruleId: f.ruleId,
      tier: f.tier,
      loc,
      message: f.message,
    };
  });

  const colRuleId = Math.max(7, ...rows.map((r) => r.ruleId.length));
  const colTier = Math.max(4, ...rows.map((r) => r.tier.length));
  const colLoc = Math.max(13, ...rows.map((r) => r.loc.length));

  const header = `${"ruleId".padEnd(colRuleId)}  ${"tier".padEnd(colTier)}  ${"file:line:col".padEnd(colLoc)}  message`;
  const separator = "-".repeat(Math.max(header.length, 60));

  const lines: string[] = [header, separator];

  for (const row of rows) {
    const coloredTier = colorizeTier(row.tier, useColor);
    const paddingAfterTier = " ".repeat(Math.max(0, colTier - row.tier.length));
    const line = `${row.ruleId.padEnd(colRuleId)}  ${coloredTier}${paddingAfterTier}  ${row.loc.padEnd(colLoc)}  ${row.message}`;
    lines.push(line);
  }

  return `${lines.join("\n")}\n`;
}

export function formatGateSummary(findings: Finding[]): string {
  const { byTier } = computeSummary(findings);
  const total = findings.length;
  return `${total} findings: ${byTier.error} errors, ${byTier.warning} warnings, ${byTier.info} info\n`;
}

export function formatReportSummary(findings: Finding[], useColor: boolean): string {
  const { byDomain, byTier } = computeSummary(findings);
  const total = findings.length;

  const lines: string[] = [];

  lines.push("Summary by Domain:");
  lines.push("------------------");
  const maxDomainLen = Math.max(...VALID_DOMAINS.map((d) => d.length));
  for (const domain of VALID_DOMAINS) {
    const count = byDomain[domain] ?? 0;
    lines.push(`  ${domain.padEnd(maxDomainLen)} : ${count}`);
  }

  lines.push("");
  lines.push("Summary by Tier:");
  lines.push("----------------");
  const maxTierLen = Math.max(...VALID_TIERS.map((t) => t.length));
  for (const tier of VALID_TIERS) {
    const colored = colorizeTier(tier, useColor);
    const pad = " ".repeat(Math.max(0, maxTierLen - tier.length));
    const count = byTier[tier] ?? 0;
    lines.push(`  ${colored}${pad} : ${count}`);
  }

  lines.push("");
  lines.push(`Total Findings: ${total}`);

  return `${lines.join("\n")}\n`;
}

export function shouldFail(findings: Finding[], failOn: Tier): boolean {
  const order: Record<Tier, number> = { error: 0, warning: 1, info: 2 };
  const threshold = order[failOn] ?? 0;
  return findings.some((f) => (order[f.tier] ?? 2) <= threshold);
}
