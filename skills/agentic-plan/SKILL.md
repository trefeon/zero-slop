---
name: agentic-plan
description: "Use when a framed goal needs an execution shape: whether a plan is worth writing, slicing work into independently verifiable pieces, freezing shared interfaces, or ordering by dependency and risk before implementation begins."
---

# Agentic Plan

Turn a framed goal into an execution shape another agent can run without you.

## Goal

Produce the smallest artifact that makes execution unambiguous: a short plan of decisions, plus a runnable probe wherever a design choice is still a guess. Slice that plan so each slice proves itself before the next starts.

## Constraints

- A line that decides nothing is a gap, not a step; `rules/prose.json#ZS-PROSE-126` flags the verb-led forms, in your plan as much as in a skill body.
- Leave the goal alone: scope and acceptance criteria belong to agentic-frame.
- A plan longer than the code it describes has written the code instead (reference/superpowers:skills/writing-plans/SKILL.md). No rule gates plan length; `rules/skill.json#ZS-SKILL-012` measures this file, not a plan document.
- Assume the executor writes idiomatic code and reads only its own slice, so settle paths, names, signatures, and the values the goal fixes.

## Write the plan, or skip it

Skip it when one file has one obvious edit, when the goal already enumerates its own tasks, or when the session produces a decision rather than shipped code; spikes and throwaway prototypes sit outside the gates of reference/agent-skills:skills/constraint-driven-development/SKILL.md. Write it when two subsystems change together, when another session executes the work, or when two workers could invent one interface twice (reference/agent-skills:skills/planning-and-task-breakdown/SKILL.md).

Failure modes: a plan document for a one-line rename; three sessions implementing one interface from memory because nobody wrote its shape down.

## Cut the plan to decisions, then probe the risky part

Record what the executor cannot infer: files, each slice's consumed and produced interfaces, the test name and the command that proves it, the dependency order. Signature and test name suffice for a code slice; a body appears only where both leave the algorithm open (reference/superpowers:skills/writing-plans/SKILL.md).

Read it back against the goal before handoff: every requirement lands in a slice, names and types agree across slices, the document is proportionate (same file, self-review).

Where a mechanism is uncertain, run the probe and let its output replace the speculative paragraph. A design settled in prose reads as settled and is not.

Failure modes: a plan that transcribes every function body; a protocol designed by analogy.

## Slice so each slice proves itself

A slice is the smallest change carrying its own test cycle, small enough to earn a reviewer's gate; setup, config, and docs fold into the slice whose deliverable needs them (reference/superpowers:skills/writing-plans/SKILL.md).

Prefer vertical: one working path through the layers per slice. Horizontal layers (all schema, then all handlers, then all surfaces) leave nothing runnable until the end (reference/agent-skills:skills/incremental-implementation/SKILL.md).

After every slice the tree builds and the suite passes (same file). Change-size caps apply: `rules/commit.json#ZS-COMMIT-019` caps a pull request at 50 changed files, so a slice needing more is two slices.

Failure modes: a slice whose acceptance test arrives only in the last slice; a slice that changes behaviour nobody can observe yet.

## Pin the shared contract before parallel tracks open

For any two slices touching one interface, write its shape first: names, parameters, return types, error cases. That is what makes tracks independent rather than merely concurrent (reference/agent-skills:skills/planning-and-task-breakdown/SKILL.md; reference/agent-skills:skills/incremental-implementation/SKILL.md).

Each slice carries a Consumes and Produces line, which is how its executor learns neighbouring names without reading the neighbour's work (reference/superpowers:skills/writing-plans/SKILL.md). A pre-flight read of the plan is where disagreeing Consumes and Produces lines surface (reference/superpowers:skills/executing-plans/SKILL.md).

While workers run, take the work only you can do: read the first slice's diff, run the contract test, write the next brief, settle an interface conflict when it appears.

Failure mode: `clearLayers()` in one slice, `clearFullLayers()` in another, found at integration; the plan's cross-slice type check exists to catch that.

## Sequence by dependency and risk

Order bottom-up through the dependency graph: schema, types, handlers, surfaces (reference/agent-skills:skills/planning-and-task-breakdown/SKILL.md).

Put the riskiest unknown first, so its failure lands before the rest is built on it (reference/agent-skills:skills/incremental-implementation/SKILL.md lists high-risk work early as fail-fast).

Directory order, file counts, and what is easiest to describe are not reasons to sequence anything; split by responsibility, never by technical layer (reference/agent-skills:skills/planning-and-task-breakdown/SKILL.md).

Failure mode: integration risk discovered in the last slice, after four slices were built against a guess about the data crossing the boundary.

## Scale rigor to the blast radius

Ask what a mistake costs, then pick the process. A comment or docs change gets the repo scan and a review; a wire protocol, migration, or shared config change gets a contract test, a compatibility note, and a rollback plan (reference/agent-skills:skills/constraint-driven-development/SKILL.md).

Reuse the bar the project already wrote down: where a constraint exists, the slice's evidence is that constraint's command; where no number exists, record today's value and hold it (same file, on ratchets).

Failure modes: full ceremony on a typo fix; none on a payload shape two services parse.

## Not for

With the goal, its acceptance criteria, or the scope boundary still open, agentic-frame comes first. Splitting the plan across agents and slice ownership are agentic-delegate's, which takes the sliced plan as input. Proving slices ran is agentic-verify; a slice failing for an unexplained reason goes to agentic-debug.

## Definition of done

- Every file to create or modify is named, or the skip decision is recorded.
- Every goal requirement maps to a slice; every slice names its test and command, or says which surface has no test.
- Cross-slice names and types agree; shared interfaces precede the slices that consume them.
- Each slice carries one line of reason for its place, and leaves the tree building green inside the change-size caps.
- Another agent starts slice one from the document alone, with no question about a name or path.
