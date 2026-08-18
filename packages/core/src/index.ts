import { readFile } from "node:fs/promises";
import path from "node:path";
import { DOMAINS, RuleSchema, type Domain, type Rule, type Tier } from "./rules.js";

export * from "./engine/index.js";

/** Map of domain -> rules JSON file (relative to the rules dir). */
export const DOMAIN_FILES: Record<Domain, string> = {
  prose: "prose.json",
  ui: "ui.json",
  code: "code.json",
  commit: "commit.json",
  integrity: "integrity.json",
  a11y: "a11y.json",
  chat: "chat.json",
};

/** Load and schema-validate one domain file. Throws on invalid JSON/schema. */
export async function loadDomainRules(rulesDir: string, domain: Domain): Promise<Rule[]> {
  const file = path.join(rulesDir, DOMAIN_FILES[domain]);
  const raw = await readFile(file, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`${DOMAIN_FILES[domain]}: expected a JSON array, got ${typeof parsed}`);
  }
  return parsed.map((r, i) => {
    const result = RuleSchema.safeParse(r);
    if (!result.success) {
      throw new Error(
        `${DOMAIN_FILES[domain]}[${i}]: invalid rule — ${result.error.issues
          .map((iss) => `${iss.path.join(".")}: ${iss.message}`)
          .join("; ")}`,
      );
    }
    return result.data;
  });
}

/** Load all domain files. */
export async function loadRuleSets(rulesDir: string): Promise<Record<Domain, Rule[]>> {
  const entries = await Promise.all(
    DOMAINS.map(async (domain) => [domain, await loadDomainRules(rulesDir, domain)] as const),
  );
  return Object.fromEntries(entries) as Record<Domain, Rule[]>;
}

/** Load all rules flattened. */
export async function loadRules(rulesDir: string): Promise<Rule[]> {
  const sets = await loadRuleSets(rulesDir);
  return DOMAINS.flatMap((d) => sets[d]);
}

export interface RuleIndex {
  byDomain: Record<Domain, Rule[]>;
  byTier: Record<Tier, Rule[]>;
}

/** Build lookups over a flattened rule list. */
export function buildIndex(rules: Rule[]): RuleIndex {
  const byDomain = {} as Record<Domain, Rule[]>;
  for (const d of DOMAINS) byDomain[d] = [];
  const byTier = {} as Record<Tier, Rule[]>;
  for (const t of ["error", "warning", "info"] as const) byTier[t] = [];
  for (const rule of rules) {
    byDomain[rule.domain].push(rule);
    byTier[rule.tier].push(rule);
  }
  return { byDomain, byTier };
}

/** Cross-file consistency checks. Returns human-readable problems; empty = healthy. */
export function validateRuleSet(rules: Rule[]): string[] {
  const problems: string[] = [];
  const seen = new Map<string, number>();
  for (const rule of rules) {
    seen.set(rule.id, (seen.get(rule.id) ?? 0) + 1);
    const hasFail = rule.tests.some((t) => t.expect === "fail");
    const hasPass = rule.tests.some((t) => t.expect === "pass");
    if (!hasFail) problems.push(`${rule.id}: no failing test fixture`);
    if (!hasPass) problems.push(`${rule.id}: no passing test fixture`);
    if (rule.matcher.type !== rule.kind) {
      problems.push(
        `${rule.id}: matcher.type "${rule.matcher.type}" does not match kind "${rule.kind}"`,
      );
    }
    if (rule.id.split("-")[1] !== rule.domain.toUpperCase()) {
      problems.push(`${rule.id}: id domain does not match rule.domain "${rule.domain}"`);
    }
  }
  for (const [id, count] of seen) {
    if (count > 1) problems.push(`duplicate rule id: ${id} (x${count})`);
  }
  return problems;
}
