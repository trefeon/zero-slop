---
name: agentic-context
description: "Use when the context window is the binding constraint: what stays inline versus what moves to a file, size budgets for instruction files and tool output, spilling oversized results and paging them back, persisting plan and findings so compaction cannot erase them, layering instructions so the outer contract survives detail, or recovering when output quality drops mid-task."
---

# Agentic Context

Engineer what occupies the live window, and keep everything else one hop away.

## Goal

Hold exactly the context the current decision needs. Every artifact gets a size ceiling, every omitted detail stays reachable through a named path or query, and declining output quality triggers shrinking and reloading, not more context.

## Constraints

- Budget in measured units: tool schemas inflate two to three times after serialization, so ten moderate tools hold 5,000 to 8,000 tokens before the first message (`reference/agent-skills-for-context-engineering:skills/context-fundamentals/SKILL.md`).
- Instruction artifacts obey hard caps: 150 lines for AGENTS.md-class files, 500 lines and 1,000 words for a skill body (`rules/skill.json#ZS-SKILL-011`, `#ZS-SKILL-010`, `#ZS-SKILL-012`). The caps cover files, not sessions, so session budgets stay discipline.
- Raw evidence stays beside the run that consumed it (`reference/agent-skills-for-context-engineering:skills/filesystem-context/SKILL.md`).
- One writer per spill directory; concurrent appends corrupt state silently (filesystem-context).

## Inline versus file-backed

Inline what every turn needs, defer what the task needs once. Load names and one-line descriptions of the instruction set; bring in full text only when the task matches a description, converting a per-turn static cost into a per-task cost (filesystem-context, pattern 4). Depth that will not fit a body moves to `references/<topic>.md`, named from the body; the engine warns when a body inlines fifty lines or more (`rules/skill.json#ZS-SKILL-027`).

Loading every candidate at the first hint of relevance recreates the stuffing problem; partial loads leave gaps, so load an activated document whole (context-fundamentals). Aim under 2,000 lines of focused context per task; past 5,000 lines of non-task material, focus collapses (`reference/agent-skills:skills/context-engineering/SKILL.md`).

## Budgets and the blowout response

Allocate before starting: tool output 35%, history 30%, documents 20%, reserve 5 to 10%. Begin masking and compaction at 70% utilization, not past 85; a compactor under pressure drops goals and constraints. Mask resolved observations first, since tool output dominates agent trajectories. When a category blows its budget: mask resolved output, compact old turns, then partition into isolated contexts only when estimated task context exceeds 60% of the window and three or more subtasks exist (context-optimization). Targets keep the pass honest: compaction removes 50 to 70% of tokens with under 5% quality loss, and masking removes 60 to 80% of masked observations at under 2% impact; falling short means the pass did not work, and overshooting invites lost state.

## Long tool output: spill, then page

Above roughly 2,000 tokens, write the full output to a file and return a summary plus the path; the reference costs about 100 tokens, and the result stays searchable. Read back with pattern search and line-range reads, and check size first, since one careless read can pull 100,000 tokens into a turn (filesystem-context). While a failure is under diagnosis, keep error text inline; masking error output breaks the loop (context-optimization). The waste to kill: pasting a 500-line test log when one test failed (`reference/agent-skills:skills/context-engineering/SKILL.md`).

## Files as working memory

Plans and findings outlive the window only on disk. Write them on first use and re-read at phase boundaries to restore objective and progress after drift (filesystem-context, pattern 2). At a completed-task boundary, persist accepted scope, task status, changed files with working-tree state, verification commands and outcomes, and open risks for a restart (`reference/agent-skills:skills/context-engineering/SKILL.md`). Fix the schema at the first write; unstructured scratch pads erode across appends. Confirm a cached path still exists before reading it, and clear scratch at session end (filesystem-context).

## What survives compaction

Keep verbatim: file paths, identifiers, error codes, decisions, ruled-out options, next action. The artifact trail, which files were created, modified, or read, is the weakest dimension of compression benchmarks, so maintain a file-state index rather than trusting a summarizer (context-compression). Pull first-turn constraints into a durable preamble before the first compression cycle; early setup cannot be re-derived. After compaction, re-validate the summary against the current goal; a summary acquires false authority while its state ages (context-optimization).

An edit near the top forces re-processing of everything after it, so cost scales with the following text, not the edit size; batch edits and place them near the end (`reference/agent-skills-for-context-engineering:skills/self-managed-context/SKILL.md`).

## Layering and degradation

Order by stability: task contract and constraints at the top of the outermost artifact, active working material last. Models recall the edges of a long context better than the middle, where recall accuracy drops 10 to 40% (context-degradation). Keep one instruction altitude per layer; mixing rule altitudes in one section sends conflicting signals (context-fundamentals). Do not dilute the outer contract with detail belonging one layer down.

Degradation onset for complex retrieval sits near 60 to 70% of the advertised window and ends in a cliff, not a slope (context-degradation). Symptoms: instructions ignored, files re-read, tool choices drifting, stale values quoted back. Recovery: stop adding, find where bad state entered, truncate to before that point, reload verified material; corrections over poisoned context rarely take. Read fill from a provider-calibrated tokenizer and surface the number in results (self-managed-context).

## Not for

Durable knowledge across sessions belongs to agentic-memory. Authoring or restructuring an instruction artifact belongs to agentic-skill. Tool surface, permissions, and run observability belong to agentic-harness. Splitting work across agents belongs to agentic-delegate.

## Definition of done

- Every fact the task depends on is in the window or one named path or query away.
- No oversized tool result entered context unsplit; each spilled result has a file and summary.
- Plan, file-state index, and open risks exist on disk and were re-read after the last compaction.
- Instruction artifacts still pass their caps: the gate reports 0 errors.
- If quality dropped, the record shows a shrink-and-reload step rather than added context.
- Context utilization stayed below the degradation onset through completion.
