# Skill reference

# Slop Audit: Skill

Goal: keep an agent instruction artifact loadable, triggerable, and cheap to run: spec-valid frontmatter, a description that fires at the right moment, and a body that spends context on decisions rather than ceremony.

Constraints: flag candidates with `zero-slop scan` against `rules/skill.json`; the agent judges intentionality. Never invent checks; cite a rule id, a corpus path, or nothing.

## Frontmatter contract

- Name present; lowercase alphanumerics plus single hyphens; spec length: `rules/skill.json#ZS-SKILL-001`, `#ZS-SKILL-006`.
- Description present and non-empty: `#ZS-SKILL-002`, `#ZS-SKILL-003`.
- No executable payload in a frontmatter field: `#ZS-SKILL-004`.
- Description carries a recognized trigger phrase (`Use when`, `Trigger when`, variants) and stays under the 1024-character cap: `#ZS-SKILL-007`, `#ZS-SKILL-008`, `#ZS-SKILL-009`; see `reference/agentskills:docs/specification.mdx` and `reference/superpowers:skills/writing-skills/SKILL.md`.

## Context budget

- Body under 500 lines and 1000 tokens; `AGENTS.md` and `CLAUDE.md` under 150 lines: `#ZS-SKILL-010`, `#ZS-SKILL-012`, `#ZS-SKILL-011`; large inlined code block: `#ZS-SKILL-027`; see `reference/wshobson-agents:docs/authoring.md`.
- Detail belongs in `references/`, fetched on demand; the main body carries decisions.

## Instruction discipline

- Shouted imperative density: `#ZS-SKILL-013`. Step-by-step railroading: `#ZS-SKILL-014`. Progress cadence or numeric output ceiling: `#ZS-SKILL-015`. Prohibition run with no stated reason: `#ZS-SKILL-016`. Thinking scaffold: `#ZS-SKILL-017`. Unverifiable standing order: `#ZS-SKILL-018`. Repetition markers: `#ZS-SKILL-019`. Placeholder: `#ZS-SKILL-020`. Hardcoded absolute path: `#ZS-SKILL-021`. Version or model pin: `#ZS-SKILL-022`. History narrative: `#ZS-SKILL-023`. Time-sensitive conditional: `#ZS-SKILL-024`. Harness tool vocabulary in shared text: `#ZS-SKILL-025`. Unframed argument interpolation: `#ZS-SKILL-026`; see `reference/anthropics-skills:skills/claude-api/shared/prompt-audit.md`.

## Ship gates

- Ship a verification step and a definition of done: `#ZS-SKILL-028`.
- Leave no duplicated or conflicting instruction in place: `#ZS-SKILL-029`.
- Emoji bullets are decoration, not structure: `#ZS-SKILL-030` (info).
- The semantic checks (`005` dead file reference, `029` duplication) need agent judgment: the CLI cannot decide whether a referenced path exists.

## Deterministic layer

`zero-slop scan` plus `rules/skill.json`. Quoted examples of a banned pattern wrapped in backticks or fenced blocks are code, not instructions, so they are excluded from matching (`rules/prose.json#ZS-PROSE-067` mechanism).
