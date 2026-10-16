---
name: agentic-harness
description: Use when designing or changing the environment an agent runs in, such as tool names and schemas, permission and sandbox posture, credential or network scope, local versus hosted runtime constraints, what a finished run logs, or how a harness change gets measured. Also when an agent routes to the wrong tool, cannot recover from a tool error, or a permission decision is being made by intuition rather than evidence.
---

# Agentic Harness

The harness is everything the model does not write: the tools it may call, what they may touch, where the process runs, and what the run leaves behind. Design each piece as a contract with an unreliable caller, since a loose harness produces failures no prompt can repair.

## Goal

Name the failure each harness decision prevents and the evidence it produces. A change lands when a run that failed on the old environment passes on the new one.

## Constraints

- The corpus sources here are design guidance rather than checks, and no zero-slop rule validates a tool schema or a sandbox policy; where one reaches the same failure, it is named in place.
- A prompt cannot grant or revoke a permission, so behaviour that has to hold every time belongs in code rather than in an instruction the model may skip.
- Harness work moves the ground under every existing evaluation, so measure on one frozen task set, before and after, with model and harness version recorded.

## Split the work: harness or prompt

| Harness owns | Prompt owns |
| --- | --- |
| Tool names, parameter schemas, formats, defaults | Which tool fits a hard-to-classify request |
| Filesystem, network and credential scope, approval gates | Asking for approval, explaining a skipped step |
| Timeouts, retries, response truncation, output size | Summarising output the harness already truncated |
| Run log: tool calls, arguments, status, tokens, cost | Tone, style, task-specific procedure |

Apply the split test: delete the sentence from the prompt and re-run. Changed behaviour means that sentence was compensating for a harness which should own it.

## Tool interface

One purpose per tool, because an agent picks by comparing descriptions and two tools sharing an activation scenario produce selection errors. Verb-noun names, one parameter name per concept across the catalog, then a typed schema with constraints and defaults covering the common case (`reference/agent-skills-for-context-engineering:skills/tool-design/SKILL.md`).

An error is a recovery instruction, not a status word. It names the argument that failed, the shape required, and the next attempt worth making; the fast-agent brand rules state the target directly, `Run failed: provider timed out.` against a bare `failed` (`reference/fast-agent/design/fast-agent-system:readme.md`). Generic or context-free messages are rule-checked in authored code: `rules/code.json#ZS-CODE-043` (generic or empty messages) and `rules/code.json#ZS-CODE-047` (message without change context). Whether a failure is retryable belongs in the schema, not in a retry loop the agent improvises.

Response size is a design parameter too: return key fields by default and the full object on request, otherwise the agent spends its window on tool output it will not read.

## Permissions and sandbox posture

Start read-only and grant per capability: writes confined to one workspace, network to named hosts, credentials scoped to the task and expiring with it. Escalation is explicit and logged, never inferred from task wording. CI-shaped configuration reaches the same failures, so its checks double as the review list (`rules/config.json#ZS-CONFIG-006`, `#ZS-CONFIG-007`, `#ZS-CONFIG-008`, `#ZS-CONFIG-010`).

Irreversible actions such as merge, deploy, delete and spend sit behind human approval, and preparing one is not performing it. The corpus surface classes make that split concrete: locked, editable, append-only, human-controlled (`reference/agent-skills-for-context-engineering:skills/harness-engineering/SKILL.md`).

## Local and hosted runtimes

A local run inherits the developer's filesystem, credentials and session history, while a hosted sandbox gets a prebuilt image, a timeout, disposable state and no memory of yesterday. Decide how a session starts, what is snapshotted, how long it may run, and how output leaves before teardown (`reference/agent-skills-for-context-engineering:skills/hosted-agents/SKILL.md`). Extracting the branch, artifacts and log before the sandbox dies is part of the design, since a timeout that loses the work is a harness defect rather than bad luck.

Secrets arrive per session from a scoped source and stay out of prompts, image layers and log lines.

## Observability of a run

Log events with a stable name and machine-readable fields, carrying a run id plus the entry point that started the run, because a job reachable from a scheduler, a webhook and a manual invocation leaves interchangeable lines once that field goes missing (`reference/agent-skills:skills/observability-and-instrumentation/SKILL.md`).

The harness passes when a later re-run explains the earlier failure without anyone reading the transcript. Record each tool call with arguments and status, tokens and cost per step, wall time, resolved configuration, and the model and harness version, because a number without them is unreadable a month later (`reference/fast-agent/design/fast-agent-system:readme.md`).

## Measure the change

Write the question, freeze the task set, run the current harness, then change one thing and run the same set. Keep the change when the targeted failure disappears and nothing else regressed, revalidating with both the old and the new evaluator (`reference/agent-skills-for-context-engineering:skills/harness-engineering/SKILL.md`). A harness defended by the anecdote that motivated it keeps the tool overlap which caused the routing errors.

## Not for

- Choosing what work goes to which agent: `agentic-delegate`.
- Context budget, transcript mechanics, compaction survival: `agentic-context`.
- Secret handling and untrusted-content hygiene in the agent's own workflow: `agentic-secure`.
- Proving a change works, regression evidence, falsification: `agentic-verify`.
- Auditing an instruction artifact for slop: `slop-audit-skill`.

## Definition of done

- Every tool in the catalog has a distinct activation scenario, and any two matching one request have been merged.
- The default posture is read-only, and each additional permission appears both in code and in the run log.
- A failed run can be reconstructed from its log alone: entry point, run id, each tool call with arguments, and cost.
- One number exists for the change, measured on the same frozen task set, with model and harness version recorded.
