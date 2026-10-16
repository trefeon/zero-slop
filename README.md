# zero-slop

The standard for agentic AI work: a rule engine that scans what agents produce, and a skill library that governs how they work.

<p>
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt=MIT>
  <img src="https://img.shields.io/badge/node-%3E%3D22-3c873a" alt=Node22>
  <img src="https://img.shields.io/github/actions/workflow/status/trefeon/zero-slop/ci.yml?branch=main" alt=CI>
</p>

zero-slop applies 570 rules across 9 domains and reports each hit with a severity tier. It needs no configuration to start. Alongside the engine it ships 23 portable Agent Skills: 13 that teach the agentic workflow (framing, planning, delegation, context, verification, debugging, review, git, security, memory, skill authoring, harnesses, loops), 9 that audit a finished artifact against the rule database, and 1 router that picks the pack for a request; every pack passes the repo's own scanner and the Agent Skills spec validator.

## Install

Requires Node.js 22 or newer. The CLI is not on the npm registry yet, so run it from a clone:

```bash
git clone https://github.com/trefeon/zero-slop
cd zero-slop
corepack pnpm install
corepack pnpm build
node packages/cli/dist/index.js scan .
```

The skills install today, straight from this repo:

```bash
npx skills add trefeon/zero-slop -g
```

Publishing is wired in `.github/workflows/publish.yml` and runs on a `v*` tag.

## What it catches

The rule database holds 570 rules in 9 domains. Every rule has a tier (error, warning, info), a source attribution, and pass/fail fixtures.

| Domain | Rules | What it checks |
| --- | --- | --- |
| prose | 155 | banned AI vocabulary, punctuation caps, sentence rhythm, hedging, markdown hygiene |
| ui | 141 | gradient defaults, palette cliches, typography, motion and layout budgets |
| code | 74 | swallowed exceptions, type escapes, comment bloat, generic error envelopes |
| commit | 34 | conventional commit format, subject casing, header length, body layout |
| integrity | 33 | invented stats, unsourced percentages, fake social proof, unlabeled placeholders |
| a11y | 49 | contrast thresholds, focus visibility, keyboard support, hit targets |
| chat | 34 | negation framing, filler openers, summary-stamp closings, answer-first shape |
| skill | 31 | instruction-file frontmatter contract, context budgets, railroading, missing definition of done |
| config | 19 | floating action refs, script injection, secret exposure, masked failures in CI manifests |

Example hits per domain:

### prose

Banned vocabulary, punctuation caps, and sentence rhythm.

```text
We leverage the framework to streamline deployment.    # leverage: banned verb (ZS-PROSE-001)
This is a testament to our commitment.                 # testament: metaphorical noun (ZS-PROSE-003)
```

### ui

Gradient defaults, palette cliches, typography, and motion budgets.

```html
<button class="bg-gradient-to-r from-indigo-500 to-purple-600">Upgrade</button>   <!-- ZS-UI-001 -->
<h1><span class="bg-clip-text text-transparent bg-gradient-to-r">Ship faster</span></h1>  <!-- ZS-UI-002 -->
```

### code

Swallowed exceptions, type escapes, and comment bloat.

```ts
try {
  await pushUser(id);
} catch (error) {
  logger.warn(error);          // ZS-CODE-001: log-and-continue catch
}
const data = JSON.parse(body) as any;   // ZS-CODE-008: type escape
```

### commit

Conventional commit format, subject casing, and header length.

```text
foo: some message      # ZS-COMMIT-001: type outside the enum
fix: Some message      # ZS-COMMIT-004: subject in sentence case
```

### integrity

Invented stats, fake social proof, and unlabeled placeholders.

```text
10x faster than the old system    # ZS-INTEGRITY-001: invented multiplier
Trusted by 10,000+ teams          # ZS-INTEGRITY-003: fabricated social proof
```

### a11y

Contrast, focus, keyboard, and hit targets.

```text
color: #999 on a white background    # ZS-A11Y-001: contrast below 4.5:1
outline: none;                       # ZS-A11Y-006: focus outline removed
```

### chat

Negation framing, filler, and summary-stamp closings.

```text
It's not about intelligence, it's about taste.   # ZS-CHAT-001: negation-contrast framing
In summary, this is a solid approach.            # ZS-CHAT-003: summary-stamp closing
```

### skill

Instruction-file contract, context budgets, and procedure railroading.

```text
description: Audits the repository and then reports findings.   # ZS-SKILL-008: workflow summary instead of a trigger
You MUST always follow these 12 steps in order.                 # ZS-SKILL-014: step-by-step railroading
```

### config

CI trust, secret exposure, and masked failures.

```text
uses: some/action@main                       # ZS-CONFIG-001: floating branch ref
run: echo "title ${{ github.event.issue.title }}"   # ZS-CONFIG-003: untrusted context in run:
continue-on-error: true                      # ZS-CONFIG-015: masked failure
```

## Usage

All four commands share one set of options.

```text
zero-slop scan [path]     Scan a directory tree
zero-slop check <file>    Scan a single file
zero-slop gate [path]     CI gate: one-line summary, exits 1 on findings at or above --fail-on
zero-slop report [path]   Summary by domain and tier
```

Omit `[path]` to scan the current directory. The report command always exits 0.

Options:

```text
-c, --config <file>    Config file (default: zero-slop.json)
--json                 Machine-readable JSON output
--fail-on <tier>       Exit 1 on findings at or above this tier (error, warning, info; default: error)
--max-findings <n>     Max findings reported per rule (default: 50)
-d, --domain <domain>  Restrict scanning to one domain. Repeatable.
--no-color             Disable colored output
```

Examples:

```bash
zero-slop gate . --fail-on warning
zero-slop scan docs/ -d prose --json
zero-slop check src/app.tsx
```

JSON output has the shape `{tool, version, scanned, findings, summary}`. Each finding carries `ruleId, domain, tier, title, message, evidence, file, line, column, count`.

Domains run per file type:

```text
.md, .mdx, .txt                     prose, chat, integrity
SKILL.md, AGENTS.md, CLAUDE.md, .cursorrules, commands/*, agents/*   skill
.github/workflows/*.yml, action.yml, .gitlab-ci.yml, .pre-commit-config.yaml   config
.html, .jsx, .tsx, .vue, .svelte, .astro   ui, a11y, code
.css, .scss                         ui, a11y
.ts, .js, .py                       code
```

The scanner skips the directories listed in `exclude` and reports nothing for unrecognized extensions.

## The workflow library

Thirteen `zeroslop-*` skills cover the decisions an agent makes on a task. Each owns exactly one decision, names the sibling to use instead, cites the rule ids or repo files behind its claims, and passes the repo's own scanner.

| Skill | Fires when |
| --- | --- |
| zeroslop-frame | a request needs framing first: goal, acceptance criteria, scope boundary |
| zeroslop-plan | the goal is fixed and the execution shape is open: slices, contracts, ordering |
| zeroslop-delegate | work splits across agents: slice design, context contracts, isolation |
| zeroslop-context | the window is the constraint: budgets, progressive disclosure, files as memory |
| zeroslop-verify | work claims to be done: evidence classes, falsification, regression proof |
| zeroslop-debug | behavior is wrong or unexplained: reproduce, narrow, bisect, root cause |
| zeroslop-review | a diff needs judgment: review axes, receiving review, merge gate |
| zeroslop-git | workspace and history: worktrees, branches, commits, PR flow |
| zeroslop-secure | secrets and supply chain: approval gates, scanning, untrusted content |
| zeroslop-memory | knowledge must outlive the session: what to save, where, when to distrust it |
| zeroslop-skill | authoring an instruction artifact: frontmatter, triggers, budgets, testing |
| zeroslop-harness | the agent's environment: tool design, permissions, hosted runtimes, observability |
| zeroslop-loops | work runs over time: budgets, stop conditions, drift, escalation |

The audit family is the other half: `zeroslop-audit*` judges a finished artifact against `rules/*.json` and reports findings with a tier, and the `zeroslop` router routes both families. The full catalog is in `skills/README.md`.

## Before and after

A prose line:

```text
Before: We leverage a robust framework to seamlessly elevate your workflow.
After:  We use a framework that runs the job.
```

A code block:

```ts
// Before: the failure never reaches the caller
try {
  await pushUser(id);
} catch (error) {
  console.error(error);
}

// After: the error is logged with context and rethrown
try {
  await pushUser(id);
} catch (error) {
  console.error({ error, id });
  throw error;
}
```

## Configuration

zero-slop runs with no config file. Add zero-slop.json to change the defaults:

```json
{
  "minTier": "info",
  "failOn": "error",
  "domains": ["prose", "ui", "code"],
  "exclude": ["node_modules", ".git", "dist", "build", "coverage", "reference", "test", "tests", "fixtures", "__fixtures__"],
  "maxFindingsPerRule": 50
}
```

| Field | Default | Meaning |
| --- | --- | --- |
| minTier | info | lowest tier reported |
| failOn | error | tier at which gate and scan exit 1 |
| domains | all | restrict scanning to these domains |
| exclude | defaults below | directories skipped while walking |
| maxFindingsPerRule | 50 | cap on findings per rule per file |

The default exclude list is `node_modules, .git, dist, build, coverage, reference, test, tests, fixtures, __fixtures__`.

CLI flags override the config file. Use `-c` to load a different file.

## Contributing

The workspace is a pnpm monorepo with three parts:

- `rules/`: the rule database, one JSON file per domain
- `packages/core`: the check engines for prose, ui, code, and commit
- `packages/cli`: the commander-based CLI
- `scripts/`: rule bundling, plus `sync-reference.mjs` (refreshes the gitignored research tree) and `check-skills.mjs` (the library contract check behind `pnpm check:skills`)

From the repo root:

```bash
pnpm install
pnpm validate:rules
pnpm check:skills
pnpm typecheck
pnpm --filter @zero-slop/core test
pnpm --filter @zero-slop/cli test
```

The rules gate checks the schema and runs every fixture. New rules go in `rules/<domain>.json` with a source attribution, a tier, a matcher, and pass/fail fixtures.

CI runs the rules gate, typecheck, both test suites, and a self-scan that gates `docs/`, `skills/` and this README. The repo enforces its own rules on its own documentation and its own agent packs.

## Documentation

The long-form docs live in docs/:

- `docs/ZERO_SLOP_FRAMEWORK.md`: architecture, the five pillars, and the research foundation
- `docs/PUBLIC_ADOPTION.md`: distribution plan and channel map
- `docs/MULTI_AGENT_SKILLS.md`: the portable skill library: families, file tree, install paths
- `docs/SHIP_PLAN.md`: release plan and milestones
- `skills/README.md`: the pack catalog, install commands, and naming conventions

## Roadmap

The engine and the skill library ship today. The plan adds the `zero-slop-action` GitHub Action (gate a PR diff, post the report), the MCP server, and the npm publish. The release sequence is in docs/SHIP_PLAN.md.

## License

MIT. The full text is in LICENSE.
