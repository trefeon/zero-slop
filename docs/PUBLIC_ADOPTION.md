# Public Adoption Plan: zero-slop

How the public installs and uses zero-slop, grounded in audits of 13 reference
repos' distribution (`reference/`) + live verification of every channel's
publish requirements (2026-08-17). Goal: a solo dev can publish and the public
gets value in one command.

## The model to copy: one rules DB, many doors

anti-slop (miqdadbadjuber) is the template: an **npm picker that bundles the
skills in-package and detects the user's agents**, plus skills.sh, a Claude
plugin (with MCP server), and a single paste-able file. Every door serves the
same artifact.

## Channel map: Requirements verified

| Channel | Publish cost | Review? | First-timer experience |
|---|---|---|---|
| **npm / npx** | Low: account + 2FA or GAT; trusted publishing via OIDC | No | `npx -y zero-slop scan .`: zero install, findings in seconds |
| **skills.sh** | Low: push public repo with `skills/<name>/SKILL.md` | **No (auto-indexed)** | `npx skills add <owner>/zero-slop -g` → agent self-triggers |
| **Claude marketplace** | Low-med: `.claude-plugin/plugin.json` + `marketplace.json` in repo; `claude plugin validate`; community submit optional | Self-serve; community = review | `/plugin marketplace add <owner>/zero-slop` → `/plugin install` |
| **GitHub Action** | Low: `action.yml` at repo root + release with "Publish to Marketplace" checked | No (listing instant) | `- uses: <owner>/zero-slop-action@v1`: works even unlisted |
| **MCP Registry** | Low-med: `server.json` (`io.github.<user>/zero-slop`), `mcp-publisher login github`, `mcpName` in package.json | Preview; may reset | install = `npx -y zero-slop-mcp@latest` (same npm artifact) |
| **Agent Plugins v1.0** | Low: `plugin.json` + `skills/` + `mcp.json` folder | No registry exists; client-dependent | bundle skills+MCP as one canonical artifact |
| **curl\|sh + Docker (ghcr.io)** | Low |: | non-Node/offline side-channel |
| **Homebrew core** | Med: gated on popularity + maintainer review | Yes | `brew install zero-slop` (own tap = no review) |
| **VS Code extension** | **High**: publisher + Entra ID auth (PATs retire Dec 2026) | No | live diagnostics; **defer until CLI has traction** |

## Launch sequence: Cheapest to fastest value

1. **Day 0: Public repo + npm**: `@zero-slop/cli` published (`npx zero-slop`),
   MIT license, trusted publishing (provenance), README with the install command
   in the first 60 lines. This is the anchor: every other channel points here.
2. **Day 1: skills.sh**: commit `skills/slop-audit-*/SKILL.md`; auto-indexed,
   no submission, reaches 20+ agents. Highest distribution-per-effort.
3. **Day 1–2: Claude marketplace**: `.claude-plugin/` + `marketplace.json`
   (self-serve, no approval). Optional `@claude-community` submission later.
4. **M2: GitHub Action**: `zero-slop-action` (Node, defaults-first), marketplace
   checkbox on release. Copy peakoss: all-defaults workflow, `<15s`, exemption
   knobs; copy commitlint-action: config-conventional-style fallback so it works
   with zero required inputs.
5. **M4: MCP Registry**: when the MCP server ships: `io.github.<user>/zero-slop`
   reverse-DNS name + `mcpName` in package.json. Registry is preview: listing
   early is cheap and future-proof.
6. **Nice-to-haves**: curl|sh wrapper (Windows `irm | iex` twin), ghcr.io image.
   **Defer**: Homebrew core (needs popularity), VS Code (heavy lift).

## Packaging decisions: From the audits

- **License: MIT**: commitlint, vale, and no-ai-slop all ship MIT, and peakoss's
  AGPL action is the counterexample that costs it corporate adopters. MIT
  maximizes reach.
- **npm package bundles the skills** (like anti-slop's `prepublishOnly: sync-skills`):
  `files: ["dist", "skills/"]`: install never depends on GitHub.
- **`npx zero-slop` picker** (like `npx antislop-ai`): interactive, detects
  Claude Code/Codex/opencode/Cursor, installs skills into the right dirs,
  injects `CLAUDE.md`/`AGENTS.md` pointers.
- **Rules as shareable configs** (commitlint's `extend` pattern):
  `@zero-slop/config-recommended` etc. so teams pin their own severity.
- **Zero-config defaults everywhere**: `zero-slop scan .` works with no config
  (like `pa11y <url>`); `zero-slop-action` works with zero inputs.
- **Single-file paste floor**: a condensed `zero-slop.md` rules file (like
  `antislop.md`) for plain chat windows.
- **AGENTS.md marker injector** (talk-normal pattern): idempotent
  BEGIN/END-block installer as the no-skill-system fallback.

## README structure: Adoption-driven

1. Banner + badges (MIT, version, npm, tests): first 20 lines
2. **Install: one command** (`npx -y zero-slop scan .`): first 60 lines
3. What it catches (389 rules across 7 domains, with 3 examples)
4. Usage: CLI (`scan/check/gate/report`), CI action, agent skills, MCP
5. Before/after proof (demo screenshots like hallmark)
6. Config reference → Contributing → License

## Acceptance criteria

- `npx -y zero-slop@latest scan .` returns findings on a fresh repo with no config.
- `npx skills add <owner>/zero-slop -g` installs skills on all 4 harnesses.
- `- uses: <owner>/zero-slop-action@v1` posts a report on the first PR.
- `claude plugin validate ./` passes; `skills-ref validate` passes on every skill.
- MIT license, provenance on npm, all tests green in CI (self-dogfooded: the
  repo's own README/docs scanned by zero-slop itself).
