# Config reference

Goal: keep CI configuration honest about what it trusts and what it proves. Every `uses:`, `run:`, and `ref:` states who wrote the code you will run.

Constraints: flag candidates with `zero-slop scan` against `rules/config.json`; the agent judges intentionality. Never invent checks; cite a rule id or nothing.

## Trust

- Pin third-party actions and includes to a version or a commit, never to a branch: `rules/config.json#ZS-CONFIG-001`.
- Floating image tags (`@latest`, `:latest`): `#ZS-CONFIG-002`. Floating toolchain selectors (`lts/*`, `20.x`): `#ZS-CONFIG-014` (info).
- `pull_request_target` runs with repository secrets against the base branch: `#ZS-CONFIG-004`; never check out the PR head under it, and treat a head-ref checkout as a warning elsewhere: `#ZS-CONFIG-005`.
- Self-hosted runners need isolation: `#ZS-CONFIG-018` (info).

## Injection and secrets

- Untrusted `github.*` context interpolated into `run:`: `#ZS-CONFIG-003`, error tier; pass the value through `env:` and quote it.
- Remote-execution installs such as `curl | bash` or `irm | iex`: `#ZS-CONFIG-010`, error tier.
- `secrets.*` inside a `run:` command: `#ZS-CONFIG-007`, error tier; an `env:` reference is correct usage.
- Hardcoded credential literal: `#ZS-CONFIG-008`, error tier. Credential passed as a command-line flag: `#ZS-CONFIG-009`.
- Environment dump such as `printenv`: `#ZS-CONFIG-019`.

## Provenance

- Unpinned `npm install -g` or `yarn global add`: `#ZS-CONFIG-011`. Unversioned `pip install`: `#ZS-CONFIG-012`. Unpinned `npx` registry fetch: `#ZS-CONFIG-013`.

## Masked failures

- `continue-on-error: true`: `#ZS-CONFIG-015`. `allow_failure: true`: `#ZS-CONFIG-016`. `|| true` after a verification command: `#ZS-CONFIG-017`.
- A deliberately non-blocking job with a linked ticket survives triage; the rule is a purpose gate, not a verdict.

## Deterministic layer

`zero-slop scan` plus `rules/config.json`. Scope is CI manifests only: the same `key: value` shapes in docker-compose or Kubernetes YAML are out of scope.
