---
name: zeroslop-frame
description: "Use when a raw request arrives and no work has started: state the goal in one sentence, acceptance as observable outcomes, the exclusions, and whether the repo can answer the ambiguity or the user must."
---

# Zeroslop Frame

Purpose: turn a request into a frame another agent can execute without re-reading the request.

## Goal

Deliver a short frame the requester can correct line by line: outcome, acceptance, constraint, out of scope, deliverable. Everything downstream consumes it. `zeroslop-plan` sequences it, `zeroslop-delegate` splits it, `zeroslop-verify` proves it. An unwritten frame gets re-answered on every turn.

## Constraints

- Read the repo before reframing: stack, test runner, patterns, and config answer most of what the request leaves open. Never ask what you can read.
- Assume only what the frame declares. A requirement the request never made and the repo does not imply is fabricated, the state `rules/integrity.json#ZS-INTEGRITY-029` names.
- Size the frame to the ask: a quick request needs a goal line and acceptance criteria, not a design document. Even the smallest frame keeps its acceptance criteria.
- When the requester asked for speed, frame silently and label the assumptions instead of interviewing; a speed request has already opted out of the scaffolding.
- Nothing in `rules/` scores a goal sentence, an acceptance criterion, or a scope list; a reader checks the frame. Mechanical checks arrive later, in the domain file judging the deliverable (`rules/skill.json`, `rules/commit.json`, `rules/config.json`, `rules/code.json`); `rules/skill.json#ZS-SKILL-028` gives the exit list below its shape.

## State the goal in one sentence

Write the outcome as one sentence naming who benefits: `<caller> can <do something> after <change>`. If it will not compress, you hold a feeling rather than a goal: that is a vibe, not a decision.

Then make acceptance observable. Each criterion names a command with an exit code, a file that must exist, a rendered state, or behavior a caller can trigger; acceptance turns "Make the dashboard faster" into a load target on a named connection.

Failure modes: a criterion that restates the implementation, such as add a retry helper; one built from a word like scalable, with no number attached; one only the author can check. When every criterion on offer is a convention word, ask what the requester would actually want if they did not have to justify it to anyone.

## Separate the ask from invented scope

List what the request names, then what you are about to do. Anything in the second list that the first does not cover is invented scope, even when it is good engineering: retries, input validation, telemetry, a flag, a refactor of a file you touched. Move it to the out-of-scope list with a reason.

That list is arguably the most valuable part of the frame, and it carries anti-goals: what would make this a failure even if it technically works.

Failure modes: a "while I'm here" edit that doubles the diff; a validation layer that changes behavior the request specified.

## Decide ask-versus-proceed on ambiguity

Sort each open point into a pile: the repo answers it through config, convention, docs, or tests, so resolve it and cite the file; a default the requester could reject, so pick it and say it is your call; or outcomes that differ materially, so ask one question with your guess attached.

With no reachable user, apply the default, mark it as yours, and flag the third pile for a human.

Failure modes: batching questions instead of interviewing; asking for a fact the lockfile states; keeping a guess a repo file contradicts. "Whatever you think is best" is delegation, not a decision: offer two concrete options.

## Name what is out of scope

Write the exclusions, one reason each. The line is non-negotiable: half of misalignment is silent disagreement about what is not being built. Name the neighbor a colleague would assume is included; excluding the whole product does nothing.

Failure modes: skipping the list because the goal reads obvious; writing the list after the code, so it describes what got built.

## Pick the smallest deliverable

Name the smallest artifact that makes the acceptance criteria checkable: one edited file, one function, one command, or a throwaway probe for a design question still open. The bar is the simplest version that still solves the real problem.

If the work grows mid-task, stop, say so, and step up a size instead of absorbing the growth. A probe that works is not the deliverable; keeping it is a new request.

Failure modes: designing for the size the work might reach; a seam or flag added for a caller that does not exist; a probe promoted to the production path without a reframe.

## Not for

- Sequencing or slicing the framed work: `zeroslop-plan`.
- Splitting the frame across agents: `zeroslop-delegate`.
- Evidencing that the framed work is finished: `zeroslop-verify`.
- Explaining behavior that is already wrong: `zeroslop-debug`.
- Writing the frame into a durable instruction file or skill: `zeroslop-skill`.
- A request that already carries goal, acceptance, and boundaries: go to `zeroslop-plan`.

## Definition of done

- Five lines or fewer: goal, acceptance, constraint, out of scope, deliverable.
- Every acceptance criterion names something a reader can observe or run, and none names an internal state.
- Each assumption resolved without asking carries its evidence: a file, a config value, or a convention in the repo; unresolved points are flagged for a human.
- Every planned item traces to the request, and everything the request did not name sits in the out-of-scope list.
- The last line hands off one next move: sequence it, split it, or prove it.
