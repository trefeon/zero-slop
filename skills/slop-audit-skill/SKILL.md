---
name: slop-audit-skill
description: Use when auditing an agent instruction artifact — SKILL.md, AGENTS.md, CLAUDE.md, .cursorrules, a subagent or command definition — for frontmatter contract breaks, context-budget bloat, unverifiable standing orders, or a missing definition of done. Triggers on "audit my skill", "review AGENTS.md", "why is my skill not loading", and frontmatter or context-budget review requests.
---

# Slop Audit: Skill

**Goal:** Keep an instruction artifact loadable and cheap to run: spec-valid frontmatter, a description that fires at the right moment, and a body that spends context on decisions rather than ceremony. Deterministic checks live in `rules/skill.json`; run `zero-slop scan` as the first pass.

**Philosophy:** An instruction file is a contract with a model that pays for every token before it acts. A default that slipped in is slop even when the prose is clean: a summary where a trigger belongs, a virtue sentence standing in for an acceptance test, a railroaded sequence for work that needs one command. Quote the artifact's own words when reporting; judge intent before deleting.

**Constraints:**
- Cite every finding as `rules/skill.json#<rule-id>`; never invent a threshold, and never tighten or loosen a budget from opinion.
- Frontmatter is a contract, not style: `name` and `description` are required, only spec-listed keys exist, `name` is lowercase alphanumerics plus single hyphens, and `description` stays under the 1024-character cap (`reference/agentskills:docs/specification.mdx`).
- Descriptions carry trigger conditions only. A workflow summary becomes the plan the agent follows instead of the body (`reference/superpowers:skills/writing-skills/SKILL.md`).
- Progressive disclosure: the main body stays lean and detail moves into `references/` or a second file the agent fetches on demand (`reference/superpowers:skills/writing-skills/anthropic-best-practices.md`).
- Calibrate prescriptiveness to fragility and say why; a railroaded sequence for a judgment task costs more context than it saves (`reference/agentskills:docs/skill-creation/best-practices.mdx`).
- Every hard requirement needs an observable acceptance test; a virtue sentence is not one (`reference/anthropics-skills:skills/claude-api/shared/prompt-audit.md`).
- Budgets: bodies stay under 500 lines and 1000 tokens, context files such as `AGENTS.md` or `CLAUDE.md` under 150 lines (`reference/wshobson-agents:docs/authoring.md`).

**Checks (point at CLI + rules JSON):**
- Loadability: missing `name` (ZS-SKILL-001), missing `description` (ZS-SKILL-002), empty required field (ZS-SKILL-003), executable payload in frontmatter (ZS-SKILL-004), `name` charset or length (ZS-SKILL-006), and the judgment-only dangling file reference (ZS-SKILL-005, error when the target does not exist in the same repository).
- Description quality: no recognized trigger phrase (ZS-SKILL-007), workflow summary instead of a trigger (ZS-SKILL-008), over the 1024-character cap (ZS-SKILL-009).
- Context budget: body over 500 lines (ZS-SKILL-010), `AGENTS.md` or `CLAUDE.md` over 150 lines (ZS-SKILL-011), body over 1000 tokens (ZS-SKILL-012), large inlined code block (ZS-SKILL-027).
- Instruction discipline: shouted imperative density (ZS-SKILL-013), step-by-step railroading (ZS-SKILL-014), progress cadence or numeric output ceiling (ZS-SKILL-015), prohibition run with no stated reason (ZS-SKILL-016), dated thinking scaffold (ZS-SKILL-017), unverifiable standing order (ZS-SKILL-018), scattered repetition markers (ZS-SKILL-019), unresolved placeholder (ZS-SKILL-020), hardcoded local absolute path (ZS-SKILL-021), version or model pin that will rot (ZS-SKILL-022), history narrative (ZS-SKILL-023), time-sensitive conditional (ZS-SKILL-024), one harness's tool vocabulary baked into shared text (ZS-SKILL-025), unframed `$ARGUMENTS` interpolation (ZS-SKILL-026).
- Ship gates: no verification step or definition of done (ZS-SKILL-028), duplicated or conflicting instruction left in place (ZS-SKILL-029, judgment), emoji used as bullet decoration (ZS-SKILL-030, info).

**Gotchas:**
- The budgets count prose outside code zones, so a lexicon or example list belongs in a table or fenced block, not in running sentences.
- Trigger phrases are recognized in a fixed family (`Use when`, `Trigger when`, and variants); a description that reads well but carries none of them still fails to fire (ZS-SKILL-007).
- Interpolated arguments are data, not instructions: wrap a bare placeholder such as `$ARGUMENTS` in a framed block, or a file-level check reports it (ZS-SKILL-026).
- A `MUST` that fixes a demonstrably underweighted instruction is fine; a page of them is the tell (ZS-SKILL-013, purpose-gated).
- Version pins and harness-specific tool names are correct inside a client extension and wrong in a shared body (ZS-SKILL-022, ZS-SKILL-025).
- Quoted examples of a banned pattern are excluded when wrapped in backticks — that is the sanction for keeping them, not deletion (rules/README.md: exclusion zones).
