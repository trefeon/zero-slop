---
name: zeroslop-memory
description: "Use when knowledge must outlive the session: deciding what to persist from a finished task, recalling an earlier decision before starting (\"like last time\", \"we already settled this\"), correcting a record the repository now contradicts, scoping a fact to the project or the global store, or writing resume state for a handoff after compaction. Route live session-window context to zeroslop-context and instruction-file authoring to zeroslop-skill."
---

# zeroslop-memory

Memory is what outlives one context window. Three questions cover the job: should this survive, is what I recall still correct, and which store owns it.

## Goal
Leave durable knowledge a later session can act on without re-deriving it, and treat every recalled entry as a claim to re-check against the working tree. The shallowest store that answers retrieval needs is enough: a dated bundle of plain files is a legitimate memory system, and embeddings or validity intervals arrive only after a simpler layer fails.

## Constraints
- An entry is a claim with a subject, not a log of activity. Entries that restate code age like narrating comments (rules/code.json#ZS-CODE-027) and boilerplate documentation (rules/code.json#ZS-CODE-028): the code moves and the prose does not.
- Any fact whose value can change carries the date it was true; unchecked accumulation is the poisoning path, and consolidation invalidates an entry rather than discarding it.
- The global store stays tiny; a workaround filed globally is applied to the next unrelated project.
- The repository and the user's current instruction outrank a remembered fact. When they disagree, the repo is right and the entry is what needs fixing.
- Every pointer resolves: a path, symbol, or heading that no longer exists is a dead target (rules/integrity.json#ZS-INTEGRITY-030), and an artifact past its word budget loads on every trigger (rules/skill.json#ZS-SKILL-012).

## What earns a durable slot
Record the root cause of a non-obvious failure rather than the symptom first guessed, the convention discovered by reading the code and where it lives, a stated user preference, and a decision with the alternatives it beat. The test is the one an architecture decision record applies: code shows what, the record shows why and what was ruled out. The commit body is the cheapest durable record of that why, and a subject reporting activity instead of the change wastes it (rules/commit.json#ZS-COMMIT-021). Leave out command output, "fixed the bug", and anything a search of the repo answers. Link an entry that already exists instead of copying its text: a copy diverges in silence while a link follows the target. Failure mode: the store fills with activity, and no entry tells the next session what to do.

## Recall before you assume
Search memory when the request points at past work: "like last time", "we already decided", "the other repo". That trigger is also the behavioral test, and an answer from a blank slate has failed it. Confirm the claim against the working tree before the first edit, because pins move, files get deleted, and a decision can be superseded. Give entries the fields a query filters on (subject, scope, date) rather than relying on prose matching, which is how a knowledge base is scoped rather than read end to end. Empty results are normal: widen the query or the date range before concluding nothing was recorded, and do not stall the task on a failed memory write.

## Project scope versus global scope
Scope each entry to the smallest audience that needs it. Build commands, schema conventions, and the reason a deploy is shaped that way belong with the project, where its owners can correct them. Only cross-project preferences justify the global store. Where the repo already keeps decision records, follow the existing location, numbering, and headings rather than opening a second scheme.

## Facts in memory, conditionals in skills
Memory is a reference an agent consults; a skill is an instruction that fires on a trigger. "When the schema changes, run the migration twice" is a conditional and belongs in an instruction file, where it loads at the moment it applies. "Staging is read-only" is a fact and belongs in memory. Failure mode: a conditional filed as a passive note, so nothing fires when its condition arrives.

## Correct what the repo contradicts
When a recalled fact fails verification, fix it in the same session by writing a dated replacement that names what the old entry got wrong. Deleting it loses the reason for the reversal, and decision records are kept and referenced rather than removed when a decision changes. A pipeline that rewrites instruction text keeps the intent of what it changed.

## Handoff state lives in files
Before a task ends, or when context is nearly spent, write resume state to a file: what is done, the exact next action, the paths and commands that matter. Chat prose does not survive compaction or a fresh session, and an unfinished task restarts from zero without it.

## Not for
- One session's context budget, compaction, and what to hold in the live window: use `zeroslop-context`; this skill manages what survives after that window closes.
- Authoring the instruction files a memory points at, with frontmatter, trigger descriptions, and body budgets: use `zeroslop-skill`.
- Narrowing or reproducing a failure: use `zeroslop-debug`.

## Definition of done
- Each written entry states its subject, the fact, and the commit or date it was true at, and one lookup checks it against the repo.
- Memory was searched before the first edit whenever the request referenced earlier work.
- Superseded entries are marked and dated rather than deleted, and no live entry contradicts the working tree.
- An unfinished task has a state file naming its next action and the paths involved.
- Growth of the global store is justified as cross-project.
