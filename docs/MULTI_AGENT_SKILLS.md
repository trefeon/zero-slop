# The Portable Skill Library

Twenty-three Agent Skills live in `skills/`, one folder per pack. A pack is a
self-contained directory: frontmatter carries `name` and `description`, `SKILL.md`
carries the decisions, and optional `references/` files load when the body points
at them. Clients that read the Agent Skills standard load the same folder
unchanged and ignore frontmatter fields they do not know, so the same pack serves
all of them. The catalog, install commands, and naming rules live in
`skills/README.md`; this document covers the shape of the library as a whole.

## File tree

```
skills/
├── zeroslop/                  router: routes both families, one lookup table
├── zeroslop-audit/            audit router: which domain applies, flag-versus-intent triage
├── zeroslop-audit-prose/      prose tells: vocabulary, rhythm, punctuation, chat reply shape
├── zeroslop-audit-ui/         visual tells: palettes, typefaces, layout and motion budgets
├── zeroslop-audit-code/       code smells: swallowed errors, type escapes, wrappers, dead code
├── zeroslop-audit-commit/     commit and PR hygiene
├── zeroslop-audit-a11y/       WCAG 2.2 AA: contrast, focus, keyboard, targets, reflow
├── zeroslop-audit-integrity/  fabricated numbers, invented proof, unlabeled placeholders
├── zeroslop-audit-skill/      instruction artifacts: frontmatter contract, context budget
├── zeroslop-audit-config/     CI manifests: floating refs, injection, masked failures
├── zeroslop-frame/            frame a raw request before any work starts
├── zeroslop-plan/             turn a framed goal into slices, contracts, and order
├── zeroslop-delegate/         decide whether a slice leaves this context
├── zeroslop-context/          what stays in the window and what moves to a file
├── zeroslop-verify/           the evidence a completion claim needs
├── zeroslop-debug/            an unexplained failure to a named cause
├── zeroslop-review/           judging a diff before merge
├── zeroslop-git/              branches, worktrees, commits, PR flow
├── zeroslop-secure/           credentials, third-party code, irreversible commands
├── zeroslop-memory/           what outlives the session, and where it lives
├── zeroslop-skill/            authoring an instruction artifact
├── zeroslop-harness/          the environment an agent runs in
└── zeroslop-loops/            repeating work: budget, stop condition, drift
```

## Two families, one router

| Family | Packs | Fires | Grounded in |
|---|---|---|---|
| Workflow | 13 | before and during the work: the decision the task is waiting on | rule ids and repo files named in the body |
| Audit | 9 | after the artifact exists: a finished page, diff, commit, or config | `rules/<domain>.json`, one file per domain |
| Router | 1 | either, when the domain is not obvious from the request | the audit table plus the workflow boundaries |

Workflow packs teach the work: each owns exactly one decision, names the sibling
to use instead, and states what it is not for. Audit packs judge a result: each
maps a file type to the rules that judge it, cites the ids it applies
(`rules/ui.json#ZS-UI-001`), and reports findings with a tier rather than a
verdict. The router (`skills/zeroslop`) reads both tables and hands the request
to one pack.

## Install

The library installs from the repository with the skills CLI. Project scope keeps
a pin per repository; `-g` writes to the machine-wide store.

```bash
npx skills add trefeon/zero-slop                          # project scope: ./.agents/skills
npx skills add trefeon/zero-slop -g                       # global store
npx skills add trefeon/zero-slop -s zeroslop-audit-code    # one pack
```

The same folder loads from the paths each client reads:

| Client | Path |
|---|---|
| Claude Code | `.claude/skills/` and `~/.claude/skills/` |
| Codex | `.agents/skills/` |
| opencode | `.opencode/skills/`, `.claude/skills/`, `.agents/skills/` |
| Cursor | `.cursor/skills/`, and `.agents/skills/` |

Bodies stay free of client-specific mandates, so a pack behaves the same wherever
it loads, and client extensions never enter the shared files.

## What keeps the library honest

Each pack passes three checks; the first two run in CI on every push.

- The repo's own scanner: `node packages/cli/dist/index.js gate skills/` runs the
  engine over every pack. The skill domain checks the frontmatter contract, the
  trigger-first description, the body budget, and the definition of done, so a
  pack cannot drift from the rules the library claims to enforce.
- The library contract script: `pnpm check:skills` reads `skills/` alone, with no
  build and no engine dependency. It fails on a pack whose `name` disagrees with
  its directory, whose frontmatter holds keys beyond `name` and `description`,
  whose description is missing, over 1024 characters, or duplicated elsewhere in
  the library, or whose text repeats a sentence from another pack. Workflow packs
  carry the family contract on top: the four required sections, a description that
  opens with a trigger, and no em dash.
- The Agent Skills spec validator: `skills-ref validate <pack-dir>` checks the
  folder-to-name match, the allowed frontmatter keys, and the description length
  against the published standard. Run it over a pack folder when the library
  changes.

CI wires the first two together with the self-scan over `docs/`, `skills/`, and
`README.md`, so a pack that stops passing cannot land.
