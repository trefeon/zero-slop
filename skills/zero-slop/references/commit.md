# Commit reference (from slop-audit-commit)

# Slop Audit: Commit & PR Hygiene

Goal: every commit message, PR title, and PR description earns its place in history — machine-parseable, human-informative, and reviewable in one sitting.

Constraints: flag candidates with `zero-slop scan` against `rules/commit.json`; the agent judges intentionality. Slop is an unchosen default — a flagged message is guilty until the author shows intent. Never invent checks; cite a rule id or repo path per finding.

## Commit format

- Type from the enum only: build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test — `rules/commit.json#ZS-COMMIT-001`.
- Type present and lower-case: `fix:`, never `FIX:` or bare `: msg` — `#ZS-COMMIT-002`.
- Subject required and non-empty after the colon — `#ZS-COMMIT-003`.
- Subject lower-case start, never sentence/pascal/upper-case (`add retry`, not `Add Retry`) — `#ZS-COMMIT-004`.
- Header one line, max 100 chars, no leading/trailing whitespace — `#ZS-COMMIT-005`.
- Blank line between header, body, and footer or tooling cannot split them — `#ZS-COMMIT-006` (warning).
- Body/footer lines max 100 chars each; URL lines exempt — `#ZS-COMMIT-007`.
- Every commit in a PR conventional, not just the title — `#ZS-COMMIT-008`; each message max 500 chars — `#ZS-COMMIT-009`.
- One logical change per commit so history stays revertable and cherry-pickable — `#ZS-COMMIT-020`; see `reference/DevOps-Security-Agent-Skills/devops/release/git-workflow/`.
- Changelog discipline (what changed, why, migration notes) follows `reference/last30days-skill/skills/last30days/SKILL.md`; release-version bumps follow `reference/DevOps-Security-Agent-Skills/devops/release/semantic-versioning/`.

## Subject content

- Vague subjects fail: wip, minor fix, fix bug, phase 1, stuff, misc, cleanup, tweak, update stuff — name the changed thing — `#ZS-COMMIT-021`.
- Imperative, not gerund: `update the client`, never `updating the client` — `#ZS-COMMIT-022`.
- One dependency per bump, named with versions (`bump lodash 4.17.20 to 4.17.21`), never bulk `bump deps` — `#ZS-COMMIT-024`.

## PR hygiene

- Description required, max 2500 chars; padded AI-generated walls of text are slop — `#ZS-COMMIT-012`, `#ZS-COMMIT-013`.
- Max 2 emojis across title plus description — `#ZS-COMMIT-014`.
- Link an issue (`Fixes #123`) so the work is traceable — `#ZS-COMMIT-015`.
- Follow the repo PR template (sections present, checkboxes checked) when the repo requires one — `#ZS-COMMIT-016`.
- Commits authored by the PR author; blocked usernames fail — `#ZS-COMMIT-010`, `#ZS-COMMIT-011`.
- Doc-only spam PRs (README/SECURITY/LICENSE/CODE_OF_CONDUCT with no code) fail — `#ZS-COMMIT-017`.
- Every changed file ends with a newline — `#ZS-COMMIT-018`.
- Size caps: max 50 changed files (`#ZS-COMMIT-019`), ~1000 added lines per PR (`#ZS-COMMIT-023`); CI gate patterns in `reference/DevOps-Security-Agent-Skills/devops/ci-cd/github-actions/`.

## Gotchas

- `#ZS-COMMIT-001` accepts `type(scope)!: subject` and `type!: subject`; flag only truly off-enum types, not missing scopes.
- `#ZS-COMMIT-004` targets the first word only — `fix: retry with OAuth token` passes (capital mid-subject is fine).
- `#ZS-COMMIT-006` is warning-tier upstream; treat glued body/footer as fixable, not blocking.
- `#ZS-COMMIT-008` tolerates PR titles with a trailing `(#123)`; `#ZS-COMMIT-015` is opt-in upstream — enforce only where the repo enables it.
- `#ZS-COMMIT-021` matches filler wording in the subject, never the type prefix — `refactor: simplify retry` is fine.
- `#ZS-COMMIT-022` matches only the common gerund set (adding, updating, fixing…); adjectives like `pending` or `streaming` are not gerunds.
- Mechanical refactors and pure deletions may exceed `#ZS-COMMIT-023` with justification; `#ZS-COMMIT-009`/`013`/`019` disable at 0.
- Deterministic layer: `zero-slop scan` plus `rules/commit.json`; semantic checks (`010`, `011`, `016`, `020`) need agent judgment — CLI cannot decide authorship or logical focus alone.
