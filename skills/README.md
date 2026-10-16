# The zeroslop skill library

Twenty-three Agent Skills, one folder each, installable into any client that reads
the Agent Skills standard. Every pack owns one job: a workflow pack decides the
next move on a task, an audit pack judges a finished artifact against the rule
database in `rules/`. The bodies carry the judgment, the engine carries the
enforcement.

## Naming

One family prefix, one shape per role:

- `zeroslop-<decision>`: workflow packs, 13. One decision per pack.
- `zeroslop-audit-<domain>`: audit packs, 8. One rule domain per pack.
- `zeroslop-audit`: the audit router, for a request whose domain is unclear.
- `zeroslop`: the universal router, across both families.

A folder name equals the pack's frontmatter `name`: `skills/zeroslop-frame/`
declares `name: zeroslop-frame`.

## Catalog

### Workflow family

| Pack | Decides |
| --- | --- |
| zeroslop-frame | a raw request becomes a goal sentence, acceptance outcomes, and exclusions |
| zeroslop-plan | a framed goal becomes slices, frozen interfaces, and dependency order |
| zeroslop-delegate | whether a slice leaves this context, and how it is briefed and reviewed |
| zeroslop-context | what stays in the window, what moves to a file, and the budget for each |
| zeroslop-verify | the evidence a completion claim needs, and the surface it exercised |
| zeroslop-debug | an unexplained failure becomes a named cause and a kept reproduction |
| zeroslop-review | a diff is judged on its own evidence before it merges |
| zeroslop-git | isolation before the first edit, plus commits, branches, and cleanup |
| zeroslop-secure | credentials, third-party code, and irreversible commands get a gate |
| zeroslop-memory | what outlives the session, which store holds it, when to distrust it |
| zeroslop-skill | a repeated process becomes the smallest instruction artifact that works |
| zeroslop-harness | tool design, permissions, runtime, and what a finished run leaves behind |
| zeroslop-loops | budget, stop condition, checkpoints, and escalation for repeating work |

### Audit family

| Pack | Audits |
| --- | --- |
| zeroslop-audit | which domain pack applies, and whether a flag is intentional |
| zeroslop-audit-prose | prose and chat tells: vocabulary, rhythm, punctuation, reply shape |
| zeroslop-audit-ui | visual tells: palette, typeface, layout, and motion defaults |
| zeroslop-audit-code | swallowed errors, type escapes, wrappers, duplication, dead code |
| zeroslop-audit-commit | commit subjects, PR titles, and the scope of a diff |
| zeroslop-audit-a11y | WCAG 2.2 AA: contrast, focus, keyboard, targets, reflow |
| zeroslop-audit-integrity | invented numbers, fake proof, unsourced quotes, placeholders |
| zeroslop-audit-skill | instruction artifacts: frontmatter, trigger, context budget |
| zeroslop-audit-config | CI manifests: floating refs, injection, secrets, masked failures |

### Router
| Pack | Routes |
| --- | --- |
| zeroslop | a request across both families to the one pack that owns it |

## Install

```bash
npx skills add trefeon/zero-slop                           # project scope: ./.agents/skills
npx skills add trefeon/zero-slop -g                        # machine-wide store
npx skills add trefeon/zero-slop -s zeroslop-audit-code     # one pack
```

The same folders load from the path each client reads: `.claude/skills/`,
`.agents/skills/`, `.opencode/skills/`, `.cursor/skills/`. Install once and the
descriptions do the rest; a pack loads when the request matches its trigger.

## Conventions

- Rule citations name the file and the id: `rules/<domain>.json#ZS-*`, as in
  `rules/ui.json#ZS-UI-001`. A threshold worth enforcing has an id.
- Workflow packs carry `Goal`, `Constraints`, `Not for`, and `Definition of done`,
  and each names the sibling to use instead.
- Audit packs carry the domain's own sections plus a `Gotchas` list.
- `references/` files hold detail that only matters once a pack is active.

## The engine is the deterministic half

The CLI runs the same rule database over a tree, so a review and a CI run agree:

```bash
zero-slop scan .             # findings by domain and tier
zero-slop check src/app.tsx  # one file
zero-slop gate docs/         # one-line summary, exits 1 at or above the threshold
```

A pack body is the contract; the CLI is the enforcement. Anything a pack states as
a hard threshold is a rule id, and anything that is not a rule id is reviewer
judgment, not a gate.

## How the library is checked

- `pnpm check:skills` reads `skills/` alone, with no build and no engine: a pack's
  `name` must match its directory, frontmatter holds nothing beyond `name` and
  `description` (present, under 1024 characters, unique in the library), and no
  sentence repeats across packs. Workflow packs add the family contract: the four
  required sections, a trigger-first description, and no em dash.
- `node packages/cli/dist/index.js gate skills/` runs the repo's own scanner over
  every pack. The library holds at 0 errors.
- `skills-ref validate <pack-dir>` checks folder-to-name match, allowed frontmatter
  keys, and description length against the Agent Skills spec. Run it over a pack
  folder whenever the library changes.

CI runs the contract script and the self-scan, so a pack that stops passing turns
the build red.

`docs/MULTI_AGENT_SKILLS.md` covers the file tree, the family split, and the
package rationale.

## License

MIT. See `LICENSE` at the repository root.
