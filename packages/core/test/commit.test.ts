import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { RuleSchema, type Rule } from "../src/rules.js";
import { scanCommit } from "../src/engine/commit.js";

const RULES_DIR = path.resolve("../../rules");

async function loadCommitRules(): Promise<Rule[]> {
  const raw = await readFile(path.join(RULES_DIR, "commit.json"), "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("commit.json: expected an array");
  return parsed.map((r) => RuleSchema.parse(r));
}

/**
 * Rules not implemented by scanCommit (documented in src/engine/commit.ts):
 *  - PR-description / changed-files field rules (ZS-COMMIT-013, 015, 017, 018)
 *    need PR metadata, not a commit message (M2 CLI)
 *  - ZS-COMMIT-019 statistical changed-file count (PR-level)
 *  - semantic rules handled by the M3 triage agent (author match, blocked
 *    authors, PR template, one-change-per-commit)
 */
const DEFERRED = new Set([
  "ZS-COMMIT-010",
  "ZS-COMMIT-011",
  "ZS-COMMIT-013",
  "ZS-COMMIT-015",
  "ZS-COMMIT-016",
  "ZS-COMMIT-017",
  "ZS-COMMIT-018",
  "ZS-COMMIT-019",
  "ZS-COMMIT-020",
  "ZS-COMMIT-023", // PR diff-size cap: needs PR metadata, not a commit message (M2 CLI)
]);

const rules = await loadCommitRules();
const implemented = rules.filter((r) => !DEFERRED.has(r.id));

describe("commit rules coverage", () => {
  it("implements 11 of 20 commit rules, plus 4 skill-folded rules (rest deferred)", () => {
    expect(rules).toHaveLength(24);
    expect(implemented).toHaveLength(14);
  });

  it("every implemented rule's fail fixture flags and pass fixture stays clean", () => {
    for (const rule of implemented) {
      for (const t of rule.tests) {
        const findings = scanCommit([rule], t.input);
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

describe("scanCommit", () => {
  it("accepts a conventional message with a body and flags non-conventional ones", () => {
    const good =
      "feat(auth): add refresh token rotation\n\n" +
      "Adds rotating refresh tokens with replay detection and revocation.";
    expect(scanCommit(rules, good)).toEqual([]);

    const bad = "update things";
    expect(scanCommit(rules, bad).map((f) => f.ruleId)).toEqual(["ZS-COMMIT-001", "ZS-COMMIT-008"]);
  });

  it("enforces the emoji cap of 2", () => {
    const ok = "fix: correct the timezone offset 🕐";
    expect(scanCommit(rules, ok).filter((f) => f.ruleId === "ZS-COMMIT-014")).toEqual([]);

    const bad = "feat: add export 🚀✨🔥";
    const finding = scanCommit(rules, bad).find((f) => f.ruleId === "ZS-COMMIT-014");
    expect(finding).toBeDefined();
    expect(finding?.count).toBe(3);
    expect(finding?.tier).toBe("error");
  });

  it("enforces the 100-char header limit", () => {
    const longHeader = "fix: " + "a".repeat(110) + "\n\nBody.";
    const finding = scanCommit(rules, longHeader).find((f) => f.ruleId === "ZS-COMMIT-005");
    expect(finding).toBeDefined();
    expect(finding?.line).toBe(1);

    const short = "fix: some message\n\nBody.";
    expect(scanCommit(rules, short).filter((f) => f.ruleId === "ZS-COMMIT-005")).toEqual([]);
  });

  it("flags a conventional commit with no description body (ZS-COMMIT-012)", () => {
    const findings = scanCommit(rules, "fix: typo in the retry backoff");
    expect(findings.some((f) => f.ruleId === "ZS-COMMIT-012")).toBe(true);

    const withBody = "fix: typo in the retry backoff\n\nCorrects the backoff multiplier.";
    expect(scanCommit(rules, withBody).filter((f) => f.ruleId === "ZS-COMMIT-012")).toEqual([]);
  });

  it("flags body lines over 100 chars but exempts messages with URLs", () => {
    const longBody =
      "fix: some message\n\nbody with multiple lines\n" +
      "has a message that is way too long and will break the line rule 'line-max-length' by several characters";
    const findings = scanCommit(rules, longBody).filter((f) => f.ruleId === "ZS-COMMIT-007");
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(4);

    const urled =
      "docs: update readme\n\n" +
      "Adds a very long explanation of the installation steps that goes on and on well past " +
      "the one hundred character limit because it is a single sentence run on for no reason " +
      "at all see https://example.com/installation for more.";
    expect(scanCommit(rules, urled).filter((f) => f.ruleId === "ZS-COMMIT-007")).toEqual([]);
  });

  it("flags non-lower-case and empty-subject headers", () => {
    expect(scanCommit(rules, "FIX: some message").some((f) => f.ruleId === "ZS-COMMIT-002")).toBe(true);
    expect(scanCommit(rules, "fix:").some((f) => f.ruleId === "ZS-COMMIT-003")).toBe(true);
    expect(scanCommit(rules, "fix(scope): Some message").some((f) => f.ruleId === "ZS-COMMIT-004")).toBe(true);
  });
});
