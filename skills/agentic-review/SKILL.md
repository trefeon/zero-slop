---
name: agentic-review
description: Use when judging a diff or pull request before merge, when preparing your own change for review, or when answering review feedback. Fires on "review this PR", "is this ready to merge", "address the review comments", "split this change", and any request to approve or reject someone else's code.
---

# Agentic Review

Judging a change on its own evidence: the diff read directly, probed for defects a consumer would feel, handed over small enough to finish in one pass, answered with verified findings.

## Goal

A verdict that survives scrutiny: approve, or findings naming the axis, the file and line, and the consequence the next caller hits. Approving hunks you cannot name is a rubber stamp (`reference/agent-skills:skills/code-review-and-quality/SKILL.md`).

## Constraints

- Read the diff, not the summary; descriptions state intent while hunks state what changed.
- Give the reviewer a base commit, a head commit, and the requirement text; session history makes them grade your reasoning instead of the artifact (`reference/superpowers:skills/requesting-code-review/SKILL.md`).
- Label severity per finding, so the author knows what blocks (`reference/agent-skills:skills/code-review-and-quality/SKILL.md`).
- Run `zero-slop scan` and `zero-slop gate` over the changed paths first; findings cite themselves (`rules/code.json#ZS-CODE-035`, `rules/commit.json#ZS-COMMIT-023`, `rules/config.json#ZS-CONFIG-015`). Surface shapes belong to the engine; whether an invariant still holds is yours.

## Read the diff at its stated range

File list first, then hunks. A summary claiming "adds validation to the upload path" over a diff that also rewrites retry backoff hides a second, unreviewed change; a hunk whose reason is invisible from the diff is an unexplained deviation to name in the verdict. Behavior the requirement is silent on is graded by what a reasonable user expects, since spec silence is not permission (`reference/superpowers:skills/requesting-code-review/code-reviewer.md`).

## Probe the axes that carry consumer-visible bugs

| axis | inspect for | rule |
|---|---|---|
| correctness | the stated requirement, plus one input the change does not mention | ZS-CODE-035 |
| boundaries | validation at the untrusted edge only, never re-validated inside | ZS-CODE-026 |
| invariants | a silent fallback or cast that erases an unclear invariant | ZS-CODE-008 |
| error paths | empty catch, default-on-catch, log-and-continue | ZS-CODE-001 |
| precedence | generic handler before specific, new branch ahead of an existing guard | ZS-CODE-050 |
| tests | would the suite go red if a condition the change adds were inverted | ZS-CODE-030 |
| dead weight | wrappers, clones, single-implementation abstractions, tombstones | ZS-CODE-021 |

Boundaries: validate where untrusted data enters, then trust internal code (`reference/agent-skills:skills/api-and-interface-design/SKILL.md`). A second check on an already-validated type is noise (ZS-CODE-026); a new edge without one is a defect.

Invariants: error text and field ordering are already depended on, so a change to observable behavior is a contract change needing a sentence saying so.

Precedence: a generic handler ahead of a specific one swallows the specific case, and a branch added before an existing guard changes which rule wins (ZS-CODE-050).

Tests: invert one added condition, run the suite, restore the file; a mutation that stays green names a missing test case.

Dead weight: what this change obsoletes leaves with it, tombstones included (ZS-CODE-021, ZS-CODE-059); code merely noticed elsewhere gets listed, not deleted.

## Ship a diff a reviewer can finish

One logical change per diff; a refactor plus new behavior is two, and a commit subject admitting both is the tell (ZS-COMMIT-025). A hundred changed lines reads in one sitting, three hundred for one logical change; the ceiling is fifty files or a thousand added lines (ZS-COMMIT-019, ZS-COMMIT-023). Self-contained means the description carries what and why (ZS-COMMIT-020); evidence attached means the command and its output, not a claim about them (ZS-CODE-035).

## Answer review feedback with evidence

Verify each suggestion against the codebase first; the reviewer may hold less context than you (`reference/superpowers:skills/receiving-code-review/SKILL.md`). For "implement this properly", grep for a caller: no caller means removal, not implementation. One unclear item pauses the batch, since items tend to be related; work blocking first, then trivial, then structural, testing each fix rather than batching them.

Reject with the artifact that settles it: the covering test, the compatibility constraint, the caller needing the current shape. Once the owner rules, the argument is over (`reference/agent-skills:skills/code-review-and-quality/SKILL.md`). Failure modes worth naming: "all comments addressed" with one silently rejected, implementing before understanding, relitigating a settled point next round.

## Delete tests that pin incidental behavior

A behavior change ripples into assertions on details nobody depends on; bumping the expectation keeps the coupling and hides the delta. Delete the assertion and write the case that names the consumer-visible contract and fails against the old code. Delete on sight:

- module mocking that replaces the unit under test (ZS-CODE-052)
- assertions on mock call counts or invocation shape (ZS-CODE-030)
- placeholder and duplicate assertions (ZS-CODE-031)
- expectation bumps and whole-object snapshots that break on an unrelated new field
- tests of code the change deleted, kept for coverage (ZS-CODE-021)

Keep it when a consumer reads the value, when ordering is a documented guarantee, or when inverting the changed condition turns it red.

## The merge gate

Four conditions, each checked; none assumed. Verification steps ran with nothing permitted to fail (ZS-CONFIG-015, ZS-CONFIG-017) and the gate exits clean. A verdict exists at a stated range with findings labelled. Evidence is attached, including a regression case that fails before and passes after. One owner integrates; the reviewer stays read-only (`reference/superpowers:skills/requesting-code-review/code-reviewer.md`), and that owner re-runs the gate after any post-review edit, since an approval carried across three later commits belongs to a diff that no longer exists.

## Not for

- Branch and PR mechanics: `agentic-git`.
- Author-side proof that work is done: `agentic-verify`.
- Wrong behavior that needs a cause found: `agentic-debug`.
- Deterministic slop findings on the diff or its message: `slop-audit-code`, `slop-audit-commit`.

## Definition of done

- The verdict names the diff range reviewed, the requirement graded against, and each finding's axis, file and line, severity, and consequence, highest-leverage first.
- One added condition was inverted, and a suite that stayed green is reported as a gap; no incidental assertion survived, and every deliberate behavior change has a test that fails on the old code.
- Dead weight the change created is deleted in the same diff and listed in the description.
- The gate prints zero errors over the changed paths, with all four merge-gate conditions checked and one integrator named.
