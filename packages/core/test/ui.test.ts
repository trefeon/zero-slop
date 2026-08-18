import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanUi } from "../src/engine/ui.js";
import { RuleSchema, type Rule } from "../src/rules.js";

const RULES_DIR = path.resolve("../../rules");

/** Load + schema-validate one domain file (mirrors loadDomainRules without
 * pulling in the engine re-exports on src/index.ts). */
async function loadRulesFile(name: string): Promise<Rule[]> {
  const raw = await readFile(path.join(RULES_DIR, `${name}.json`), "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error(`${name}.json: expected a JSON array`);
  return parsed.map((r) => RuleSchema.parse(r));
}

const uiRules = await loadRulesFile("ui");
const a11yRules = await loadRulesFile("a11y");
const allRules = [...uiRules, ...a11yRules];

/** Rules the ui engine executes in M1: regex + list matchers only. */
const executableRules = allRules.filter(
  (r) => r.matcher.type === "regex" || r.matcher.type === "list",
);

function ruleById(id: string): Rule {
  const rule = allRules.find((r) => r.id === id);
  if (!rule) throw new Error(`rule ${id} not found`);
  return rule;
}

/** Synthetic rule for engine behavior tests (cap params, lists, bad patterns). */
function makeRule(overrides: Partial<Rule>): Rule {
  return {
    id: "ZS-UI-999",
    domain: "ui",
    title: "Synthetic rule",
    summary: "Synthetic rule for engine behavior tests.",
    tier: "warning",
    kind: "regex",
    matcher: { type: "regex", pattern: "." },
    source: [{ repo: "test", rule: "synthetic" }],
    tests: [
      { label: "fail", input: "trigger", expect: "fail" },
      { label: "pass", input: "ok", expect: "pass" },
    ],
    ...overrides,
  } as Rule;
}

describe("scanUi rule coverage", () => {
  it("executes every regex rule and defers statistical + semantic", () => {
    const byMatcher = new Map<string, number>();
    for (const r of allRules) byMatcher.set(r.matcher.type, (byMatcher.get(r.matcher.type) ?? 0) + 1);
    expect(allRules).toHaveLength(145);
    expect(byMatcher.get("regex")).toBe(93);
    expect(byMatcher.get("statistical")).toBe(12);
    expect(byMatcher.get("semantic")).toBe(38);
    expect(byMatcher.get("list")).toBe(2);
    expect(executableRules).toHaveLength(95);
  });

  it("skips statistical rules silently (contrast/palette/timing need CSS parsing -> M1.5)", () => {
    const stat = allRules.filter((r) => r.matcher.type === "statistical");
    expect(stat.length).toBeGreaterThan(0);
    for (const rule of stat) {
      const failInput = rule.tests.find((t) => t.expect === "fail")!.input;
      expect(scanUi([rule], failInput), rule.id).toEqual([]);
    }
  });

  it("skips semantic rules silently (fake testimonials, dead elements -> M3)", () => {
    const sem = allRules.filter((r) => r.matcher.type === "semantic");
    expect(sem.length).toBeGreaterThan(0);
    for (const rule of sem) {
      const failInput = rule.tests.find((t) => t.expect === "fail")!.input;
      expect(scanUi([rule], failInput), rule.id).toEqual([]);
    }
  });
});

describe("scanUi fixture-driven matching", () => {
  it.each(executableRules.map((r) => [r.id, r] as const))(
    "%s fail fixture produces a finding for that ruleId",
    (_id, rule) => {
      const failInput = rule.tests.find((t) => t.expect === "fail")!.input;
      const findings = scanUi([rule], failInput);
      expect(findings.filter((f) => f.ruleId === rule.id).length).toBeGreaterThan(0);
      for (const f of findings) {
        expect(f.count).toBeGreaterThan(0);
        expect(f.evidence.length).toBeGreaterThan(0);
        expect(f.evidence.length).toBeLessThanOrEqual(80);
      }
    },
  );

  it.each(executableRules.map((r) => [r.id, r] as const))(
    "%s pass fixture produces no finding for that ruleId",
    (_id, rule) => {
      const passInput = rule.tests.find((t) => t.expect === "pass")!.input;
      const findings = scanUi([rule], passInput);
      expect(findings.filter((f) => f.ruleId === rule.id)).toEqual([]);
    },
  );
});

describe("scanUi line/column precision", () => {
  it("reports 1-based line/column and total match count", () => {
    const content = [
      '<div class="uppercase tracking-widest text-xs">FEATURES</div>',
      "<h2>Features</h2>",
      "<button>Get Started →</button>",
      "<button>Learn More →</button>",
    ].join("\n");
    const findings = scanUi(
      [ruleById("ZS-UI-019"), ruleById("ZS-UI-060")],
      content,
      { file: "features.html" },
    );

    const kicker = findings.filter((f) => f.ruleId === "ZS-UI-019");
    expect(kicker).toHaveLength(1);
    expect(kicker[0].line).toBe(1);
    expect(kicker[0].column).toBe(13); // 'u' of "uppercase" after `<div class="`
    // The rule pattern has no trailing boundary, so the alternation matches
    // the "wide" prefix of "widest" and the greedy gap stays minimal.
    expect(kicker[0].evidence).toBe("uppercase tracking-wide");
    expect(kicker[0].count).toBe(1);
    expect(kicker[0].file).toBe("features.html");

    const arrows = findings.filter((f) => f.ruleId === "ZS-UI-060");
    expect(arrows).toHaveLength(2);
    expect(arrows.map((f) => f.line)).toEqual([3, 4]);
    expect(arrows.map((f) => f.column)).toEqual([21, 20]); // after `<button>Get Started ` / `<button>Learn More `
    expect(arrows.map((f) => f.count)).toEqual([2, 2]); // total across lines
    expect(arrows[0].evidence).toBe("→");
  });

  it("finds multiple matches on one line with distinct columns", () => {
    const content = "<button>Get Started →</button> <button>Try Now →</button>";
    const findings = scanUi([ruleById("ZS-UI-060")], content);
    expect(findings).toHaveLength(2);
    expect(findings.map((f) => f.column)).toEqual([21, 48]);
    expect(findings.map((f) => f.count)).toEqual([2, 2]);
  });
});

describe("scanUi on a real-world mini page", () => {
  const page = [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8" />',
    "  <title>Northwind Analytics</title>",
    "  <style>",
    '    body { font-family: "Inter", sans-serif; }',
    "    .highlight { border-left: 4px solid var(--accent); border-radius: 8px; padding-left: 12px; }",
    "  </style>",
    "</head>",
    "<body>",
    "  <main>",
    "    <h1>Revenue dashboard</h1>",
    '    <button class="bg-gradient-to-br from-indigo-500 to-purple-600">Upgrade</button>',
    "  </main>",
    "</body>",
    "</html>",
  ].join("\n");

  it("finds exactly the three planted tells and nothing else", () => {
    const findings = scanUi([...uiRules, ...a11yRules], page, { file: "page.html" });
    const ruleIds = [...new Set(findings.map((f) => f.ruleId))].sort();
    // bg-gradient-to-br from-indigo-500 to-purple-600 (ZS-UI-001) + accent-hue
    // band (ZS-UI-093), border-left: 4px + border-radius (ZS-UI-029),
    // font-family: "Inter" (ZS-UI-015).
    expect(ruleIds).toEqual(["ZS-UI-001", "ZS-UI-015", "ZS-UI-029", "ZS-UI-093"]);
    for (const f of findings) {
      // ZS-UI-093 (accent hue band) matches both from-indigo-500 and to-purple-600.
      if (f.ruleId === "ZS-UI-093") {
        expect(f.count).toBe(2);
      } else {
        expect(f.count).toBe(1);
      }
      expect(f.file).toBe("page.html");
    }
  });

  it("points the border-left tell at its exact line/column", () => {
    const findings = scanUi([...uiRules, ...a11yRules], page);
    const border = findings.find((f) => f.ruleId === "ZS-UI-029")!;
    expect(border.line).toBe(8);
    expect(border.column).toBe(18); // 'b' of "border-left" after 4 spaces + ".highlight { "
    expect(border.evidence.startsWith("border-left: 4px")).toBe(true);
  });
});

describe("scanUi cap + tier behaviors", () => {
  it("maxPerPiece caps occurrences per piece (one finding with count)", () => {
    const rule = makeRule({
      id: "ZS-UI-900",
      title: "Cap: supercharge/unleash per piece",
      matcher: { type: "regex", pattern: "\\b(supercharge|unleash)\\b", params: { maxPerPiece: 1 } },
    });

    const over = scanUi([rule], "Supercharge your workflow and unleash your potential.");
    expect(over).toHaveLength(1);
    expect(over[0].ruleId).toBe("ZS-UI-900");
    expect(over[0].count).toBe(2);
    expect(over[0].line).toBe(1);
    expect(over[0].column).toBe(1);
    expect(over[0].evidence).toBe("Supercharge");
    expect(over[0].message).toContain("2 occurrences (allowed 1)");

    expect(scanUi([rule], "Supercharge your workflow.")).toEqual([]);
    const loose = makeRule({
      ...rule,
      matcher: { type: "regex", pattern: "\\b(supercharge|unleash)\\b", params: { maxPerPiece: 2 } },
    });
    expect(scanUi([loose], "Supercharge your workflow and unleash your potential.")).toEqual([]);
  });

  it("maxPerWords + wordsWindow allow floor(words/window), fail above", () => {
    const rule = makeRule({
      id: "ZS-UI-901",
      title: "Cap: moreover per 500 words",
      matcher: {
        type: "regex",
        pattern: "\\bmoreover\\b",
        params: { maxPerWords: 500, wordsWindow: 500 },
      },
    });
    const words = (where: number[]) =>
      Array.from({ length: 600 }, (_, i) => (where.includes(i) ? "moreover" : "alpha")).join(" ");

    const over = scanUi([rule], words([0, 300])); // 600 words -> allowed 1, hits 2
    expect(over).toHaveLength(1);
    expect(over[0].count).toBe(2);
    expect(over[0].message).toContain("2 occurrences (allowed 1)");

    expect(scanUi([rule], words([0]))).toEqual([]); // hits 1 <= allowed 1
  });

  it("maxPerNWords family allows floor(words*N/window) without max(1)", () => {
    const rule = makeRule({
      id: "ZS-UI-905",
      title: "Cap: binary contrast per 500 words",
      matcher: {
        type: "regex",
        pattern: "\\b(not X but Y|neither A nor B)\\b",
        params: { maxPer500Words: 2, caseSensitive: false },
      },
    });
    const words = (hits: number) => {
      const parts = Array.from({ length: 500 }, () => "alpha");
      for (let i = 0; i < hits; i++) parts[i] = "not X but Y";
      return parts.join(" ");
    };

    // 500 words -> allowed floor(500*2/500) = 2; 3 hits fail.
    const over = scanUi([rule], words(3));
    expect(over).toHaveLength(1);
    expect(over[0].count).toBe(3);
    expect(over[0].message).toContain("3 occurrences (allowed 2)");

    // 500 words, 2 hits -> 2 > 2 false -> clean.
    expect(scanUi([rule], words(2))).toEqual([]);

    // Short piece (< one window) -> allowed 0, any hit fails.
    const short = "not X but Y in a tiny snippet";
    const shortHit = scanUi([rule], short);
    expect(shortHit).toHaveLength(1);
    expect(shortHit[0].count).toBe(1);
    expect(shortHit[0].message).toContain("1 occurrences (allowed 0)");
  });

  it("list rules match standalone terms case-insensitively with word boundaries", () => {
    const rule = makeRule({
      id: "ZS-UI-902",
      title: "List: elevate/empower",
      matcher: { type: "list", terms: ["elevate", "empower"] },
    });

    const findings = scanUi([rule], "Elevate your game and empower your team");
    expect(findings).toHaveLength(2);
    expect(findings.map((f) => f.evidence)).toEqual(["Elevate", "empower"]);
    expect(findings.map((f) => f.column)).toEqual([1, 23]);
    expect(findings.map((f) => f.count)).toEqual([2, 2]);

    // Word-boundary lookarounds: no match inside longer words.
    expect(scanUi([rule], "An elevated platform empowers teams")).toEqual([]);
  });

  it("list rules honor caseSensitive", () => {
    const rule = makeRule({
      id: "ZS-UI-903",
      title: "List: elevate case-sensitive",
      matcher: { type: "list", terms: ["elevate"], params: { caseSensitive: true } },
    });
    const findings = scanUi([rule], "Elevate and elevate");
    expect(findings).toHaveLength(1);
    expect(findings[0].evidence).toBe("elevate");
    expect(findings[0].column).toBe(13);
  });

  it("minTier drops findings below the tier", () => {
    const content = [
      '<h1 class="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">Launch</h1>',
      ":root { --color-paper: oklch(96% 0 0); }",
    ].join("\n");
    const rules = [ruleById("ZS-UI-002"), ruleById("ZS-UI-001"), ruleById("ZS-UI-008")];

    const all = scanUi(rules, content);
    expect(new Set(all.map((f) => f.tier))).toEqual(new Set(["error", "warning", "info"]));

    const warnUp = scanUi(rules, content, { minTier: "warning" });
    expect(warnUp.map((f) => f.tier)).not.toContain("info");
    expect(new Set(warnUp.map((f) => f.tier))).toEqual(new Set(["error", "warning"]));

    const errorOnly = scanUi(rules, content, { minTier: "error" });
    expect(errorOnly.map((f) => f.tier)).toEqual(["error"]);
  });

  it("maxFindingsPerRule caps entries per rule but keeps the true count", () => {
    const rule = ruleById("ZS-UI-060");
    const content = "→ ".repeat(10);

    const capped = scanUi([rule], content, { maxFindingsPerRule: 3 });
    expect(capped).toHaveLength(3);
    for (const f of capped) {
      expect(f.count).toBe(10);
      expect(f.line).toBe(1);
    }

    const uncapped = scanUi([rule], content);
    expect(uncapped).toHaveLength(10);
    for (const f of uncapped) expect(f.count).toBe(10);
  });

  it("skips rules whose pattern fails to compile", () => {
    const bad = makeRule({
      id: "ZS-UI-904",
      matcher: { type: "regex", pattern: "(" },
    });
    expect(scanUi([bad], "anything ( goes here")).toEqual([]);
    expect(() => scanUi([bad], "anything ( goes here")).not.toThrow();
  });
});
