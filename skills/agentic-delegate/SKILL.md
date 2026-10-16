---
name: agentic-delegate
description: "Use when work moves to another agent: deciding whether a slice is worth handing off, cutting self-contained slices with disjoint file ownership, writing the child's brief and context contract, fanning independent children out in one batch, coordinating them while they run, and reviewing their output before integrating."
---

# agentic-delegate

One decision: this slice goes to a fresh agent, or it stays in this context.

## Goal

Split a framed goal into slices a fresh child can finish alone, hand each child only the context it needs, and integrate what returns.

## Constraints

- A child inherits none of your conversation: everything it needs appears in its brief, which stays under one screen, and artifacts cross as paths rather than pastes, since a pasted report stays resident in your context all session (`reference/superpowers:skills/subagent-driven-development/SKILL.md`).
- Slices own files, not activities; two live writers on one file is a conflict you chose.
- The top-level plan stays here; a child receives a finished slice, with the goal and acceptance fixed.
- A child spawns no children of its own, so the fan-out you designed is the one that runs (`reference/superpowers:skills/subagent-driven-development/SKILL.md`).

## Does delegation pay

Delegation buys a clean context window plus wall-clock overlap: N independent items issued together finish near the slowest, not the sum. It costs a brief you must write, a child that cannot ask mid-flight questions, a review pass over what returns, and multiples of a single-context run; past three to five agents, coordination outgrows throughput (`reference/agent-skills-for-context-engineering:skills/multi-agent-patterns/SKILL.md`).

Keep single-edit work, work that needs the conversation you already had, slices not yet describable, and briefs as long as the job. A lossy handoff costs more than the job, because paraphrase loses fidelity at each hop (`reference/agent-skills-for-context-engineering:skills/multi-agent-patterns/SKILL.md`).

## Slice design

Each slice carries one outcome, one owner, a closed file set, and a stated interface. State the interface before the work when two slices meet: what A produces (signature, schema, path, event) and what B consumes. If that sentence will not form, the cut is wrong.

Shapes worth re-cutting:
- overlapping writes, or one child editing a file a sibling reads in order to test
- a slice whose acceptance test belongs to another slice
- a shared rename or type change split across children, which is one slice

Related symptoms belong in one slice: fixing one often fixes the rest (`reference/superpowers:skills/dispatching-parallel-agents/SKILL.md`). No engine rule scores the cut itself; `rules/skill.json` governs the brief's form.

## The brief a child needs

1. Goal line, plus where the slice sits in the wider change.
2. Contract: interfaces, exact signatures, constants, values verbatim, decisions already made by siblings.
3. Its slice: the files it owns and the change.
4. Acceptance: the observable result and the exact command or check that proves it.
5. Non-goals: files to leave alone, behaviour to preserve.
6. Return shape: status, artifact paths, one-line evidence, open concerns.

Write the brief to a file and point at it; a child reads its task, not the whole plan (`reference/superpowers:skills/subagent-driven-development/SKILL.md`).

## Fan-out and isolation

Issue every independent child in one batch. One per turn serializes work that had no dependency (`reference/superpowers:skills/dispatching-parallel-agents/SKILL.md`). Serialize only a real dependency, where B consumes the artifact A produces. Give each writer its own worktree or branch, so a half-finished sibling edit cannot break a neighbour's build; read-only scouts may share a checkout (`reference/superpowers:skills/subagent-driven-development/SKILL.md`).

## While children run

Stay on local work: ledger updates, packaging the next review, reading reports. Wait in bounded stretches, then post one status line, chase any child that finished without reporting, and after compaction trust that record and the git log over your recollection (`reference/superpowers:skills/subagent-driven-development/SKILL.md`). Prefer one shared artifact every child reads and appends over relaying messages between children, since message-passing degrades through paraphrase (`reference/agent-skills-for-context-engineering:skills/multi-agent-patterns/SKILL.md`).

## Reviewing children before integrating

A report is a claim: read the diff it names (`reference/superpowers:skills/dispatching-parallel-agents/SKILL.md`). Check it meets its acceptance, touched only its own files, did not widen scope, and does not collide with a sibling's edits. Land everything, then run the combined check once. Findings return to the same child as a scoped fix plus scoped re-review, not a fresh start (`reference/superpowers:skills/subagent-driven-development/SKILL.md`). Send the diff to `agentic-review` for the review axes.

## Not for

- Sequencing slices and contract-first ordering for one agent: `agentic-plan`.
- Long-run supervision, budgets, checkpoints, and drift across cycles: `agentic-loops`.
- Unverified claims about the merged result: `agentic-verify`.

## Definition of done

- Every child returned a status, paths, and evidence; any silent one was chased.
- Each slice's acceptance check ran once against the merged tree, not trusted from the report.
- No file has two writers, and overlapping edits are resolved.
- A ledger names each slice, owner, and outcome, so a compacted controller resumes.
- Work kept here is recorded as a deliberate choice.
