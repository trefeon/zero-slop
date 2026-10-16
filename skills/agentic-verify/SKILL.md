---
name: agentic-verify
description: Use when about to claim work is complete, fixed, or passing, or when picking the evidence that proves a change works - run the artifact instead of reading it, try the input that should break it, separate a behavior test from an incidental one, and state the surface the check actually exercised. Fires before any completion claim, commit, pull request, or handoff, and whenever a bug fix needs a failing-before and a passing-after path.
---

# Agentic Verify

Prove a claim with a run made in this session, then cut it down to the surface that run touched.

## Goal

Decide whether finished work is finished, and report it with evidence a sceptical reviewer can re-run: the command, its output, and the boundary of what it covered. Scope is proof, not debugging or diff review.

## Constraints

- Evidence is output from running something now: a command result, test summary, browser interaction, log line, or trace. Reading code, an earlier run, and an agent's success report are hypotheses about the artifact, not proof of it (`rules/code.json#ZS-CODE-035`).
- Every claim carries one check and the surface it exercised. Where a surface has no reachable check, name the part left unexercised and what would exercise it (`rules/skill.json#ZS-SKILL-028`).
- A sentence a command could have backed is a claim, so write it after the command runs; unsourced confidence is already a finding (`rules/integrity.json#ZS-INTEGRITY-029`, `rules/code.json#ZS-CODE-067`).
- Never state a command ran when the transcript does not show it, and never quote remembered output. An admitted gap costs a sentence; invented evidence costs trust in every other line.
- Phrase results as what was exercised, not what was intended: `gate prints 0 errors on skills/agentic-verify`, not "the gate passes". Corpus law: `NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE` (`reference/superpowers:skills/verification-before-completion/SKILL.md`).

## Run it before trusting the read

Reading `if (user.id === owner)` shows the author's intent, not what the query returns. Start the process, call the entry point, build the bundle, open the page, and let the real dependency answer. Two failures recur: a plausible code read presented as a working feature, and a check run before the last edit, which no longer describes the file on disk.

## Match the evidence class to the surface

Each surface admits one kind of proof. Command-line and library work: output plus exit status. HTTP work: the request and response pair, or a captured trace. Interface work: the failing interaction performed in a browser. Background work: the job record or the log line at that timestamp; a write, by reading the row back. A screenshot proves layout, not persistence; a handler unit test proves the handler, not the route.

When a surface cannot be exercised here (production credentials, a device, a third-party console), record it as unverified and name the check that would settle it. Source discipline is blunt: `Anything that could not be verified is explicitly flagged as unverified` (`reference/agent-skills:skills/source-driven-development/SKILL.md`).

Copies and forwarding paths deserve extra suspicion: a relocated dependency, a relay that forwards, a config copied from another environment, a consumer bound to a new queue. A test whose transport is a fake exercises the fake, so only an end-to-end run against the real broker, store, or proxy shows the wiring exists (`reference/superpowers:skills/test-driven-development/writing-good-tests.md`). Mock below the thing you changed, never at the seam you changed.

## Bug work needs a failing-before and a passing-after

A green suite after a fix proves the suite is green. Observe the failure first: keep or write the reproduction, run it against the unfixed code (stash the change, or check out the parent revision), watch it fail for the stated reason, apply the fix, watch that same check pass (`reference/agent-skills:skills/test-driven-development/SKILL.md`). A test written after the fix that never failed has unknown reach, and a pass that never entered the broken branch is decoration. Proof is that pair of runs.

## Falsify the happy path

A confirmation run tells you the path you designed for works. Attempt the input that should break it: empty payload, wrong tenant, duplicate submission, boundary value, resumed job, second concurrent call. `Find what is wrong with this artifact` yields a different answer than asking whether something looks right (`reference/agent-skills:skills/doubt-driven-development/SKILL.md`). Record the result either way: an input that fails is a finding, one that survives is the evidence you quote.

## A test that pins incidental behavior is not verification

Judge a test by the production change it would catch (`reference/superpowers:skills/test-driven-development/writing-good-tests.md`). One that fires only when a constant, a message string, a log line, or private structure changes sleeps through real bugs. One that asserts a fake was called while collaborators are stubbed proves scaffolding (`rules/code.json#ZS-CODE-030`). Module-level mocking replaces the seam the application really uses (`rules/code.json#ZS-CODE-052`), and an expectation computed with the code under test passes whatever that code does. Rewrite it around observable behavior, or delete it.

## Report the exercised scope

Close with the run, its output, and the delta from the request. Unrun parts stay visible, named with the reason. Words such as should, probably, seems, and works weaken a claim a run could carry (`rules/code.json#ZS-CODE-067`). Verified outcomes get specific: `0 errors on skills/agentic-verify`, not "looks good". When a check fails, report the failure and its output; partial progress survives review, while a green claim collapses on the first rerun.

## Not for

Diagnosing why a check fails is `agentic-debug` (reproduce, narrow, bisect). Judging whether a diff is worth merging, or preparing it for review, is `agentic-review`. Deciding what the task should be is `agentic-frame`; ordering the work is `agentic-plan`.

## Definition of done

- Every claim is paired with a command run in this session, plus its observed output.
- Bug work shows the reproduction failing before the fix and the same check passing after.
- At least one falsification input was attempted, with its result recorded.
- The report names the surfaces not exercised, each with its reason.
- A reviewer can re-run each listed command, see the same output, and revert the fix to watch the listed check fail again.
- Engine mapping: `rules/skill.json#ZS-SKILL-028` fails an instruction artifact with no verification section; `rules/code.json#ZS-CODE-035` fails a delivered design never run. No rule can tell whether a chat claim was backed by a run.
