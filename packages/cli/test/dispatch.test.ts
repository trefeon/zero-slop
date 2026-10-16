/**
 * CLI dispatch parity guards.
 *
 * The walker's path dispatch is the only source of a file's domains, and
 * VALID_DOMAINS is the CLI's copy of the core registry. These tests fail when
 * a registered domain is unreachable from any path, when dispatch invents a
 * domain core does not know, or when the two domain lists drift apart.
 */
import { describe, expect, it } from "vitest";
import { DOMAINS } from "@zero-slop/core";
import { VALID_DOMAINS, type Domain } from "../src/types.js";
import { getFileDispatch } from "../src/walk.js";

/** One representative path per dispatcher branch (see walk.ts). */
const PATHS: Array<{ path: string; domains: Domain[]; isMarkdown: boolean }> = [
  { path: "skills/slop-audit/SKILL.md", domains: ["skill"], isMarkdown: true },
  { path: ".github/workflows/ci.yml", domains: ["config"], isMarkdown: false },
  { path: "action.yml", domains: ["config"], isMarkdown: false },
  { path: ".gitlab-ci.yml", domains: ["config"], isMarkdown: false },
  { path: "docs/guide.md", domains: ["prose", "chat", "integrity"], isMarkdown: true },
  { path: "src/index.ts", domains: ["code"], isMarkdown: false },
  { path: "site/index.html", domains: ["ui", "a11y", "code"], isMarkdown: false },
  { path: "site/theme.css", domains: ["ui", "a11y"], isMarkdown: false },
];

describe("CLI file dispatch", () => {
  it("routes each representative path to its documented domains", () => {
    for (const { path, domains, isMarkdown } of PATHS) {
      expect(getFileDispatch(path), path).toEqual({ domains, isMarkdown });
    }
  });

  it("dispatches every non-commit registered domain across those paths", () => {
    const dispatched = new Set<Domain>();
    for (const { path } of PATHS) {
      for (const domain of getFileDispatch(path)!.domains) dispatched.add(domain);
    }
    // `commit` rules only run on commit messages (scanCommitMessage), never
    // from a file path, so paths must cover every other registered domain.
    expect([...dispatched].sort()).toEqual(DOMAINS.filter((d) => d !== "commit").sort());
    expect(dispatched.has("commit")).toBe(false);
  });

  it("routes skill artifacts before the markdown extension map", () => {
    const skillPaths = [
      "SKILL.md",
      "packs/SkIlL.MD",
      "AGENTS.md",
      "nested/dir/CLAUDE.md",
      "GEMINI.md",
      ".cursorrules",
      ".github/copilot-instructions.md",
      "repo/.github/copilot-instructions.md",
      "pkg/agents/reviewer.md",
      "pkg/commands/deploy.md",
      "nested/commands/x/run.md",
    ];
    for (const path of skillPaths) {
      expect(getFileDispatch(path), path).toEqual({ domains: ["skill"], isMarkdown: true });
    }
    // Markdown outside skill paths keeps prose routing.
    expect(getFileDispatch("notes/agent-notes.md")).toEqual({
      domains: ["prose", "chat", "integrity"],
      isMarkdown: true,
    });
    // `agents`/`commands` must be directory segments, not substrings.
    expect(getFileDispatch("docs/myagents/x.md")?.domains).toEqual([
      "prose",
      "chat",
      "integrity",
    ]);
  });

  it("routes CI/CD manifests to config and normalizes Windows separators", () => {
    const configPaths = [
      ".github/workflows/release.yml",
      "nested/.github/workflows/ci.yaml",
      "action.yml",
      "sub/dir/action.yaml",
      ".gitlab-ci.yml",
      "mono/.gitlab-ci.yml",
      ".circleci/config.yml",
      ".pre-commit-config.yaml",
      ".github\\workflows\\ci.yml",
    ];
    for (const path of configPaths) {
      expect(getFileDispatch(path), path).toEqual({ domains: ["config"], isMarkdown: false });
    }
    // Unrelated YAML stays undispatched (extension map unchanged).
    expect(getFileDispatch("ci/ci.yml")).toBeNull();
    expect(getFileDispatch("docker-compose.yaml")).toBeNull();
  });

  it("keeps VALID_DOMAINS in exact sync with the core registry", () => {
    expect([...VALID_DOMAINS].sort()).toEqual([...DOMAINS].sort());
  });
});
