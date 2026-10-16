/**
 * Fixture coverage for the skill domain (rules/skill.json): agent instruction
 * artifacts — SKILL.md, AGENTS.md, CLAUDE.md, GEMINI.md, .cursorrules, and
 * markdown under commands/ or agents/ directories.
 *
 * Every regex/list/statistical rule must fire on its own fail fixture and stay
 * silent on its pass fixtures, with the same markdown context the CLI dispatch
 * gives these files (code zones active). Semantic rules carry representative
 * fixtures but are engine-inert by design: they are pinned here so a future
 * matcher cannot start firing on judgment-only tells.
 */
import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { RuleSchema, type Rule } from "../src/rules.js";
import { buildContext } from "../src/engine/tokenize.js";
import { scanProse } from "../src/engine/prose.js";

/** Rules directory relative to the package cwd (pnpm filter runs from packages/core). */
const RULES_DIR = path.resolve("../../rules");

const SKILL_RULES: Rule[] = z
  .array(RuleSchema)
  .parse(JSON.parse(await readFile(path.join(RULES_DIR, "skill.json"), "utf8")));

/** Skill artifacts are dispatched as markdown (see packages/cli/src/walk.ts). */
const skillContext = (input: string) => buildContext(input, { file: "SKILL.md", isMarkdown: true });

describe("skill domain: fixture coverage", () => {
  const executable = SKILL_RULES.filter((r) => r.matcher.type !== "semantic");
  const semantic = SKILL_RULES.filter((r) => r.matcher.type === "semantic");

  it("pins the rule count, the executable majority and the semantic minority", () => {
    expect(SKILL_RULES).toHaveLength(30);
    expect(executable.length).toBeGreaterThanOrEqual(SKILL_RULES.length * 0.75);
    expect(semantic).toHaveLength(2);
  });

  it("every rule carries a source attribution", () => {
    for (const rule of SKILL_RULES) {
      expect(rule.source.length, `${rule.id} needs at least one source`).toBeGreaterThanOrEqual(1);
    }
  });

  for (const rule of executable) {
    it(`${rule.id} (${rule.matcher.type}) fires on fail fixtures, silent on pass`, () => {
      for (const t of rule.tests) {
        const findings = scanProse([rule], skillContext(t.input), {});
        const hit = findings.some((f) => f.ruleId === rule.id);
        if (t.expect === "fail") {
          expect(hit, `${rule.id}: fail fixture "${t.label}" must produce a finding`).toBe(true);
        } else {
          expect(hit, `${rule.id}: pass fixture "${t.label}" must not produce a finding`).toBe(false);
        }
      }
    });
  }

  it(`skips ${semantic.length} semantic rules silently`, () => {
    for (const rule of semantic) {
      const failFixture = rule.tests.find((t) => t.expect === "fail");
      expect(failFixture, `${rule.id} needs a fail fixture`).toBeDefined();
      const findings = scanProse([rule], skillContext(failFixture!.input), {});
      expect(findings, `${rule.id} is semantic and must be skipped`).toEqual([]);
    }
  });
});
