---
name: slop-audit-config
description: Use when reviewing CI/CD manifests — GitHub Actions workflows and action manifests, .gitlab-ci.yml, CircleCI config, pre-commit config — for unpinned dependencies, script injection through untrusted context, secret exposure, or failures masked with continue-on-error. Triggers on "audit this workflow", "review .github/workflows", pipeline-hardening and supply-chain review requests.
---

# Slop Audit: Config

**Goal:** Keep pipeline configuration honest about what it trusts and what it proves: pinned dependencies, no untrusted string reaching a shell, no secret in a log line, and no failure silently accepted. Deterministic checks live in `rules/config.json`; run `zero-slop scan` as the first pass.

**Philosophy:** A workflow is executable trust. Every `uses:`, `run:`, and `ref:` states who wrote the code you will run and how much of it you verified. A default that slipped in — a floating branch, a masked test failure, an interpolated PR title inside `run:` — is a supply-chain hole that reads as tidy YAML.

**Constraints:**
- Cite every finding as `rules/config.json#<rule-id>`; never invent a threshold.
- Pin third-party actions and includes to a version or a commit, never to a branch (`reference/agentic-awesome-skills:skills/supply-chain-security/references/cicd-pipeline-security.md`).
- Never interpolate untrusted event data (`github.event.*` titles, bodies, branch names, commit messages) into a `run:` block; pass it through `env:` and quote it (`reference/agentic-awesome-skills:skills/supply-chain-security/references/cicd-pipeline-security.md`).
- Request the narrowest `permissions:` the job needs; `write-all` hands the token to every step, including a compromised dependency (`reference/agentic-awesome-skills:skills/supply-chain-security/SKILL.md`).
- Secrets never reach a command line, an echo, or an env dump; a credential passed as a flag is visible in process listings and logs (`reference/wshobson-agents:plugins/cicd-automation/skills/secrets-management/SKILL.md`).
- Verification steps fail the job: masking a test or lint failure with `continue-on-error: true`, `allow_failure: true`, or `|| true` deletes the signal the pipeline exists to produce (`reference/agentic-awesome-skills:skills/supply-chain-security/references/cicd-pipeline-security.md`).
- Install tools at a pinned version; `curl | bash`, floating `npx`, and unpinned global installs run whatever the registry serves today (`reference/DevOps-Security-Agent-Skills:security/scanning/supply-chain-attack-response/SKILL.md`).
- `pull_request_target` runs with repository secrets against the base branch: treat every use as a trust decision, and never check out the PR head under it (`reference/agentic-awesome-skills:skills/supply-chain-security/references/cicd-pipeline-security.md`).

**Checks (point at CLI + rules JSON):**
- Trust: floating branch ref in `uses:`/`ref:`/`rev:` (ZS-CONFIG-001), `@latest` or `:latest` image tag (ZS-CONFIG-002), `pull_request_target` trigger (ZS-CONFIG-004), PR-head ref in a checkout (ZS-CONFIG-005, warning; promote when the trigger is `pull_request_target`), floating toolchain selector (ZS-CONFIG-014, info), self-hosted runner isolation (ZS-CONFIG-018, info).
- Injection: untrusted `github.*` context inside `run:` (ZS-CONFIG-003, error), remote-execution install such as `curl | bash` or `irm | iex` (ZS-CONFIG-010, error).
- Secrets: `secrets.*` inside a `run:` command (ZS-CONFIG-007, error), hardcoded credential literal (ZS-CONFIG-008, error), credential passed as a command-line flag (ZS-CONFIG-009), env dump such as `printenv` (ZS-CONFIG-019).
- Provenance: unpinned `npm install -g` or `yarn global add` (ZS-CONFIG-011), unversioned `pip install` (ZS-CONFIG-012), unpinned `npx` registry fetch (ZS-CONFIG-013).
- Masked failures: `continue-on-error: true` (ZS-CONFIG-015), `allow_failure: true` (ZS-CONFIG-016), `|| true` after a verification command (ZS-CONFIG-017).

**Gotchas:**
- Scope is CI manifests only. The same `key: value` shapes appear in docker-compose and Kubernetes YAML, where these rules do not apply.
- A `secrets.*` reference in an `env:` block is correct usage; only interpolation into `run:` commands flags (ZS-CONFIG-007).
- `Docker login -p` and friends are legacy flag forms; the injected `--password-stdin` path does not flag (ZS-CONFIG-009).
- `|| true` is fine after a best-effort cleanup and wrong after a test, lint, or build command (ZS-CONFIG-017, purpose-gated).
- Masking and pinning rules are warnings, not verdicts: a deliberately non-blocking flaky job with a linked ticket survives triage (rules/README.md: tier discipline).
