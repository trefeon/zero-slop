# Multi-Agent Skills Package: Plan: M4-early

Goal: zero-slop usable by **any AI agent** (Claude Code, Codex, opencode, Cursor,
Antigravity, Copilot, +11 more) as packaged **Agent Skills**: the open standard
already proven by the 69 installed skills (agentskills.io spec; all four major
harnesses read `.claude/skills`, `.agents/skills`, `.cursor/skills`).

## Structure: Portable, folder-per-skill

```
skills/
├── slop-audit/            SKILL.md: core: point agent at rules/ DB + CLI, triage philosophy
├── slop-audit-prose/      copy, docs, chat output (banned words, rhythm, CJK)
├── slop-audit-ui/         visual tells: palette hexes, lips, motion, hero/eyebrow budgets
├── slop-audit-code/       swallowed errors, type escapes, line gates, review criteria
├── slop-audit-commit/     conventional commits, vague subjects, PR hygiene
├── slop-audit-a11y/       WCAG 2.2 thresholds, focus, sr-only, reflow
└── slop-audit-integrity/  fabricated data, fingerprints, citation verification
```

Each skill: minimal frontmatter (`name`, `description`: trigger-first), body
<5000 tokens, references/ point to `rules/<domain>.json` + `zero-slop scan`
CLI as the deterministic layer. Include `scripts/` mirroring engine checks for
agents without the CLI.

## Multi-agent matrix: From the 69-skill audit

| Surface | Path | Notes |
|---|---|---|
| Claude Code | `.claude/skills/` + `~/.claude/skills/` | richest: `context: fork`, `!cmd`, hooks |
| Codex / ChatGPT | `.agents/skills/` | repo-scope walks to root; `agents/openai.yaml` optional |
| opencode | `.opencode/skills/` + `.claude/skills/` + `.agents/skills/` | per-skill permission patterns |
| Cursor | `.cursor/skills/` (also reads `.agents/skills/`) | `paths` glob scoping |
| Antigravity / Copilot | `.agents/skills/` | same folder, zero changes |

One folder per skill loads unchanged in every client, since frontmatter dialect
differences are safely ignored and unknown fields are harmless. Keep the shared
body free of Claude-only mandates such as AskUserQuestion.

## Distribution

1. Commit `skills/` to this repo (single source of truth).
2. `npx skills add <owner>/zero-slop -g` → agents install globally (same CLI
   used for the 69).
3. Wrap as **Agent Plugin** (`plugin.json` + `skills/` + `mcp.json`) per
   agent-plugins.org v1.0 → one-command install on compliant clients.
4. MCP server (`packages/mcp`) exposes `slop_scan`/`slop_score`/`slop_explain`
   as tools to ANY MCP host: the runtime surface complementing the skills.

## Agent-usage contract: Per audit lessons

- Skills describe **when to fire** in `description` (trigger, not summary).
- Body = goals + constraints, not step-by-step railroading (Thariq).
- Include a `Gotchas` section per skill (highest-signal, failure points).
- `references/` for progressive disclosure: ~100 tokens loaded at startup.
- Engine `scripts/` so agents compose, not reconstruct.
- Triage > auto-fail: "slop is an unchosen default": the agent judges
  intentionality, the CLI flags candidates (kill-ai-slop philosophy).

## Acceptance

- `skills-ref validate` passes on every skill folder (official linter).
- Each SKILL.md works unchanged across the four agent paths above.
- Zero Claude-only tool mandates in shared bodies; client extensions only in
  agent-specific subdirs if ever needed (none planned).