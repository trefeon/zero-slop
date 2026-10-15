---
name: zero-slop
description: Audit AI-generated copy, UI, code, commits, accessibility, or credibility for generic slop tells. Use when reviewing docs, pages, diffs, commit messages, PRs, or landing pages for unchosen defaults, when asking whether a diff is sloppy, before committing, when gating a merge on slop, or when unsure which slop domain applies.
---

# Zero-slop (universal router)

## Goal

Decide whether a draft reads as an unchosen model default and route to the one domain reference that owns the verdict. This skill never audits directly; it triages and delegates. A flagged pattern is slop only when no human chose it on purpose — a deliberate, brief-backed use survives triage, an unchosen default does not.

## Deterministic layer

Run `zero-slop scan` against the canonical rules DB in `rules/*.json` first; treat every hit as a candidate, never a verdict. Every finding cites `rules/<domain>.json#<rule-id>`; any prescription without such a citation is out of scope. Quote the source's own threshold or pattern when one exists; never tighten or loosen a matcher from opinion.

## Without the CLI

When `zero-slop scan` is not installed in the current harness, work the routing table manually: load the one matching `references/<domain>.md`, apply its checks by quoting each threshold verbatim, and cite `rules/<domain>.json#<rule-id>` exactly as the output template demands. A manual pass judges the same way — the CLI only automates candidate flagging, never the verdict. Install the runner with `npx -y zero-slop@latest scan .` when the harness allows npm execution.

## Tier discipline

Tiers come from the rules DB schema: `error` means always fail; `warning` means fail only when the match is an unchosen default; `info` means consistency and hygiene. `semantic`-kind rules carry no runnable matcher and are triage-only — they need agent judgment against the rendered draft, never a CLI hit alone.

## Domain routing

| Signal in the draft | Deterministic source |
|---|---|
| Word choice, rhythm, punctuation, filler openers, chat reply shape (negation framing, summary stamps, sycophancy) | `rules/prose.json#ZS-PROSE-001` (banned AI verbs), `rules/prose.json#ZS-PROSE-019` (em-dash cap), `rules/chat.json#ZS-CHAT-001` (negation-contrast), `rules/chat.json#ZS-CHAT-002` (filler phrases). Chat has no separate reference; it folds into prose. Read references/prose.md when the signal is wording, rhythm, or chat shape. |
| Visual design: gradients, palettes, typefaces, kickers, bento layouts, motion | `rules/ui.json#ZS-UI-001` (indigo-violet gradient), `rules/ui.json#ZS-UI-002` (gradient headline text), `rules/ui.json#ZS-UI-015` (default typefaces). Read references/ui.md when the signal is seen or laid out. |
| Code smells: swallowed errors, type escapes, comment bloat, dead or speculative code | `rules/code.json#ZS-CODE-003` (empty catch), `rules/code.json#ZS-CODE-008` (type-check suppression), `rules/code.json#ZS-CODE-010` (pass-through wrappers). Read references/code.md when the signal is in a diff. |
| Commit subjects, PR descriptions, diff scope | `rules/commit.json#ZS-COMMIT-001` (conventional type enum), `rules/commit.json#ZS-COMMIT-005` (header length), `rules/commit.json#ZS-COMMIT-014` (emoji cap). Read references/commit.md when the signal is a commit message, PR title, or PR description. |
| Contrast, focus, keyboard, hit targets, motion fallback | `rules/a11y.json#ZS-A11Y-001` (text contrast 4.5:1), `rules/a11y.json#ZS-A11Y-006` (never remove focus outline), `rules/a11y.json#ZS-A11Y-010` (44px targets). Read references/a11y.md when the signal is a barrier for keyboard, screen-reader, or low-vision users. |
| Numbers, testimonials, logos, citations, placeholders presented as real | `rules/integrity.json#ZS-INTEGRITY-001` (invented multipliers), `rules/integrity.json#ZS-INTEGRITY-005` (fabricated testimonials), `rules/integrity.json#ZS-INTEGRITY-012` (vague citations). Read references/integrity.md when the signal is a credibility claim. |

When two domains match, load both; overlapping flags merge on rule ID, never on prose description.

## Output template

Report each finding as:

- **Finding:** one sentence naming the pattern and where it appears.
- **Cite:** `rules/<domain>.json#<rule-id>` plus the quoted threshold.
- **Verdict:** slop (unchosen default) or intentional (brief-backed reason kept).
- **Fix:** delete, fold into the existing helper, or replace with a token change — minimal, no invented replacement content.

Report every finding verdict-first: each line is a verdict, a finding with `path:line`, or a check you ran — no preamble, no process narration, no closing summary. Source: reference/obra/superpowers:skills/subagent-driven-development/task-reviewer-prompt.md.

## Gotchas

- The CLI flagging a match is not a verdict on `warning`-tier rules; a deliberate, on-brief use survives triage, an unchosen default does not.
- `semantic`-kind rules (e.g. contrast claims without computation) have no pattern to run; judging them from the draft alone without the rendered context is the most common false positive.
- Chat-output shape routes to prose via `rules/chat.json`; spinning up a separate chat audit duplicates the prose verdict.
- Thresholds that look improvable are quoted from sources; re-deriving them per review invents rules.
- When two domains flag the same text, merge on rule ID — overlapping prose descriptions are not double counts.
- Prefer deletion or a token change over a redesign; never invent replacement copy, stats, testimonials, or logos to "fix" a section.
- Quote-or-drop: every finding cites `path:line`, and numbers you did not compute from the transcript are invented — a claim without a resolvable citation is deleted, not argued (Source: reference/obra/superpowers:skills/diagnosing-superpowers/SKILL.md).
- A subagent's or implementer's self-report is an unverified claim: a green self-assessment never upgrades a verdict and never substitutes for the diff (Source: reference/obra/superpowers:skills/subagent-driven-development/task-reviewer-prompt.md).
- Keep tooling meta-commentary out of the deliverable — a report states what was found, not which pass produced it; engine health belongs in diagnostics (Source: reference/mvanhorn/last30days-skill:skills/last30days/SKILL.md).
