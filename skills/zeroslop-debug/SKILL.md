---
name: zeroslop-debug
description: "Use when behavior is unexplained, wrong, or newly broken: a failing test, a stack trace, a regression in something that worked yesterday, a build error, or a bug report filed against code that used to behave. For the moment of diagnosis, before any fix is proposed."
---

# Zeroslop Debug

Turn an unexplained failure into a named cause, a kept reproduction, and a check that fails without the fix.

## Goal

End with the cause identified at its source, the failing path confirmed by execution, and a regression check that fails on the pre-fix revision. A theory about why something breaks counts only once the failure reproduces and the output is read from the artifact that failed, and every finding cites its own line.

## Constraints

- Stop adding features and capture the raw output the moment something unexpected appears: stop the line, then fix the line.
- One change per attempt, since a batch of edits cannot tell you which one moved the result.
- Keep the reproduction: a script, fixture, or recorded payload beside the test, so the failure outlives the session.
- A claim about causation needs an observation behind it, meaning a log line, a stack frame, or a diffed request. Anything else is a hunch.
- Instrumentation added while diagnosing comes out before the change ships.

## Reproduce before you theorise

The failure has to happen on demand before an editor opens: name the command, the input, and the environment, and treat a second identical failure as the bar. With no reproduction, add boundary instrumentation (what enters each layer, what leaves it) and run once to see which layer breaks. Failure mode: "works on my machine" or "the test is probably wrong" accepted as a diagnosis, and the same report returns next week.

## Read the failure, then confirm the path that runs

Read the whole message: exception type, file, line, and every frame between the throw and the boundary. Then confirm which path the failing input executes, because a lookalike helper with the same name is the usual decoy. A log line at the candidate function's entry, or the stack frame itself, settles it. Failure mode: the edit lands in code the failing input never reaches, the suite stays red, and the change looks blameless. The shipped form is already checkable: `rules/code.json#ZS-CODE-035`.

## Bisect the axis that actually varies

Name what changed before bisecting: a commit, an input shape, a dependency, an environment value, or a gate outside your control. Bisect that axis and no other. Commits: drive the focused failing check through `git bisect run`. Inputs: shrink the payload until the smallest still-failing case is left. Environment: run the failing case where it passes and diff the two. Remote gate: probe the boundary with a minimal request, so your payload is distinguishable from the gate rejecting it. Failure mode: bisecting commits when the data changed, or shrinking an input that was never the variable. Record the axis and the eliminated range: a null result there is information.

## One hypothesis, with a stated expectation

Write the hypothesis with a prediction attached: "the parser drops the trailing field, so a two-field payload fails where a one-field payload passes." State the expected result before running, so a surprise is visible.

Stop rule for hypotheses: when two consecutive checks contradict the current one, abandon it and return to the reproduction carrying what they eliminated. A third variation of a dead hypothesis is guessing with extra steps; one that survives only by generating a fresh explanation each attempt is the architecture saying your model of the system is wrong.

Stop rule for fixes: a second failed fix attempt, or the same error reappearing after a fix, ends local work. Hand the reproduction, the observations, the eliminated axes, and both attempts to the supervisor or user, and ask which direction to take before editing again. Failure mode: a third fix layered onto an unverified second one, which buries the cause.

## Fix the cause, keep the check that fails without it

Separate the cause from where it manifests. Deduplicating rows in a view is a symptom fix; the join that emits duplicates is the cause. A wider catch, a retry, a default returned on failure, or a special case for the failing input all suppress the symptom; apply one only where the user asked for it, and name the failure it hides. The engine flags those shapes in shipped code: `rules/code.json#ZS-CODE-001`, `#ZS-CODE-002`, `#ZS-CODE-003`, `#ZS-CODE-038`, `#ZS-CODE-050`.

Leave a regression check that fails on the pre-fix revision and passes after, asserting observable behaviour rather than mock call counts (`rules/code.json#ZS-CODE-030`, `#ZS-CODE-052`); a test written after the fix and never watched failing proves nothing. Where the bug renders or crosses a network, confirm the fix in the real runtime and compare console and request payloads before and after. Keep unrelated refactoring out of the fix; it destroys the evidence that the fix changed the result.

## Not for

- Proving finished or in-flight work with fresh evidence: use `zeroslop-verify`.
- Judging a diff's quality or naming once the fix exists: use `zeroslop-review`.
- Turning a failure class into a gate that prevents it, or tuning performance with no correctness failure behind it.

## Definition of done

- The failure reproduces on demand from a kept artifact, and that reproduction still fails on the pre-fix revision.
- The cause is one sentence long, points at the path the failing input executes, and rests on an observation.
- Every attempt after the first was a single change with a written expectation; abandoned hypotheses record the axis they eliminated.
- The regression check fails without the fix and passes with it, the suite and build pass afterward, and the original scenario is confirmed end to end.
- Symptom suppressions remain only where the user asked for one, and the report names them.
