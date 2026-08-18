# Ship Plan: zero-slop to Public

Executable checklist to take zero-slop from private repo to publicly usable.
State: 2026-08-17. Rules DB 389 rules, engines done (408 tests), adoption
research done (docs/PUBLIC_ADOPTION.md, docs/MULTI_AGENT_SKILLS.md).

## Milestones

### M2: CLI, the Anchor Artifact [IN PROGRESS]
- [ ] `packages/cli`: `zero-slop scan|check|gate|report` with config, JSON
      output, exit codes, extension dispatch
- [ ] Rules bundled in the npm package (`sync-rules`), fallback to repo rules in dev
- [ ] CLI tests green + end-to-end smoke on a slop fixture
- [ ] `pnpm exec zero-slop scan .` dogfoods the repo itself

### M2.5: Public repo hygiene
- [ ] MIT LICENSE at root
- [ ] README restructured: banner → install (first 60 lines) → what it catches →
      usage (CLI / action / skills / MCP) → before-after → config → contributing
- [ ] Badges: MIT, version, tests, npm
- [ ] `.gitignore` final pass; no secrets; `reference/` stays ignored
- [ ] CI workflow: `pnpm test` + `pnpm typecheck` + `pnpm validate:rules`
      + zero-slop self-scan on README/docs (dogfooding gate)

### M2.6: Publish to npm
- [ ] `npm login` (2FA or granular access token)
- [ ] `@zero-slop/cli` published with `--provenance` (trusted publishing via
      GitHub Actions OIDC: no tokens in CI)
- [ ] `npx -y zero-slop@latest scan .` works from a fresh clone
- [ ] `npm pack --dry-run` verified: dist + rules only, no junk

### M2.7: skills.sh
- [ ] `skills/slop-audit*` package committed (7 portable skills per
      docs/MULTI_AGENT_SKILLS.md)
- [ ] `skills-ref validate` passes on every folder
- [ ] Repo public → auto-indexed; `npx skills add <owner>/zero-slop -g`
      installs on all 4 harnesses

### M2.8: GitHub Action
- [ ] `packages/action`: Node action, defaults-first (`zero-slop gate` on PR
      diff, posts report comment, exemption knobs like peakoss)
- [ ] `action.yaml` at action package root; release with "Publish to GitHub
      Marketplace" checked

### M2.9: Claude plugin marketplace
- [ ] `.claude-plugin/plugin.json` (skills + MCP server) + `marketplace.json`
- [ ] `claude plugin validate ./` passes
- [ ] Optional: submit to `@claude-community`

### M4: MCP server + registry
- [ ] `packages/mcp`: stateless `zero-slop` MCP server
      (`slop_scan` / `slop_score` / `slop_explain` tools)
- [ ] `server.json` (`io.github.<user>/zero-slop`) + `mcp-publisher login github`
      + `mcpName` in package.json → list in MCP Registry
- [ ] Agent Plugins bundle (`plugin.json` + skills + mcp.json)

### Nice-to-haves: Deferred
- [ ] curl|sh wrapper + Windows `irm | iex`
- [ ] ghcr.io Docker image
- [ ] Homebrew tap (only on demand)

## Publishing decisions: Locked
- License: **MIT** (max corporate adoption; AGPL costs it: peakoss counterexample)
- npm package bundles skills + rules in `files` (install never depends on GitHub)
- `npx zero-slop` picker (antislop-ai pattern) added after CLI traction
- Rules as shareable configs (`@zero-slop/config-recommended`) after core ships
- Zero-config defaults everywhere; `zero-slop.json` optional
- Self-dogfooded CI: the repo's own docs scanned by zero-slop

## Sequence: One public repo, one npm package, then doors
1. M2 CLI → 2. repo hygiene + CI → 3. npm publish (Day 0) → 4. skills.sh
   (Day 1, auto) → 5. GitHub Action (Day 1–2) → 6. Claude marketplace →
   7. MCP registry (M4) → 8. side-channels on demand.

## Ship acceptance
- [ ] `npx -y zero-slop@latest scan .` returns findings on a fresh repo, no config
- [ ] `npx skills add <owner>/zero-slop -g` installs on Claude Code + Codex +
      opencode + Cursor
- [ ] `- uses: <owner>/zero-slop-action@v1` posts a report on the first PR
- [ ] MIT + npm provenance + CI green + self-scan passes
