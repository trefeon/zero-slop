/**
 * M0 gate: load every domain file from rules/, schema-validate, run cross-file
 * consistency checks, and report per-domain coverage. Exit 1 on any problem.
 *
 * Usage: pnpm validate:rules
 */
import { loadRuleSets, validateRuleSet } from "./index.js";
import { DOMAINS, type Domain, type Tier } from "./rules.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rulesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../rules");

let failed = false;

/** Check one domain file; returns the outcome explicitly so failures are not swallowed. */
async function checkDomain(domain: Domain): Promise<{ ok: boolean; problems: string[] }> {
  try {
    const rules = await loadDomainOrThrow(domain);
    const problems = validateRuleSet(rules);
    const tiers = countBy(rules, (r) => r.tier);
    const kinds = countBy(rules, (r) => r.kind);
    console.log(
      `[${domain.padEnd(9)}] ${String(rules.length).padStart(3)} rules  ` +
        `tiers=${formatCounts(tiers)}  kinds=${formatCounts(kinds)}`,
    );
    return { ok: problems.length === 0, problems };
  } catch (err) {
    return { ok: false, problems: [`[${domain}] FAILED: ${(err as Error).message}`] };
  }
}

for (const domain of DOMAINS) {
  const result = await checkDomain(domain);
  if (!result.ok) {
    failed = true;
    for (const p of result.problems) console.error(`  ✗ ${p}`);
  }
}

async function loadDomainOrThrow(domain: Domain) {
  const { loadDomainRules } = await import("./index.js");
  return loadDomainRules(rulesDir, domain);
}

function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function formatCounts(counts: Record<string, number>): string {
  return Object.entries(counts)
    .map(([k, v]) => `${k}:${v}`)
    .join(" ");
}

// Print overall summary
const allSets = await loadRuleSets(rulesDir);
const all = DOMAINS.flatMap((d) => allSets[d]);
const totalByTier = countBy(all, (r) => r.tier as Tier);
console.log(
  `\nTOTAL: ${all.length} rules across ${DOMAINS.length} domains  tiers=${formatCounts(totalByTier)}`,
);

if (failed) {
  console.error("\n❌ rules DB has problems — fix before M1");
  process.exit(1);
}
console.log("\n✅ rules DB healthy");
