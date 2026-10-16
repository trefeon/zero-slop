---
name: zeroslop-skill
description: Use when authoring or rewriting an instruction artifact before it ships, such as a SKILL.md, AGENTS.md, command file, or subagent definition, including "write a skill for X", "make this workflow reusable", description and trigger rewrites, and turning a repeated process into a compiled skill.
---

# zeroslop-skill

Compile a repeated workflow into the smallest instruction artifact that fires at the right moment and changes behavior once it loads.

## Goal

The artifact earns its context when a model that never saw the conversation still acts correctly, so the deliverable is a routing condition plus the decisions the model cannot derive alone. Grading an artifact after the fact belongs to the audit family; this skill covers producing and proving it. Deterministic checks live in `rules/skill.json` (ZS-SKILL-007 routing, ZS-SKILL-012 budget, ZS-SKILL-028 verification); run the repository gate over the skill directory before calling it done.

## Constraints

- Body budget: under 500 lines and 1000 words (ZS-SKILL-010, ZS-SKILL-012); longer material moves into `references/<topic>.md`.
- Every non-obvious claim carries a rule id from `rules/` or states its threshold outright; thresholds are quoted, not invented.
- A quoted example of a banned pattern stays inside backticks, which the scanner treats as code.
- Machine-written artifacts share a fingerprint: shouted imperatives (ZS-SKILL-013), railroading (ZS-SKILL-014), cadence mandates (ZS-SKILL-015), placeholders (ZS-SKILL-020), version pins (ZS-SKILL-022), incident narratives (ZS-SKILL-023), emoji bullets (ZS-SKILL-030).

## Frontmatter is the install contract

- Two keys, `name` and `description`; optional fields stay unused unless a client requires one. A name that mismatches its directory, or carries uppercase or a double hyphen, breaks registry installs (ZS-SKILL-006).
- Frontmatter values interpolate no command or template token, since those execute when the artifact loads (ZS-SKILL-004). The file is prose plus pointers, nothing runnable at discovery time.
- Failure mode: setup instructions in the description, so the always-loaded listing line becomes an instruction to run something.

## The description is the routing decision

- A client loads only `name` and `description` for every installed skill; the body arrives when the description matches the task.
- Write the trigger, not the workflow: the description names only when to use, never what the artifact does, and ZS-SKILL-008 fails a description that reads as a process.
- Open with `Use when` and name the moment (ZS-SKILL-007), then add the words a real user would type plus the near miss that must stay out; stay inside the 1024-character cap (ZS-SKILL-009).
- Erring toward pushy is correct: more trigger contexts, not an outline of the body.
- Failure mode: "Use when working with skills" names no moment, so nothing routes to it.

## Spend the body on what the model lacks

- Spend the body on what the agent would not know without the artifact. Explaining what a diff is spends load-time context on training data.
- Progressive disclosure: the body is the core path, `references/` holds the long tables and per-domain variants, and the pointer names the moment to read each file. Keep references one level deep, since agents preview nested files instead of reading them.
- A long fenced dump inline is a budget leak (ZS-SKILL-027); bundle it and cite the file.
- Failure mode: a body that restates a sibling's checklist instead of naming it. Two files ruling on one point drift apart (ZS-SKILL-029).

## Write for the outcome, leave the route open

- Calibrate prescriptiveness to fragility: match the level of specificity to the task's fragility and variability.
- A stage script for judgment work locks in an order that does not matter (ZS-SKILL-014); a fixed update cadence or numeric output ceiling is followed literally and starves reasoning (ZS-SKILL-015).
- Instructions outlive models: state the observable outcome and the check that proves it, keep version pins out (ZS-SKILL-022), and describe capabilities rather than one client's tool vocabulary (ZS-SKILL-025).
- Failure mode: a mandated interim status line yields narration, while a definition of done with an exit condition yields a finished artifact.

## Claim a boundary before writing a line

- Pick a coherent unit: skills scoped too narrowly force several to load for one task, while broad ones become hard to activate precisely.
- Name in `## Not for` the sibling that owns the adjacent decision, the way a phase map sends each task to exactly one skill.
- Overlap is a defect even when both bodies are correct, because the duplicates load together and drift (ZS-SKILL-029).
- Failure mode: a description whose triggers are a superset of a sibling's, so both load and the model picks by wording order.

## Test the artifact before shipping

- Baseline first: run the task without the skill, watch the agent fail, and document the exact failures, so the body answers those failures instead of imagined ones.
- Near misses carry the signal: they are the most valuable negative cases, since they test precision rather than breadth.
- A rewrite is a new artifact: rerun the baseline prompt and the near-miss set after any edit.
- Repo-native exit: `zero-slop gate <skill-dir>` runs this domain's rules. ZS-SKILL-028 fails an artifact that never says how the result is checked; ZS-SKILL-005 fails a pointer into a file that does not exist.

## Not for

- Auditing an existing artifact's frontmatter, budget, or prose: use `zeroslop-audit-skill`.
- Session context mechanics (what is loaded, what spills over, how compaction is survived): use `zeroslop-context`.
- Planning or splitting the work the artifact describes: use `zeroslop-plan` or `zeroslop-delegate`.

## Definition of done

- Frontmatter holds exactly `name` and `description`; the name matches its directory, and the description opens with `Use when` and names the moment.
- Body is under 500 lines and 1000 words, with needed overage moved into `references/`, one level deep.
- Baseline behavior without the skill was observed, and the near-miss set behaves after the last edit.
- Every non-obvious claim cites a rule id from `rules/skill.json` or states its threshold outright.
- `zero-slop gate` over the skill directory prints zero errors.
