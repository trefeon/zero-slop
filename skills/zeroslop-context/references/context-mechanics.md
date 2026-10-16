# Context mechanics

Numbers and mechanisms behind the budget decisions in SKILL.md, kept out of the body to leave room under its caps.

## Attention and capacity

Attention computes n-squared pairwise relationships, which puts effective capacity below the nominal window; the curve ends in a cliff rather than a slope. Middle positions lose 10 to 40 percent recall accuracy against the edges. Degradation onset for complex retrieval runs near 60 to 70 percent of the advertised window; in RULER-style testing, half of the models claiming 32K-plus context held up at that length. A single distractor document triggers a step-function performance drop, not a linear one. Needle-in-haystack scores do not predict multi-fact work. Character heuristics drift: English prose runs near four characters per token, code two to three, paths and non-English text lower still.

## Budget arithmetic

- Category budgets: tool outputs 35 percent, message history 30 percent, retrieved documents 20 percent, reserve 5 to 10 percent.
- Mask after three or more turns once key points are extracted; never mask the newest turn, active reasoning chains, or error output while something is being debugged.
- Compaction triggers at 70 to 80 percent utilization, targets 50 to 70 percent token reduction, and holds quality loss under 5 percent. Past 70 percent reduction is the point to audit for lost state.
- Cache layout orders stable content first: system, tool definitions, templates, history, current query. One whitespace change in the prefix invalidates every cached block after it. A 70 percent hit rate is the target, worth roughly 50 percent cost and 40 percent latency reduction on cached tokens.
- Partition when estimated task context passes 60 percent of the window; break-even needs three or more subtasks because each sub-agent carries its own prompts.

## Compression quality

Method comparison from one benchmark: anchored iterative summarization at 98.6 percent compression with 3.70 quality, regenerative summaries at 98.7 percent with 3.44, opaque compression at 99.3 percent with 3.35. The benchmark scores quality on six dimensions, and the artifact trail (which files were created, modified, or read) separates methods best while ranking as the weakest dimension. Probe types that test survival: recall, artifact, continuation, decision. Favor tokens per task over tokens per request, and treat re-fetch frequency as the quality signal. Tool definitions and schemas bypass compression entirely; a single summarized parameter name can break tool use. A three-phase workflow compresses a five-million-token codebase to roughly 2,000 words of specification before implementation starts.

## Edit costs under prefix caching

Prefix caching reuses computation up to the first changed token, which makes an edit cost the text that follows it rather than the text it removes. Three operating rules follow: batch edits, avoid compacting a small early region under a long useful tail, and write a generous replacement since the tail is re-prefilled anyway. Budget readouts belong to the runtime, because models estimate their own context length poorly; the urgent band is sized from the largest recent tool output rather than a fixed percentage. After overflow, rollback names the commands whose output caused it, and deepens further when the model ignores the rollback repeatedly. A pinned prefix and role folding keep model-written notes from claiming system authority. Measure prefix-reuse compute against accuracy, never context length against accuracy.

## Offload arithmetic

- A result near 2,000 tokens is the spill point; below it, returning it directly is cheaper than the file round trip.
- An 8,000-token result becomes a reference costing about 100 tokens, with the whole text still greppable.
- Read back with a pattern search plus a few lines of context (`grep -A 5` style), or with line-range reads.
- One read without a size check can inject 100,000 tokens into a single turn.
- Keep raw evidence under the run that consumed it, for example `runs/<run-id>/sources/evidence/raw/`.
- Scratch retention is age-based or count-based, enforced at session boundaries.

## Session boundaries

Start trimming at 75 percent of the window rather than at the limit, because attention has already fragmented by the time the window fills. Aim under 2,000 lines of focused context per task; past 5,000 lines of non-task-specific material, output degrades. The loading hierarchy, most persistent first: rules file, spec, task files, error output, history. Before leaving a session at a task boundary, persist the accepted scope and decisions, the task status and next task, changed files with working-tree state, verification commands and outcomes, and unresolved questions. In the fresh session, re-run verification whenever the recorded baseline is missing or the code has moved.

## Cross-agent transfer

Written summaries and file handoffs stay the portable default for moving context between agents. Latent transfer, compacting an orchestrator trajectory inside a worker's KV cache, earns its cost when the runtime owns that cache, and it fails outright when the two models differ in tokenizer or attention layout.
