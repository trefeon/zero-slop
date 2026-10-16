---
name: zeroslop-loops
description: "Use when a task repeats or runs long: chartering a loop's objective, budget, and stop condition, checkpointing so an interrupted run resumes, spotting drift when the loop is busy while its acceptance check stays red, deciding what escalates to a human, choosing an unattended or interactive posture, supervising workers with heartbeats and deadlines, or gating a self-improvement loop on a baseline and a hold-out split."
---

# zeroslop-loops

One decision: continue as chartered, change the strategy, or stop.

## Goal

Carry a task across many cycles without losing the objective, the budget, the state, or the authority to stop. The cycles are strategy; charter and ledger are the loop.

## Constraints

- Charter first: objective, budget in three currencies, stop condition, and what the loop may do unasked.
- The binding numbers live in the runtime: a budget stated once decays as context grows, so re-inject remaining budget and verified progress from outside.
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

Budget exhaustion is not success: a cut run returns its strongest verified artifact plus the exact remaining gap, labeled incomplete. Return conditions state a property of the artifact, not confidence or elapsed effort, which a stalled loop reports most fluently. Failure mode: a report that reads as finished because the clock ran out.

## Checkpoints and resume

Treat the filesystem as the state machine: an output file per stage marks it complete, so a resumed run restarts from the first missing artifact. Externally kept ledgers of verified progress rescue long runs that prompt-only control abandons. Resume with the shape you launched, or behaviour drifts across restarts. Failure mode: state living only in the window, so a compaction repeats a cycle that was never idempotent. Durable knowledge is `zeroslop-memory`'s.

## Drift

Drift means busy while the acceptance check has not moved. Four checks, run without reading the transcript:

- acceptance red while cycle count and cost rise;
- diffs per cycle empty or trivial while the summary claims progress, since flat metrics cannot separate convergence from a degenerate loop;
- progress reported with no artifact written this run;
- a metric under its monitored threshold, 0.85 warning and 0.70 critical.

On drift, change one strategy or stop; a bigger budget only buys slower drift. Record the change beside its evidence.

## Escalation and posture

Stop for a human when one of these holds, each readable from the ledger:

- the same failure signature appears a second time; return a bounded recall with the failed checks and a retry cap;
- the next action is destructive or irreversible: deletion, history rewriting, publishing, deploys; each evolved change goes through a reviewed PR, never a direct commit;
- the call is taste, not measurement: evaluator changes, expanding the editable surface, promoting a harness, abandoning a direction.

Posture sets the permitted list: an interactive run asks early; an unattended run ends with a queued question on anything the charter omits. Risk-tier the threshold per action class, and rehearse mutations in a dry-run.

## Supervising workers

Over hours, waiting is not supervision. Hold a heartbeat per worker, a done signal that is an artifact plus its check, and a per-slice deadline.

- A timeout is a failure result, not a pause: a timed-out test run is recorded as a failed constraint.
- Reap a worker past its deadline, keeping its partial artifacts; chase one gone quiet inside its deadline, since silence looks like a crash.
- Ask which checks ran, with their raw output, not for narration about liveness.

One fan-out belongs to `zeroslop-delegate`; this skill owns loops containing several.

## Self-improvement loops

A loop that edits its own harness needs three things first:

- a measured baseline on the judged split, baseline and evolved scores stored side by side;
- a hold-out split the proposer never sees, refreshed before the loop can overfit it;
- an acceptance rule rejecting a candidate that gains on the visible split while losing on the hold-out, plus a rejection log.

Keep the evaluator, its instrumentation, and budget enforcement outside every surface the loop can edit; prompt-stated constraints get edited away, visible scorers monkey-patched. Judge from raw logs, and cross-check the metric against human judgment on a cadence, since a loop optimizes the number it is given, not the outcome. No baseline, no hold-out, no loop.

## Not for

- Slicing work across children for one batch, and reviewing what returns: `zeroslop-delegate`.
- Shaping the goal, or the plan a loop consumes: `zeroslop-frame`, `zeroslop-plan`.
- Proving a finished artifact, or diagnosing an unexplained failure: `zeroslop-verify`, `zeroslop-debug`.
- Permissions, sandbox, tool surfaces, run-time observability: `zeroslop-harness`.
- What survives across sessions: `zeroslop-memory`.

## Definition of done

- Charter names objective, budget, stop, and allowed actions, with a predicate a command decides.
- A fresh process resumes from disk state: finished artifacts, live strategy, budget left.
- Progress is apart from activity, every number traced to an artifact written this run; a cut run labeled incomplete with its gap.
- A repeated failure, a destructive next action, or a taste call stopped the loop for a human.
- Every worker had a heartbeat and a deadline; timeouts are recorded failures.
- A self-improvement run has a baseline, a hold-out split, and a rejection log, evaluator outside the edited surface.
