---
name: zeroslop-audit
description: Use when auditing AI-generated copy, UI, code, commits, accessibility, credibility, agent instructions, or CI configuration for generic slop tells, when unsure which zeroslop-audit-* domain skill applies, or when a review needs the flag-vs-intent triage rule.
---

# Zeroslop Audit: Router

## Goal

Decide whether a draft reads as an unchosen model default and route to the one domain skill that owns the verdict. This skill never audits directly; it triages and delegates (docs/MULTI_AGENT_SKILLS.md).

## Triage philosophy

Slop is an unchosen default, not a banned token. The deterministic layer flags candidates; the agent judges intentionality and keeps what is deliberate (docs/MULTI_AGENT_SKILLS.md; docs/ZERO_SLOP_FRAMEWORK.md: Core Law, "Filters enforce discipline; Intentionality creates craft").

Tier discipline comes from the rules DB schema (rules/README.md): `error` means always fail; `warning` means fail only when the match is an unchosen default; `info` means consistency/hygiene. `semantic`-kind rules have no matcher and are triage-only (rules/README.md).

## Deterministic layer

Point every verdict at the machine-readable source, never at memory: the canonical rules DB in `rules/*.json` plus the `zero-slop scan` CLI as the runner (docs/MULTI_AGENT_SKILLS.md; packages/cli/src/commands/scan.ts). Each domain skill cites `rules/<domain>.json#<rule-id>` per check; any prescription without such a citation is out of scope (rules/README.md: extraction rule 1, no invented rules).

## Domain routing

| Signal in the draft | Invoke | Deterministic source |
|---|---|---|
| Word choice, rhythm, punctuation, filler openers, chat reply shape (negation framing, summary stamps, sycophancy) | `zeroslop-audit-prose` | `rules/prose.json#ZS-PROSE-001` (banned AI verbs), `rules/prose.json#ZS-PROSE-019` (em-dash cap), `rules/chat.json#ZS-CHAT-001` (negation-contrast), `rules/chat.json#ZS-CHAT-002` (filler phrases). Chat has no separate skill; it folds into prose (docs/MULTI_AGENT_SKILLS.md; rules/README.md) |
| Visual design: gradients, palettes, typefaces, kickers, bento layouts, motion | `zeroslop-audit-ui` | `rules/ui.json#ZS-UI-001` (indigo-violet gradient), `rules/ui.json#ZS-UI-002` (gradient headline text), `rules/ui.json#ZS-UI-015` (default typefaces) |
| Code smells: swallowed errors, type escapes, comment bloat, dead/speculative code | `zeroslop-audit-code` | `rules/code.json#ZS-CODE-003` (empty catch), `rules/code.json#ZS-CODE-008` (type-check suppression), `rules/code.json#ZS-CODE-010` (pass-through wrappers) |
| Commit subjects, PR descriptions, diff scope | `zeroslop-audit-commit` | `rules/commit.json#ZS-COMMIT-001` (conventional type enum), `rules/commit.json#ZS-COMMIT-005` (header length), `rules/commit.json#ZS-COMMIT-014` (emoji cap) |
| Contrast, focus, keyboard, hit targets, motion fallback | `zeroslop-audit-a11y` | `rules/a11y.json#ZS-A11Y-001` (text contrast 4.5:1), `rules/a11y.json#ZS-A11Y-006` (never remove focus outline), `rules/a11y.json#ZS-A11Y-010` (44px targets) |
| Numbers, testimonials, logos, citations, placeholders presented as real | `zeroslop-audit-integrity` | `rules/integrity.json#ZS-INTEGRITY-001` (invented multipliers), `rules/integrity.json#ZS-INTEGRITY-005` (fabricated testimonials), `rules/integrity.json#ZS-INTEGRITY-012` (vague citations) |
| Agent instruction artifacts: SKILL.md, AGENTS.md, CLAUDE.md, .cursorrules, subagent and command definitions that mis-trigger, bloat context, or break the frontmatter contract | `zeroslop-audit-skill` | `rules/skill.json#ZS-SKILL-001` (name field), `rules/skill.json#ZS-SKILL-007` (trigger phrase), `rules/skill.json#ZS-SKILL-012` (1000-token body), `rules/skill.json#ZS-SKILL-028` (definition of done) |
| CI manifests: GitHub Actions workflows and action manifests, `.gitlab-ci.yml`, CircleCI config, pre-commit config | `zeroslop-audit-config` | `rules/config.json#ZS-CONFIG-001` (floating ref), `rules/config.json#ZS-CONFIG-003` (untrusted context in `run:`), `rules/config.json#ZS-CONFIG-007` (secret in `run:`), `rules/config.json#ZS-CONFIG-015` (`continue-on-error`) |

When two domains match, invoke both; overlapping flags merge on rule ID, never on prose description (rules/README.md: deduplication rule).

## Constraints

- Body is goals plus constraints, never step-by-step railroading; calibrate prescriptiveness to fragility and state why, so the agent can decide in context (docs/MULTI_AGENT_SKILLS.md).
- Keep this file under 5000 tokens and push detail into domain skills and `references/`; agents load the body on activation and fetch the rest on demand.
- Frontmatter carries only `name` plus a trigger-first `description` answering "should I load this now", phrased as when-to-act.
- Frontmatter is a contract, not style: `name` 1–64 chars, lowercase alphanumerics plus single hyphens, equal to the directory; `description` non-empty, ≤1024 chars, third person imperative (`Use when…`); only spec-listed fields exist, so an unknown key is a hard error.
- Name by what the skill does — verb-first or gerund — never by the artifact, so an agent's search hits the action rather than the noun.
- Descriptions carry trigger conditions only, never a workflow summary: agents follow the summary instead of the body, doing one review where the body demanded two.
- Body budgets: <150 words for an always-loaded skill, <200 for a frequently loaded one, <500 for others, main `SKILL.md` under 500 lines — and under ~8 KB, where Codex hard-truncates the body.
- Cross-reference another skill by name with an explicit requirement marker; never `@`-link it, because `@` force-loads the file and burns context before the skill is needed.
- Ship a skill well-formed: directory name equals `name`, frontmatter opens and closes with `---`, and validation reports every missing required field in one error instead of failing on the first.
- Keep the shared body free of harness-only mandates; client-specific behavior belongs in client extensions, never here (docs/MULTI_AGENT_SKILLS.md).
- Quote the source's own threshold or pattern when one exists; never tighten or loosen a matcher from opinion (rules/README.md: extraction rule 3).

## Gotchas

- The CLI flagging a match is not a verdict on `warning`-tier rules; a deliberate, on-brief use survives triage, an unchosen default does not (rules/README.md; docs/ZERO_SLOP_FRAMEWORK.md).
- `semantic`-kind rules (e.g. `rules/a11y.json#ZS-A11Y-004`, contrast claims without computation) have no pattern to run; judging them from the draft alone without the rendered context is the most common false positive (rules/README.md).
- Chat-output shape (openers, closings, bullet decoration) routes to `zeroslop-audit-prose` via `rules/chat.json`, not to a chat skill; spinning up a separate chat audit duplicates the prose verdict (docs/MULTI_AGENT_SKILLS.md; rules/README.md).
- Thresholds that look improvable (em-dash cap `rules/prose.json#ZS-PROSE-019`, palette caps `rules/ui.json#ZS-UI-009`, PR caps `rules/commit.json#ZS-COMMIT-019`) are quoted from sources; re-deriving them per review invents rules (rules/README.md: extraction rules 1, 3).
- Dropping the `Gotchas` section or replacing it with generic advice ("handle errors appropriately") removes the highest-signal content in the file; gotchas stay in `SKILL.md`, not in a lazy-loaded side file.
- Overly comprehensive routing (covering every edge case inline) degrades activation; concise routing plus agent judgment outperforms exhaustive documentation.
