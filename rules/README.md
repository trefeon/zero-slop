# Zero-Slop Rules Database

Canonical, machine-readable consolidation of ~200 anti-AI-slop tells extracted from the 25 reference repositories (`reference/`). This is the **knowledge layer** (Layer 0): consumed by the check engines (`packages/core`, M1+), the CLI, MCP server, and the agent.

## Domains

| File | Domain | Covers |
|---|---|---|
| `rules/prose.json` | prose | Banned words, pattern families, punctuation caps, rhythm/statistical checks, markdown hygiene |
| `rules/ui.json` | ui | Visual tells, typography, color, layout, motion, page copy |
| `rules/code.json` | code | AST-level code smells: swallowed exceptions, `any` escapes, comment bloat, dead/speculative code |
| `rules/commit.json` | commit | Commit message + PR hygiene: conventional format, length, author, emoji |
| `rules/integrity.json` | integrity | Honesty: fake stats, fabricated testimonials/logos/attributions, unlabeled placeholders |
| `rules/a11y.json` | a11y | Accessibility: contrast, focus, keyboard, hit targets |
| `rules/chat.json` | chat | Agent output shape: negation framing, filler openers, summary stamps, brevity |

## Rule schema: V1

One JSON array per domain file. Each rule:

```json
{
  "id": "ZS-PROSE-014",
  "domain": "prose",
  "title": "Em-dash cap: max 1 per 500 words",
  "summary": "The em dash (—) is the single most cited AI tell; cap at one per 500 words.",
  "tier": "error",
  "kind": "regex",
  "matcher": {
    "type": "regex",
    "pattern": "—",
    "params": { "maxPerWords": 500, "wordsWindow": 500 }
  },
  "source": [
    { "repo": "jalaalrd/anti-ai-slop-writing", "rule": "Em dashes: Maximum ONE per 500 words", "ref": "skills/anti-ai-slop-writing/SKILL.md" }
  ],
  "tests": [
    { "label": "over cap fails", "input": "It's not X: it's Y: and never Z: period.", "expect": "fail" },
    { "label": "single dash passes", "input": "One dash: only.", "expect": "pass" }
  ],
  "notes": "Applies to customer-facing copy and docs, not code comments."
}
```

### Fields

- **id**: `ZS-<DOMAIN-UPPER>-<NNN>` sequential per domain.
- **domain**: one of `prose | ui | code | commit | integrity | a11y | chat`.
- **title**: short imperative or descriptive name.
- **summary**: why this is slop (evidence-based, 1-2 sentences).
- **tier**: `error` (hard ban: always fail) | `warning` (purpose-gate: fail only when used as an unchosen default) | `info` (quality lock / consistency). Map from source: hard bans → `error`; "allowed with reason" → `warning`; consistency/hygiene → `info`.
- **kind**: `regex` | `list` (banned words/phrases) | `statistical` (rhythm thresholds) | `ast` (code pattern) | `semantic` (needs LLM/context judgment: no matcher, triage only).
- **matcher**: machine hint for the M1 engines.
  - `regex`: `{ "type": "regex", "pattern": "<js regex>", "params": {...} }`
  - `list`: `{ "type": "list", "terms": ["delve", "tapestry"], "params": { "caseSensitive": false } }`
  - `statistical`: `{ "type": "statistical", "metric": "<name>", "params": { "threshold": ..., "window": ... } }`
  - `ast`: `{ "type": "ast", "pattern": "<tree-sitter/ts pattern or description>", "params": {...} }`
  - `semantic`: `{ "type": "semantic" }` (no pattern: triage agent decides)
- **source**: array of `{ repo, rule, ref }`: every rule MUST trace to at least one reference repo. Merge duplicates across repos into one canonical rule with multiple sources.
- **tests**: ≥1 `pass` + ≥1 `fail` concrete fixture per rule. `input` is a real snippet; `expect` is `fail` (violates) or `pass` (clean). Statistical/semantic rules: use representative inputs.
- **notes** (optional): scope limits, exclusions, false-positive guidance.

### Extraction rules

1. Every rule must be attributable: no invented rules. If you find a tell in the references, cite it. Never add rules from your own opinion.
2. Deduplicate: when multiple repos ban the same thing (e.g., em dash), ONE canonical rule with all sources listed.
3. Keep the matcher faithful to the source (quote the source's own threshold/pattern when it has one).
4. Tests must be realistic: short real-world snippets, not strawmen.
5. Respect the "triage" philosophy: a tell is slop when it's an unchosen default. Capture that in `notes` for purpose-gate rules.
6. Exactness over coverage: a well-sourced 15-rule domain beats a padded 40-rule one.
