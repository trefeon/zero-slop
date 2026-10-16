# Ship Plan: zero-slop to Public

Executable checklist to take zero-slop from private repo to publicly usable.
State: 2026-10-16. Rules DB 570 rules in 9 domains, engines done (615 tests),
skill library at 23 portable packs (13 workflow + 9 audit + 1 router), adoption
research done (docs/PUBLIC_ADOPTION.md, docs/MULTI_AGENT_SKILLS.md).

## Milestones

### M1.8: Workflow library [IN PROGRESS]
- [x] 13 `zeroslop-*` workflow skills, one owner per decision, sibling boundaries
      stated, every claim traceable to a rule id or a file in this repo
- [x] Every file gated to 0 errors by the repo's own scanner; CI self-scan covers `skills/`
- [x] Router (`skills/zeroslop`) routes both families; README and
      docs/MULTI_AGENT_SKILLS.md document the audit-versus-workflow split
- [ ] Re-run `npx skills add trefeon/zero-slop -g` after this lands and confirm all 23
      packs install on the four harnesses

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
- [ ] `.gitignore` final pass; no secrets; the cloned research repos stay ignored
- [ ] CI workflow: `pnpm test` + `pnpm typecheck` + `pnpm validate:rules`
      + zero-slop self-scan on README/docs/skills (dogfooding gate)

### M2.6: Publish to npm
- [ ] `npm login` (2FA or granular access token)
- [ ] `@zero-slop/cli` published with `--provenance` (trusted publishing via
      GitHub Actions OIDC: no tokens in CI)
- [ ] `npx -y @zero-slop/cli@latest scan .` works from a fresh clone
- [ ] `npm pack --dry-run` verified: dist + rules only, no junk

### M2.7: skills.sh
- [x] 23 portable packs committed (13 workflow + 9 audit + 1 router) per
      docs/MULTI_AGENT_SKILLS.md
- [x] `skills-ref validate` passes on every folder (23/23, 2026-10-16)
- [x] `npx skills add` installs the whole library (project-scope run: 23 packs
      into `.agents/skills`, universal + a Claude Code symlink); re-run against
      the GitHub source after each publish

### M2.8: GitHub Action
- [ ] `packages/action`: Node action, defaults-first (`zero-slop gate` on PR
      diff, posts report comment, exemption knobs)
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
- License: **MIT** (max corporate adoption; AGPL costs corporate adoption)
- npm package bundles skills + rules in `files` (install never depends on GitHub)
- `npx @zero-slop/cli` picker added after CLI traction
- Rules as shareable configs (`@zero-slop/config-recommended`) after core ships
- Zero-config defaults everywhere; `zero-slop.json` optional
- Self-dogfooded CI: the repo's own docs scanned by zero-slop

## Sequence: One public repo, one npm package, then doors
1. M2 CLI → 2. repo hygiene + CI → 3. npm publish (Day 0) → 4. skills.sh
   (Day 1, auto) → 5. GitHub Action (Day 1–2) → 6. Claude marketplace →
   7. MCP registry (M4) → 8. side-channels on demand.

## Ship acceptance
- [ ] `npx -y @zero-slop/cli@latest scan .` returns findings on a fresh repo, no config
      (blocked on the npm publish; the unscoped `zero-slop` name belongs to another project)
- [ ] `npx skills add <owner>/zero-slop -g` installs on Claude Code + Codex +
      opencode + Cursor
- [ ] `- uses: <owner>/zero-slop-action@v1` posts a report on the first PR
- [ ] MIT + npm provenance + CI green + self-scan passes
