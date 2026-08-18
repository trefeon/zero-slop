# The Zero-Slop Framework: Engineering & Design Guide

> **Zero-Slop** is an end-to-end standard for building modern software with AI without inheriting the generic, repetitive, bloated, and low-signal characteristics of raw LLM outputs.

> **Evidence base**: this standard is synthesized from 25 reference repositories cloned under `reference/` (see §6 for the coverage matrix and §7 for the development plan of the framework itself).

---

## 1. Executive Summary & Philosophy

"AI Slop" is not merely bad text—it is the **systematic lack of human intentionality** across all software artifacts:
- **In Design**: Neon purple glows on dark mode, icon-stuffed bento boxes, headline biscuit pills, ungrounded animations, and low-contrast typography.
- **In Copywriting**: Cliché vocabulary (`delve`, `testament`, `tapestry`), uniform sentence cadence, inflated hype, and hollow buzzwords.
- **In Code**: Swallowed exceptions, phantom variables, dead fallback paths, hallucinated types, over-commented boilerplate, and unchecked `any` casts.
- **In Repositories**: Spammed PRs with trivial doc tweaks, robotic commit messages, and untested refactors.

### The Core Law of Zero-Slop
> **Filters enforce discipline; Intentionality creates craft.**
> An anti-slop filter prevents the AI from falling into cliché defaults, but you must supply the explicit direction, constraints, and architecture.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           THE ZERO-SLOP STACK                            │
├───────────────────────────────┬──────────────────────────────────────────┤
│ 1. Model & Inference Layer    │ Token backtracking, logit penalties      │
├───────────────────────────────┼──────────────────────────────────────────┤
│ 2. Agent & System Instructions│ Strict Negative Constraints + DESIGN.md  │
├───────────────────────────────┼──────────────────────────────────────────┤
│ 3. Deterministic AST Linters  │ Static analysis for AI code antipatterns │
├───────────────────────────────┼──────────────────────────────────────────┤
│ 4. Pre-Commit Quality Gates   │ Lint-staged, typecheck, contrast scripts │
├───────────────────────────────┼──────────────────────────────────────────┤
│ 5. CI/CD & PR Defense         │ Automated PR heuristic scoring & closing │
└───────────────────────────────┴──────────────────────────────────────────┘
```

---

## 2. The 5 Pillars of Zero-Slop

```
                               ┌─────────────────┐
                               │ Zero-Slop Canon │
                               └────────┬────────┘
             ┌──────────────┬───────────┴───────────┬──────────────┐
             ▼              ▼                       ▼              ▼
     ┌──────────────┐┌──────────────┐       ┌──────────────┐┌──────────────┐
     │ 1. UI/Design ││ 2. Copy/Text │       │ 3. Code AST  ││ 4. CI/CD Gate│
     └──────────────┘└──────────────┘       ┌──────────────┘┌──────────────┘
```

---

### Pillar 1: UI & Visual Aesthetics

#### Hard-Banned Cliché Tropes
1. **No Purple-on-Dark Cliché**: Do not use violet/purple glow accents on pitch-black backgrounds as a default theme.
2. **No Biscuit / Pill Badges**: Never place a rounded pill badge with a pulsing green/purple dot directly above the main `<h1>` unless explicitly functioning as a live status indicator.
3. **No Gradient Word Highlights**: Never use linear-gradient text fills across arbitrary headline keywords (`<span class="bg-gradient-to-r...">`).
4. **No Icon-Stuffed Bento Boxes**: Do not drop random Lucide/Feather icons inside colored circles at the top of every card.
5. **No Decorative Grid Backgrounds**: Do not overlay CSS grid patterns or particle meshes unless the product is a spatial canvas tool.
6. **No Multi-Layer Nested Cards**: Cards containing cards containing more cards create visual noise. Flatten layouts to 1–2 visual hierarchy levels.

#### Liveliness Dials
Balance interfaces using the **Liveliness Matrix**:
- **ENERGY (1–5)**: Density and visual punch (contrast, surface contrast, typographic weight).
- **RHYTHM (1–5)**: Asymmetry, deliberate whitespace variation, breaking monotonous 3-column rows.
- **MOTION (1–5)**: Functional transitions only (150–250ms cubic-bezier). Never add floating loops or idle bobbing.

---

### Pillar 2: Copywriting & Content Humanization

#### Blacklisted Vocabulary: The AI Tell List
The following words and phrases are banned from all customer-facing copy, documentation, and commit messages:

| Category | Banned Words / Phrases | Replacement Guidance |
| :--- | :--- | :--- |
| **False Elevation** | *delve, testament, tapestry, beacon, unlock, elevate, empower, unleash, navigate* | State the exact action: *use, test, calculate, build, run* |
| **Over-Polite Filler** | *in today's fast-paced digital world, it is important to remember, look no further* | Cut completely; start directly with the main premise |
| **Robotic Connectors** | *furthermore, moreover, arguably, seamlessly, effortlessly, undeniably* | Use direct conjunctions (*and, but, so*) or short independent sentences |
| **Hype Adjectives** | *game-changer, revolutionizing, cutting-edge, next-level, robust, bespoke* | Provide concrete metrics and factual capabilities |

#### Structural Rhythm Rules
- **Vary Sentence Lengths**: Alternate short punches (3–7 words) with informative compound sentences (15–20 words). Never generate uniform 12-word paragraphs.
- **Active Voice Dominance**: Replace *"The data is processed by the parser"* with *"The parser reads the data."*
- **No Symmetric 3-Part Lists**: AI defaults to 3-bullet parallel structure. Use 2, 4, or asymmetrical tables instead.

---

### Pillar 3: Code Architecture & AST Quality Gates

AI coding assistants frequently introduce specific code smells that pass basic syntax checks but degrade codebase maintainability:

```
                            [ AI Generated Code ]
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │ Deterministic AST Checks  │
                        └─────────────┬─────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
     [ Swallowed Errors ]    [ Ghost / Dead Code ]    [ Unsafe Type Escapes ]
     catch (e) { /* blank */ }  unreachable fallbacks    as any / @ts-ignore
              │                       │                       │
              └───────────────────────┼───────────────────────┘
                                      ▼
                          [ REJECT / AUTO-REMEDIATE ]
```

#### Deterministic Rules to Enforce
1. **No Swallowed Exceptions**: Every `catch` block must either re-throw, log to telemetry, or return an explicit `Result.Err` type. Empty catch blocks fail the build.
2. **No Phantom Defensive Branches**: Reject `if (!user) return null;` if the upstream type system guarantees `user: User` is non-null.
3. **No Unsafe Type Assertions**: Ban `as any`, `as unknown as T`, and `// @ts-ignore` in application code.
4. **No Obvious Comment Bloat**: Ban comments that merely restate the code:
   ```typescript
   // ❌ SLOP:
   // Set the user name
   setUserName(name);

   // ✅ CLEAN: No redundant comment needed
   setUserName(name);
   ```

---

### Pillar 4: CI/CD & PR Defense

Protect repositories from automated low-effort pull requests using deterministic scoring:

```yaml
# .github/workflows/anti-slop-pr-guard.yml
name: "Anti-Slop PR Guard"

on:
  pull_request_target:
    types: [opened, synchronize, reopened]

jobs:
  evaluate-pr:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      issues: write
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Run Anti-Slop Heuristic Gate
        id: slop-check
        uses: peakoss/anti-slop@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          close-pr: true
          comment-on-close: true
          min-score-threshold: 65
          check-commit-messages: true
          check-doc-only-spam: true
```

---

### Pillar 5: Inference-Time Guardrails

When running local models (`vLLM`, `llama.cpp`, Ollama), apply token-level and phrase-level backtracking:

```json
// antislop_sampler_config.json
{
  "banned_ngrams": [
    "delve into",
    "testament to",
    "rich tapestry",
    "in summary,",
    "it is crucial to",
    "elevate your",
    "unlock the power"
  ],
  "backtrack_tokens": 8,
  "negative_logit_bias": -10.0
}
```

---

## 3. Project Configuration Templates

### A. The Agent Entry File: AGENTS.md, CLAUDE.md, GEMINI.md

Place this configuration in your repository root to configure coding assistants automatically:

```markdown
<!-- zero-slop:start -->
# Zero-Slop Engineering Rules

## 1. Design & UI Requirements
- Adhere strictly to the project's DESIGN.md.
- Do NOT use: violet glow on dark themes, pill badges with pulsing dots above headings, linear-gradient text fills, or decorative grid backgrounds.
- Keep UI components functional, accessible (WCAG AAA contrast), and uncluttered.

## 2. Writing & Prose Requirements
- Never use banned words: "delve", "testament", "tapestry", "seamlessly", "empower", "elevate", "cutting-edge".
- Write directly, succinctly, and with active voice.
- Sentence length must vary naturally; avoid uniform listicle structures.

## 3. Code Quality Requirements
- No empty catch blocks or swallowed errors.
- No `any` type casts or lazy TypeScript bypasses.
- Write unit tests for new logic paths rather than adding explanatory comments.
<!-- zero-slop:end -->
```

---

### B. Project Design Brief: DESIGN.md

```markdown
# Project Design System Specification

## Visual Identity
- **Personality**: Minimal, functional, engineered, high information density.
- **Base Background**: Neutral Slate (`#0f172a` / `#f8fafc`).
- **Primary Accent**: Monochromatic contrast with purposeful single-accent status indicators.
- **Typography**: 
  - Sans: `Inter` / `Geist` (Tracking: `-0.02em` on headings).
  - Mono: `JetBrains Mono` / `Geist Mono` for numbers and data.

## Spacing & Elevation
- Flat surfaces with 1px border separation (`border-neutral-200` / `border-neutral-800`).
- Avoid multi-tiered card nesting.
- No ambient colored drop shadows.
```

---

### C. Pre-Commit Linter Setup: Package.json and lint-staged

```json
{
  "scripts": {
    "lint:slop": "aislop check --strict",
    "test:contrast": "python reference/anti-slop/skills/antislop-human/contrast-check.py"
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "eslint --fix",
      "aislop check --staged",
      "prettier --write"
    ],
    "*.{md,mdx,txt}": [
      "python scripts/check-anti-slop-words.py"
    ]
  }
}
```

---

## 4. The Zero-Slop Delivery Gate Checklist

Before committing code or approving pull requests, verify all 4 blocks:

```
[ ] BLOCK 1: VISUAL & DESIGN AUDIT
    [ ] No cliché violet glows, pulsing biscuit badges, or gradient text.
    [ ] Contrast verified (WCAG AA minimum: 4.5:1 text, 3:1 UI controls).
    [ ] Motion is strictly functional (duration < 250ms, no infinite loops).

[ ] BLOCK 2: COPY & WRITING AUDIT
    [ ] Zero occurrences of banned vocabulary ("delve", "testament", "tapestry", etc.).
    [ ] Sentences have varying syllable and word counts.
    [ ] Technical claims are backed by metrics or working tests.

[ ] BLOCK 3: CODE & ARCHITECTURE AUDIT
    [ ] All error paths either bubble up, log with context, or return explicit Result types.
    [ ] No phantom fallback checks or redundant non-null assertions.
    [ ] Strict typing is maintained without `any` or `@ts-ignore`.

[ ] BLOCK 4: REPOSITORY HYGIENE
    [ ] Commit message summarizes the *why* and *what* concisely.
    [ ] No bloated comments that merely repeat variable or function names.
    [ ] Test coverage added for new execution branches.
```

---

## 5. Quick Reference & CLI Commands

> **Note**: the `zero-slop` CLI below is under development (see §7). Commands shown are the target interface.

```bash
# Scan repository for AI code slop
zero-slop scan .

# Run word-blacklist + rhythm audit on all markdown files
zero-slop check docs/ --prose

# Run WCAG color contrast validation
python reference/anti-slop/skills/antislop-human/contrast-check.py --css src/index.css

# CI gate: Exit non-zero on errors
zero-slop gate --tier error
```

---

## 6. Research Foundation: Reference Collection & Coverage Gaps

The framework is grounded in 25 full clones under `reference/` (gitignored, filtered by ≥300⭐ plus sole-player niche exceptions). Collectively they encode ~200 named slop tells.

### 6.1 Collective coverage by domain

| Domain | Reference repos | Depth |
|---|---|---|
| Writing/copy | no-ai-slop, no_ai_slop_writing_rules, anti-ai-slop-writing, hallmark, anti-slop, write-good, vale, no-slop | Deep: banned words, 15+ pattern families, punctuation caps, structural rules |
| Design/UI | hallmark, claude-design-system-prompt, kill-ai-slop, anti-slop | Deepest: 58 gates, 35 tells, 38 rules, 21 macrostructures |
| Voice/tone | no_ai_slop_writing_rules (corpus), anti-ai-slop-writing (calibration), hallmark (samples) | Medium: 1 data-driven voice; others questionnaire-based |
| Accessibility | claude-design-system-prompt (rules), anti-slop (contrast-check.py), pa11y, pa11y-ci | Medium: rules + 2 tools, no unified gate |
| Chat output | talk-normal | Only one, but measured (72-73% reduction) |
| Code quality | claude-code-best-practice, slop-scan, code-humanizer | Shallow: patterns + a scanner; no depth on logic/architecture |
| CI/workflow | peakoss-anti-slop, commitlint, commitlint-github-action | Metadata proxies only; no content analysis |
| Detection research | ai-text-detector, detect-gpt, AIGC_text_detector, ai-detector-benchmark, SemEval2024-task8 | Strong research, no packaged product |
| Honesty/accuracy | anti-slop R-17, hallmark gate 46, no_ai_slop_writing_rules R-19 | Rules exist; zero verification tooling |

### 6.2 Provenance of key rules: Evidence base

| Rule to enforce | Source | Exact reference |
|---|---|---|
| Em dash cap: max 1 per 500 words | anti-ai-slop-writing | "The single most cited AI tell in existence" |
| No negation-contrast phrasing ("It's not X, it's Y") | talk-normal | Hardest constraint, regression-tested leak count 6→0 |
| Sentence-length variance (no 3 consecutive same-length) | anti-ai-slop-writing | "The single most measurable AI detection signal" |
| Paragraph uniformity within 15% ⇒ likely AI | no_ai_slop_writing_rules | Corpus-derived threshold |
| Transition density >30% ⇒ red flag | no_ai_slop_writing_rules | Detection reference |
| Hedging markers >3 per paragraph | no_ai_slop_writing_rules | Detection reference |
| Fake stats / invented metrics = fail | hallmark gate 46, anti-slop R-17 | Both hard gates |
| No `as any` / `@ts-ignore` in app code | (framework spec) | Pillar 3, deterministic AST check |
| Swallowed exceptions fail | (framework spec) | Pillar 3, deterministic AST check |
| 35 UI tells (gradient, glassmorphism, Inter-everywhere…) | kill-ai-slop | taxonomy.md, regexes in detection.md |

### 6.3 Gaps the framework must close itself

No reference repo provides these: they are our build scope:

1. **Code-quality slop checks**: dead code, speculative abstractions, broad excepts, comment bloat, backend/architecture smells. (slop-scan/code-humanizer are seeds, not a framework.)
2. **Executable enforcement layer**: most rules are prompt text enforced by model self-discipline; we need a real CLI + CI gate.
3. **Prose detection inside diffs/PRs**: peakoss counts emojis; nobody reads prose in PRs.
4. **Unified tiered, tunable rules engine**: all references are flat hard bans; no severity/context config.
5. **Content verification**: "no invented stats" is a rule everywhere, nowhere validated.
6. **Slop regression measurement**: no project tracks slop over time; no baseline/score exists.
7. **A11y automation in CI**: pa11y exists but is not wired into the anti-slop gate.
8. **Multilingual**: EN + 中文 (talk-normal) + 1 Russian example; nothing else.
9. **Arbitrary voice profiling**: Rossmann is one person; questionnaire is manual.

---

## 7. Development Plan: Building the zero-slop Framework

### 7.1 Architecture: the 4-layer model

```
Layer 0  Knowledge    → consolidated tells database (JSON, source-attributed)   [HAVE: 25 repos]
Layer 1  Generation   → agent skills/prompts that prevent slop at write time    [HAVE: references]
Layer 2  Enforcement  → `zero-slop` CLI: prose + UI + code AST checks + CI gate [BUILD]
Layer 3  Measurement  → slop score, baselines, regression tracking              [BUILD]
```

### 7.2 Milestones

**M0: Consolidation (knowledge layer)**
- Merge ~200 tells into one canonical `rules/` database: banned words w/ thresholds, pattern families, UI-tell regexes, punctuation caps, statistical thresholds, AST patterns.
- Every rule carries: id, tier (error/warning/info), domain, source repo + rule number, test cases.
- Deliverable: `rules/*.json` + a rule-coverage matrix against all 25 repos.

**M1: `zero-slop` CLI (enforcement layer)**
- `zero-slop scan <path>`: runs all enabled check engines:
  - **prose**: banned words, em-dash cap (1/500), exclamation cap (1/1000), sentence-length variance, hedging density, paragraph uniformity, transition density, weasel words (write-good rules), markdown hygiene.
  - **ui-tells**: regex scanner adapted from kill-ai-slop `scan.mjs` (35 tells, file:line output, `deslop-ignore`-style suppression).
  - **code-ast**: swallowed exceptions, `as any`/`@ts-ignore`, comment bloat, dead/ghost branches, speculative abstractions (seed: slop-scan, code-humanizer patterns).
  - **commit**: conventional-commit lint (seed: commitlint rules).
  - **a11y**: contrast check (seed: anti-slop `contrast-check.py`), optional pa11y hook.
- Severity tiers + per-rule config file (`zero-slop.json`), `--only/--skip/--exclude`, JSON output, exit codes (0 / warn / error). Patterned after peakoss `max-failures` thresholding.
- Deliverable: installable CLI with unit-tested check engines.

**M2: CI integration**
- `zero-slop-action` GitHub Action: runs scan on PR diffs, posts a findings report, fails on error-tier rules; wired alongside commitlint-action and pa11y-ci.
- Honesty/verification check: flag unsourced quantitative claims in PR descriptions and copy.
- Deliverable: reusable Action + example workflow.

**M3: Measurement (layer 3)**
- Slop score = weighted failures / scanned units; per-domain breakdown.
- Baseline snapshot + regression diff in CI (score must not increase vs baseline).
- Deliverable: `zero-slop report`, `zero-slop baseline`, trend in CI summaries.

**M4: Agent skill distribution**
- Package the consolidated rules as standard agent skills (Claude Code / Codex / Antigravity) referencing the CLI, plus `DESIGN.md` handoff pattern from anti-slop.
- Deliverable: skills package + picker install flow.

### 7.3 Design constraints: Learned from the references

- **Filter, not style guide**: no prescribed colors/fonts; direction comes from `DESIGN.md` (anti-slop R-37).
- **Triage over auto-fail**: tell is slop only when it's an unchosen default; respect authorship (kill-ai-slop governing philosophy).
- **Positive requirements, not just bans**: liveliness dials (ENERGY/RHYTHM/MOTION), evidence over claims (anti-slop).
- **False-positive prevention**: exclusion zones for quotes/code, context-aware severity (no_ai_slop_writing_rules).
- **Measured, not asserted**: every check ships with test fixtures; regression-tested like talk-normal.

---

## 8. Agent Framework Decision: Verified 2026-08-17

### 8.1 Three Choice Layers

"Agent framework" splits into three layers; a framework picks one per layer:

**A. Orchestration** (graph/pipeline engines): LangGraph (Python, 39.8k★, MIT, 1.0: deterministic StateGraph + checkpointers + Store; fit 5/5) · Mastra (TS, 27.2k★, Apache-2.0, 1.0: workflows + agents + evals + MCP both ways; fit 4.5/5) · Google ADK (Python/TS, 21.1k★, Apache-2.0, 2.0 graph engine + evals, GCP-lean, API churn; 4/5) · CrewAI (57.2k★, role crews, no durable exec, enterprise paywalled; 3/5) · AutoGen (**maintenance mode**, superseded by Microsoft Agent Framework; do not use) · Semantic Kernel (foundation layer only; agents moved to MAF).

**B. SDK-first backbones**: Pydantic AI (Python, 19.3k★, v2, best typed structured outputs + durable execution via Temporal/DBOS; 5/5) · Vercel AI SDK (TS, 26.2k★, v7, ToolLoopAgent/WorkflowAgent, 100+ providers incl. local; 4/5) · OpenAI Agents SDK (28.7k★, best handoffs + tracing, OpenAI-centric, 0.x churn; 4/5) · Claude Agent SDK (7.9k★, Claude Code loop as a library + hooks, Claude-only lock-in; 4/5 for remediation) · smolagents (28.8k★, barebones, code-executing, maintenance cadence; 3/5) · DSPy (37.3k★: **not a runtime: the measurement/optimization layer**, compile the audit rubric against a golden corpus; 5/5 for that role).

**C. Protocol and Runtime** (how the agent ships): Agent Skills standard (5/5: one portable `SKILL.md` folder works in Claude Code, Codex, opencode, Cursor unchanged) · MCP (5/5: stateless spec 2026-07-28; universal tool surface) · Agent Plugins v1.0 (4/5: distribution wrapper bundling skills + MCP server; steering committee includes Amazon/Cursor/Microsoft/OpenAI/Vercel) · client hooks (opencode `tool.execute.before`, Claude Code Pre/PostToolUse: the only true inline slop-blocking points) · OpenAI AG-1 gateway (**removed from GitHub, 404: dead**; client hooks replace it).

### 8.2 Decision: TypeScript + Mastra, layered

Rationale: the enforcement product is npm-native: every deterministic engine we adapt is JS (kill-ai-slop `scan.mjs`, write-good, commitlint, pa11y), and GitHub Actions run Node natively. Python backbones (LangGraph, Pydantic AI) would split the stack. Claude Agent SDK is the one complementary exception (remediation alongside coding agents) but is Claude-only: deferred.

```
┌──────────────────────────────────────────────────────────────┐
│  KNOWLEDGE   Agent Skills (portable SKILL.md): the tells    │
│  RUNTIME     MCP server (stateless): scan/score/explain/fix │
│  AGENT       Mastra: workflows (deterministic pipeline) +   │
│              agents (triage/fix) + evals (measurement)       │
│  ENFORCE     CLI + GitHub Action + harness hooks             │
└──────────────────────────────────────────────────────────────┘
```

- **Language**: TypeScript, Node ≥22.
- **Agent backbone**: Mastra 1.x (workflows own the deterministic scan sequence; agents do triage/fix reasoning; built-in evals measure detector precision/recall; MCP server exposes the audit as tools to every harness). Lighter alternative if needed: Vercel AI SDK v7 alone.
- **Exposure**: CLI (`zero-slop scan|check|gate|report|baseline`) + MCP server + GitHub Action + Agent Skills, wrapped as one Agent Plugin for one-command install.
- **Measurement**: golden slop corpus from `reference/` (25 repos already cloned) → Mastra evals; optionally DSPy-style rubric calibration later.
- **Explicitly rejected**: LangGraph/Pydantic AI (Python split), AutoGen (maintenance), OpenAI Agents SDK (OpenAI-centric), Claude Agent SDK as backbone (lock-in), AG-1 (dead).

### 8.3 Revised milestones: Framework mapped

- **M0: Consolidation ✅ (delivered 2026-08-17)**: `rules/` JSON database: **249 canonical rules across 7 domains** (prose 72, ui 75, code 36, commit 20, integrity 15, a11y 16, chat 15), every rule source-attributed to the 25 reference repos, tiered (error/warning/info), matcher-typed (regex/list/statistical/ast/semantic), with pass+fail fixtures. TS workspace scaffolded (pnpm, `@zero-slop/core` with zod-validated loader + `pnpm validate:rules` gate). Rules schema: `rules/README.md`.
- **M1: Core engines ✅ (delivered 2026-08-17)**: `@zero-slop/core` check engines: `scanText` (prose/chat/integrity), `scanFile` (ui + a11y + code + prose-on-markdown), `scanCommitMessage`. 78/102 text rules, 57/91 ui/a11y regex rules, 20/36 code rules, 11/20 commit rules executable (semantic → M3 agent; contrast/statistical UI → M1.5 CSS parsing). 265 tests, all 249 rules' fixtures verified, `pnpm test` + `pnpm typecheck` green.
- **M1.5: Skill-audit fold ✅ (delivered 2026-08-17)**: audited 69 globally-installed skills.sh anti-slop skills (3 scouts, ~350 candidates) and folded the highest-value ~140 into the rules DB → **389 rules** (prose 119, ui 117, code 51, commit 24, integrity 27, a11y 28, chat 23). New coverage: tiered AI vocabulary (avoid-ai-writing), false agency/anthropomorphism/X-is-real (unslop), tropes catalog (deslop), CJK analytical tells (de-ai-writing) + Chinese web-fiction metrics (story-deslop), markup/citation fingerprints (ai-writing-detection), premium-consumer palette hexes + eyebrow/hero/motion budgets (design-taste-frontend, frontend-design-deslop, emil-design-eng), WCAG 2.2 + focus spec + sr-only (better-accessibility, wcag-accessibility-audit), Frappe code patterns + line/class gates. New engine metrics: typeTokenRatio, verdict-gated wordCount, corroboratingSignals, file/class line counts, commit list matcher. 408 tests green.
- **M2: CLI + CI**: `zero-slop` CLI (commander) + `zero-slop-action` GitHub Action with PR report; wired alongside commitlint-action + pa11y-ci.
- **M3: Agent + measurement**: Mastra workflows (scan graph), triage agent, evals against golden corpus, slop score + baseline regression in CI.
- **M4: Distribution**: Agent Skills package + MCP server + Agent Plugin + picker installer.
