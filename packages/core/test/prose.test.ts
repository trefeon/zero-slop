/**
 * Engine tests for the text-domain scanner (packages/core/src/engine/prose.ts).
 *
 * Coverage: every regex/list/statistical rule in rules/prose.json, chat.json,
 * and integrity.json must fire on its own fail fixture and stay silent on its
 * pass fixtures. Semantic matchers are skipped by design and pinned here so a
 * future engine cannot accidentally fire on them.
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

type TextDomain = "prose" | "chat" | "integrity";

async function loadDomain(domain: TextDomain): Promise<Rule[]> {
  const raw = await readFile(path.join(RULES_DIR, `${domain}.json`), "utf8");
  return z.array(RuleSchema).parse(JSON.parse(raw) as unknown);
}

async function loadTextRules(): Promise<Rule[]> {
  const [prose, chat, integrity] = await Promise.all([
    loadDomain("prose"),
    loadDomain("chat"),
    loadDomain("integrity"),
  ]);
  return [...prose, ...chat, ...integrity];
}

/** Text rules loaded once at module scope (top-level await). */
const TEXT_RULES: Rule[] = await loadTextRules();

/** Content with `dashCount` em dashes spread across `wordCount` words. */
function wordsWithDashes(wordCount: number, dashCount: number): string {
  const out: string[] = [];
  let placed = 0;
  for (let i = 0; i < wordCount; i++) {
    out.push(`word${i}`);
    if (placed < dashCount && (i + 1) % 50 === 0) {
      out.push("—");
      placed++;
    }
  }
  return out.join(" ");
}

describe("prose engine: fixture coverage", () => {
  const covered = TEXT_RULES.filter((r) => r.matcher.type !== "semantic");
  const semantic = TEXT_RULES.filter((r) => r.matcher.type === "semantic");

  it(`covers ${covered.length} of ${TEXT_RULES.length} text rules (regex+list+statistical)`, () => {
    // The loop below is the real assertion; this guards the coverage ratio
    // so a rules-database change cannot silently shrink the matrix.
    expect(covered.length).toBeGreaterThanOrEqual(TEXT_RULES.length * 0.7);
  });

  for (const rule of covered) {
    it(`${rule.id} (${rule.matcher.type}) fires on fail fixtures, silent on pass`, () => {
      for (const t of rule.tests) {
        const ctx = buildContext(t.input);
        const findings = scanProse([rule], ctx, {});
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
      const findings = scanProse([rule], buildContext(failFixture!.input), {});
      expect(findings, `${rule.id} is semantic and must be skipped`).toEqual([]);
    }
  });
});

describe("prose engine: cap behavior", () => {
  it("em-dash rule flags 3 dashes in 200 words but passes 1 in 600", async () => {
    const prose = await loadDomain("prose");
    const emDash = prose.find((r) => r.id === "ZS-PROSE-019")!;

    const overCap = scanProse([emDash], buildContext(wordsWithDashes(200, 3)), {});
    expect(overCap.some((f) => f.ruleId === "ZS-PROSE-019")).toBe(true);
    expect(overCap[0]!.count).toBe(3);
    expect(overCap[0]!.message).toMatch(/cap allows 1 per 500 words/);

    const underCap = scanProse([emDash], buildContext(wordsWithDashes(600, 1)), {});
    expect(underCap.some((f) => f.ruleId === "ZS-PROSE-019")).toBe(false);
  });

  it("maxPerPiece caps per-content occurrences (ellipsis rule)", async () => {
    const prose = await loadDomain("prose");
    const ellipsis = prose.find((r) => r.id === "ZS-PROSE-021")!;
    const multiple = scanProse([ellipsis], buildContext("I mean... it's fine... whatever..."), {});
    expect(multiple.some((f) => f.ruleId === "ZS-PROSE-021")).toBe(true);
    const single = scanProse([ellipsis], buildContext("She paused... then answered."), {});
    expect(single.some((f) => f.ruleId === "ZS-PROSE-021")).toBe(false);
  });
});

describe("prose engine: statistical matchers", () => {
  it("uniform sentence lengths trigger same-length run; varied lengths pass", async () => {
    const prose = await loadDomain("prose");
    const rule = prose.find((r) => r.id === "ZS-PROSE-050")!;

    const uniform = scanProse([rule], buildContext("The gate opened. The gate closed. The gate jammed."), {});
    expect(uniform.some((f) => f.ruleId === "ZS-PROSE-050")).toBe(true);

    const varied = scanProse(
      [rule],
      buildContext("The gate opened. It jammed again at noon, after the latch bent in the heat."),
      {},
    );
    expect(varied.some((f) => f.ruleId === "ZS-PROSE-050")).toBe(false);
  });
});

describe("prose engine: filtering", () => {
  const content = "So we leverage the framework. This is simply broken.";

  it("minTier 'error' drops warning/info findings", async () => {
    const prose = await loadDomain("prose");
    const rules = [
      prose.find((r) => r.id === "ZS-PROSE-001")!, // error
      prose.find((r) => r.id === "ZS-PROSE-044")!, // warning
      prose.find((r) => r.id === "ZS-PROSE-048")!, // info
    ];
    const all = scanProse(rules, buildContext(content), {});
    expect(all.map((f) => f.ruleId).sort()).toEqual(["ZS-PROSE-001", "ZS-PROSE-044", "ZS-PROSE-048"]);

    const errorsOnly = scanProse(rules, buildContext(content), { minTier: "error" });
    expect(errorsOnly.map((f) => f.ruleId)).toEqual(["ZS-PROSE-001"]);
  });

  it("maxFindingsPerRule caps the number of findings returned", async () => {
    const prose = await loadDomain("prose");
    const rules = [
      prose.find((r) => r.id === "ZS-PROSE-001")!,
      prose.find((r) => r.id === "ZS-PROSE-044")!,
      prose.find((r) => r.id === "ZS-PROSE-048")!,
    ];
    expect(scanProse(rules, buildContext(content), { maxFindingsPerRule: 1 }).length).toBe(1);
    expect(scanProse(rules, buildContext(content), { maxFindingsPerRule: 2 }).length).toBe(2);
    expect(scanProse(rules, buildContext(content), {}).length).toBe(3); // default 50
  });
});

describe("prose engine: finding contract", () => {
  it("findings carry ruleId/domain/tier/title/message/evidence/count + position", async () => {
    const prose = await loadDomain("prose");
    const emDash = prose.find((r) => r.id === "ZS-PROSE-019")!;
    const findings = scanProse([emDash], buildContext("It's not X — it's Y — and never Z — period."), {});
    expect(findings).toHaveLength(1);
    const f = findings[0]!;
    expect(f.ruleId).toBe("ZS-PROSE-019");
    expect(f.domain).toBe("prose");
    expect(f.tier).toBe("error");
    expect(f.title).toBe("Em dash cap: max 1 per 500 words");
    expect(f.evidence).toBe("—");
    expect(f.count).toBe(3);
    expect(f.line).toBe(1);
    expect(typeof f.column).toBe("number");
    expect(f.message).toMatch(/Found 3 occurrences/);
    expect(f.message).toMatch(/cap allows 1 per 500 words/);
  });
});
