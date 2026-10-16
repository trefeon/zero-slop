/**
 * Fixture coverage for the config domain (rules/config.json): CI/CD manifests —
 * GitHub Actions workflows and action manifests, .gitlab-ci.yml,
 * .circleci/config.yml, .pre-commit-config.yaml.
 *
 * Every rule is a line-oriented regex; each must fire on its own fail fixtures
 * and stay silent on its pass fixtures, with the same context the CLI dispatch
 * gives these files (YAML, not markdown — no code zones). Like the a11y
 * domain's statistical rules, semantic-kind config rules would be engine-inert
 * by design; the count pin below keeps that from drifting silently.
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

const CONFIG_RULES: Rule[] = z
  .array(RuleSchema)
  .parse(JSON.parse(await readFile(path.join(RULES_DIR, "config.json"), "utf8")));

/** CI manifests are dispatched as plain YAML (see packages/cli/src/walk.ts). */
const configContext = (input: string) =>
  buildContext(input, { file: ".github/workflows/ci.yml", isMarkdown: false });

describe("config domain: fixture coverage", () => {
  const executable = CONFIG_RULES.filter((r) => r.matcher.type !== "semantic");
  const semantic = CONFIG_RULES.filter((r) => r.matcher.type === "semantic");

  it("pins the rule count and the error-tier floor", () => {
    expect(CONFIG_RULES).toHaveLength(19);
    expect(CONFIG_RULES.filter((r) => r.tier === "error").length).toBeGreaterThanOrEqual(5);
    expect(semantic).toHaveLength(0);
  });

  it("every rule carries a source attribution", () => {
    for (const rule of CONFIG_RULES) {
      expect(rule.source.length, `${rule.id} needs at least one source`).toBeGreaterThanOrEqual(1);
    }
  });

  for (const rule of executable) {
    it(`${rule.id} (${rule.matcher.type}) fires on fail fixtures, silent on pass`, () => {
      for (const t of rule.tests) {
        const findings = scanProse([rule], configContext(t.input), {});
        const hit = findings.some((f) => f.ruleId === rule.id);
        if (t.expect === "fail") {
          expect(hit, `${rule.id}: fail fixture "${t.label}" must produce a finding`).toBe(true);
        } else {
          expect(hit, `${rule.id}: pass fixture "${t.label}" must not produce a finding`).toBe(false);
        }
      }
    });
  }
});
