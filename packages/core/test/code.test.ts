import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { RuleSchema, type Rule } from "../src/rules.js";
import { scanCode } from "../src/engine/code.js";

const RULES_DIR = path.resolve("../../rules");

async function loadCodeRules(): Promise<Rule[]> {
  const raw = await readFile(path.join(RULES_DIR, "code.json"), "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("code.json: expected an array");
  return parsed.map((r) => RuleSchema.parse(r));
}

/**
 * Rules not implemented by scanCode (documented in src/engine/code.ts):
 *  - statistical rules needing repo/PR-level metrics (duplicate clusters,
 *    directory ratios, diff comment caps) — M2 CLI / repo scanner
 *  - semantic rules handled by the M3 triage agent
 */
const DEFERRED = new Set([
  "ZS-CODE-012",
  "ZS-CODE-013",
  "ZS-CODE-014",
  "ZS-CODE-016",
  "ZS-CODE-032",
  "ZS-CODE-017",
  "ZS-CODE-019",
  "ZS-CODE-020",
  "ZS-CODE-021",
  "ZS-CODE-022",
  "ZS-CODE-030",
  "ZS-CODE-031",
  "ZS-CODE-033",
  "ZS-CODE-034",
  "ZS-CODE-035",
  "ZS-CODE-036",
]);

const rules = await loadCodeRules();
const implemented = rules.filter((r) => !DEFERRED.has(r.id));

describe("code rules coverage", () => {
  it("implements 20 of 36 code rules, plus 15 skill-folded rules (rest deferred)", () => {
    expect(rules).toHaveLength(51);
    expect(implemented).toHaveLength(35);
  });

  it("every implemented rule's fail fixture flags and pass fixture stays clean", () => {
    for (const rule of implemented) {
      for (const t of rule.tests) {
        const findings = scanCode([rule], t.input, { file: "fixture.ts" });
        const ids = findings.map((f) => f.ruleId);
        if (t.expect === "fail") {
          expect(ids, `${rule.id}: ${t.label}`).toContain(rule.id);
        } else {
          expect(ids, `${rule.id}: ${t.label}`).not.toContain(rule.id);
        }
      }
    }
  });
});

describe("scanCode", () => {
  it("flags a swallowed catch, @ts-ignore and as any with line/column", () => {
    const content = [
      "export async function loadProfile(id: string) {",
      "  try {",
      "    const raw = await fetchProfile(id);",
      "    return JSON.parse(raw);",
      "  } catch (error) {",
      "    logger.warn(error);",
      "  }",
      "  // @ts-ignore -- legacy payload shape",
      "  const legacy = payload as any;",
      "  return legacy;",
      "}",
      "",
    ].join("\n");

    const findings = scanCode(rules, content, { file: "profile.ts" });

    const logAndContinue = findings.filter((f) => f.ruleId === "ZS-CODE-001");
    expect(logAndContinue).toHaveLength(1);
    expect(logAndContinue[0]).toMatchObject({
      domain: "code",
      tier: "error",
      line: 5,
      column: 5,
      file: "profile.ts",
    });

    const typeEscapes = findings.filter((f) => f.ruleId === "ZS-CODE-008");
    expect(typeEscapes).toHaveLength(2);
    expect(typeEscapes.map((f) => f.line ?? 0).sort((a, b) => a - b)).toEqual([8, 9]);
    expect(typeEscapes.every((f) => typeof f.column === "number" && f.column >= 1)).toBe(true);
    expect(typeEscapes.every((f) => f.evidence.length > 0)).toBe(true);
  });

  it("reports the file on every finding", () => {
    const findings = scanCode(rules, "const parsed = JSON.parse(raw) as Record<string, unknown>;", {
      file: "load.ts",
    });
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((f) => f.file === "load.ts")).toBe(true);
  });

  it("respects minTier (keeps errors only)", () => {
    const content = "// @ts-ignore\nconst x = payload as any;";
    const all = scanCode(rules, content);
    expect(all.length).toBeGreaterThan(0);
    const errors = scanCode(rules, content, { minTier: "error" });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.every((f) => f.tier === "error")).toBe(true);
    expect(errors.some((f) => f.ruleId === "ZS-CODE-008")).toBe(true);
  });

  it("respects maxFindingsPerRule", () => {
    const content = Array.from({ length: 5 }, () => "// @ts-ignore\nconst x = payload as any;").join("\n");
    const capped = scanCode(rules, content, { maxFindingsPerRule: 3 });
    expect(capped.filter((f) => f.ruleId === "ZS-CODE-008")).toHaveLength(3);
    const uncapped = scanCode(rules, content);
    expect(uncapped.filter((f) => f.ruleId === "ZS-CODE-008")).toHaveLength(10);
  });

  it("flags a Python bare except with pass (ZS-CODE-023)", () => {
    const py = "try:\n    rows = fetch_rows()\nexcept Exception:\n    pass";
    const findings = scanCode(rules, py);
    expect(findings.some((f) => f.ruleId === "ZS-CODE-023")).toBe(true);
  });

  it("clean code produces no code findings", () => {
    const clean = `export function readConfig(raw: string) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error("Invalid config JSON", { cause: error });
  }
}
`;
    expect(scanCode(rules, clean)).toEqual([]);
  });
});
