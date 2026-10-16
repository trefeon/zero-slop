---
name: agentic-loops
description: "Use when a task repeats or runs long: chartering a loop's objective, budget, and stop condition, checkpointing so an interrupted run resumes, spotting drift when the loop is busy while its acceptance check stays red, deciding what escalates to a human, choosing an unattended or interactive posture, supervising workers with heartbeats and deadlines, or gating a self-improvement loop on a baseline and a hold-out split."
---

# agentic-loops

One decision: continue as chartered, change the strategy, or stop.

## Goal

Carry a task across many cycles without losing the objective, the budget, the state, or the authority to stop. The cycles are strategy; charter and ledger are the loop.

## Constraints

- Charter first: objective, budget in three currencies, stop condition, and what the loop may do unasked (`reference/agent-skills-for-context-engineering:skills/long-horizon-prompting/references/task-brief-template.md`).
- The binding numbers live in the runtime: a budget stated once decays as context grows, so re-inject remaining budget and verified progress from outside (`reference/agent-skills-for-context-engineering:skills/long-horizon-prompting/references/research-evidence.md`).
- Append to state mid-cycle, so a killed cycle still leaves a ledger of what exists.
- Acceptance criteria are fixed input; rewriting them mid-run optimizes a different task.
- Deterministic layer: `rules/skill.json` scores instruction files a loop rewrites (ZS-SKILL-028 wants their definition of done), `rules/commit.json` its commits (ZS-COMMIT-020), `rules/config.json` a red step about to be swallowed (ZS-CONFIG-015). Budgets and drift carry no rule id.

## The charter

Six lines, in a file the loop reads at each cycle boundary:

```text
objective   the artifact that must exist, plus the command or check that proves it
budget      tokens, iterations, wall clock; name which cut ends the run
stop        the success predicate over the artifact; report shape for a cut run
allowed     actions taken without asking; everything else waits for a human
state       the progress ledger this loop appends to
return      where the artifact and the gap report are written
```

Budget exhaustion is not success: a cut run returns its strongest verified artifact plus the exact remaining gap, labeled incomplete (`reference/agent-skills-for-context-engineering:skills/long-horizon-prompting/references/task-brief-template.md`). Return conditions state a property of the artifact, not confidence or elapsed effort, which a stalled loop reports most fluently. Failure mode: a report that reads as finished because the clock ran out.

## Checkpoints and resume

Treat the filesystem as the state machine: an output file per stage marks it complete, so a resumed run restarts from the first missing artifact (`reference/agent-skills-for-context-engineering:skills/project-development/SKILL.md`). Externally kept ledgers of verified progress rescue long runs that prompt-only control abandons. Resume with the shape you launched, or behaviour drifts across restarts (`reference/agent-skills-for-context-engineering:skills/long-horizon-prompting/references/vendor-guidance.md`). Failure mode: state living only in the window, so a compaction repeats a cycle that was never idempotent. Durable knowledge is `agentic-memory`'s.

## Drift

Drift means busy while the acceptance check has not moved. Four checks, run without reading the transcript:

- acceptance red while cycle count and cost rise;
- diffs per cycle empty or trivial while the summary claims progress, since flat metrics cannot separate convergence from a degenerate loop (`reference/agent-skills-for-context-engineering:skills/self-improvement-loops/SKILL.md`);
- progress reported with no artifact written this run (`reference/agent-skills-for-context-engineering:skills/long-horizon-prompting/SKILL.md`);
- a metric under its monitored threshold, 0.85 warning and 0.70 critical (`reference/agent-skills-for-context-engineering:skills/evaluation/SKILL.md`).

On drift, change one strategy or stop; a bigger budget only buys slower drift. Record the change beside its evidence.

## Escalation and posture

Stop for a human when one of these holds, each readable from the ledger:

- the same failure signature appears a second time; return a bounded recall with the failed checks and a retry cap (`reference/agent-skills-for-context-engineering:skills/long-horizon-prompting/references/task-brief-template.md`);
- the next action is destructive or irreversible: deletion, history rewriting, publishing, deploys; hermes routes each evolved change through a reviewed PR, never a direct commit (`reference/hermes-agent-self-evolution:README.md`);
- the call is taste, not measurement: evaluator changes, expanding the editable surface, promoting a harness, abandoning a direction (`reference/agent-skills-for-context-engineering:skills/self-improvement-loops/SKILL.md`).

Posture sets the permitted list: an interactive run asks early; an unattended run ends with a queued question on anything the charter omits. Risk-tier the threshold per action class (`reference/agent-skills-for-context-engineering:skills/long-horizon-prompting/references/vendor-guidance.md`), and rehearse mutations in a dry-run.

## Supervising workers

Over hours, waiting is not supervision. Hold a heartbeat per worker, a done signal that is an artifact plus its check, and a per-slice deadline.

- A timeout is a failure result, not a pause: hermes records a timed-out test run as a failed constraint (`reference/hermes-agent-self-evolution:evolution/core/constraints.py`).
- Reap a worker past its deadline, keeping its partial artifacts; chase one gone quiet inside its deadline, since silence looks like a crash.
- Ask which checks ran, with their raw output, not for narration about liveness (`reference/agent-skills-for-context-engineering:skills/long-horizon-prompting/SKILL.md`).

One fan-out belongs to `agentic-delegate`; this skill owns loops containing several.

## Self-improvement loops

A loop that edits its own harness needs three things first:

- a measured baseline on the judged split, baseline and evolved scores stored side by side (`reference/hermes-agent-self-evolution:evolution/skills/evolve_skill.py`);
- a hold-out split the proposer never sees, refreshed before the loop can overfit it (`reference/hermes-agent-self-evolution:evolution/core/dataset_builder.py`);
- an acceptance rule rejecting a candidate that gains on the visible split while losing on the hold-out, plus a rejection log (two-split gate in `reference/agent-skills-for-context-engineering:skills/self-improvement-loops/SKILL.md`).

Keep the evaluator, its instrumentation, and budget enforcement outside every surface the loop can edit; prompt-stated constraints get edited away, visible scorers monkey-patched. Judge from raw logs, and cross-check the metric against human judgment on a cadence, since a loop optimizes the number it is given, not the outcome (`reference/agent-skills-for-context-engineering:skills/evaluation/SKILL.md`). No baseline, no hold-out, no loop.

## Not for

- Slicing work across children for one batch, and reviewing what returns: `agentic-delegate`.
- Shaping the goal, or the plan a loop consumes: `agentic-frame`, `agentic-plan`.
- Proving a finished artifact, or diagnosing an unexplained failure: `agentic-verify`, `agentic-debug`.
- Permissions, sandbox, tool surfaces, run-time observability: `agentic-harness`.
- What survives across sessions: `agentic-memory`.

## Definition of done

- Charter names objective, budget, stop, and allowed actions, with a predicate a command decides.
- A fresh process resumes from disk state: finished artifacts, live strategy, budget left.
- Progress is apart from activity, every number traced to an artifact written this run; a cut run labeled incomplete with its gap.
- A repeated failure, a destructive next action, or a taste call stopped the loop for a human.
- Every worker had a heartbeat and a deadline; timeouts are recorded failures.
- A self-improvement run has a baseline, a hold-out split, and a rejection log, evaluator outside the edited surface.
