/**
 * Registry/dispatch parity guards.
 *
 * DOMAINS (rules.ts) is the registry; DOMAIN_ROUTE (engine/routes.ts) is the
 * only routing table. These tests fail when a domain is added to one and
 * forgotten in the other, when a route is dead (no engine emits a finding
 * through it), or when a route leaks rules from other domains.
 */
import { describe, expect, it } from "vitest";
import {
  DOMAINS,
  DOMAIN_ROUTE,
  scanCommitMessage,
  scanFile,
  type Domain,
} from "../src/index.js";
import type { Rule } from "../src/rules.js";

const PROBE = "DISPATCH_PROBE_TOKEN";
const ROUTES = ["text", "ui", "code", "commit"];

/** Schema-valid regex rule whose only purpose is to fire on PROBE. */
function syntheticRule(domain: Domain): Rule {
  return {
    id: `ZS-${domain.toUpperCase()}-999`,
    domain,
    title: "Dispatch probe",
    summary: "Synthetic rule used by the dispatch guard to prove the route fires.",
    tier: "error",
    kind: "regex",
    matcher: { type: "regex", pattern: PROBE },
    source: [
      { repo: "zero-slop", rule: PROBE, ref: "packages/core/test/dispatch.test.ts" },
    ],
    tests: [
      { label: "probe present", input: PROBE, expect: "fail" },
      { label: "probe absent", input: "clean text", expect: "pass" },
    ],
  };
}

describe("domain registry parity", () => {
  it("routes every registered domain exactly once, both directions", () => {
    expect([...Object.keys(DOMAIN_ROUTE)].sort()).toEqual([...DOMAINS].sort());
    for (const route of Object.values(DOMAIN_ROUTE)) expect(ROUTES).toContain(route);
  });
});

describe("per-domain entry points fire (no dead routes)", () => {
  for (const domain of DOMAINS) {
    it(`${domain} produces a finding through its documented entry point`, () => {
      const rule = syntheticRule(domain);
      const findings =
        domain === "commit"
          ? scanCommitMessage([rule], `${PROBE} subject`, {})
          : scanFile([rule], `# ${PROBE}\n\nBody ${PROBE} text.\n`, {
              domains: [domain],
              isMarkdown: false,
            });
      expect(findings.length, `no finding for ${domain}`).toBeGreaterThan(0);
      expect(new Set(findings.map((f) => f.domain))).toEqual(new Set([domain]));
    });
  }
});

describe("scanFile domain selection", () => {
  it("runs only the requested domain (no cross-route leakage)", () => {
    const all = DOMAINS.map((d) => syntheticRule(d));
    for (const domain of DOMAINS) {
      const findings =
        domain === "commit"
          ? scanCommitMessage(all, `${PROBE} subject`, {})
          : scanFile(all, `# ${PROBE}\n\nBody ${PROBE} text.\n`, {
              domains: [domain],
              isMarkdown: false,
            });
      expect([...new Set(findings.map((f) => f.domain))], `domains for ${domain}`).toEqual([
        domain,
      ]);
    }
  });

  it("keeps default buckets when domains is not set (text only on markdown)", () => {
    const rules = [syntheticRule("prose"), syntheticRule("ui"), syntheticRule("code")];

    const markdown = scanFile(rules, `# ${PROBE}\n`, { isMarkdown: true });
    expect(new Set(markdown.map((f) => f.domain))).toEqual(
      new Set(["prose", "ui", "code"]),
    );

    const yaml = scanFile(rules, `key: ${PROBE}\n`, { isMarkdown: false });
    expect(new Set(yaml.map((f) => f.domain))).toEqual(new Set(["ui", "code"]));
  });
});
