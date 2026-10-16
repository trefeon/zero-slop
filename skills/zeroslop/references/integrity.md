# Integrity reference, mirrored from zeroslop-audit-integrity

## Goal

Catch fabricated credibility: numbers, proof, people, and sources the model invented to fill a layout. Slop here is an unchosen default; the model decorates instead of leaving an honest gap. The `zero-slop scan` CLI plus `rules/integrity.json` is the deterministic layer that flags candidates; the agent judges whether each flag is intentional content or an unchosen fill.

## Constraints

Flag a candidate only when it matches a cited check below. Every check cites its canonical source; never invent a rule.

**Fabricated numbers.** Round multipliers (`10x faster`), unsourced percentages (`+47% conversion`, `99.9% uptime`), bare scale counts (`10K+ users`, `120+ countries`), and `trusted by N+` bars are the canonical invented-metric pattern; a made-up figure is worse than no figure. Fix: replace with `—` in a labelled grey block, ask the user for the real metric, or drop the proof slot.
Sources: `rules/integrity.json#ZS-INTEGRITY-001`, `#ZS-INTEGRITY-002`, `#ZS-INTEGRITY-003`, `#ZS-INTEGRITY-004`.

**Fake social proof.** Fictional reviews, invented names/titles, AI avatars, assumed logos or profile photos, and `Trusted By` logo bars ship only as real content or an explicitly honest placeholder; never disguised as final. Same bar for compliance claims (`SOC 2`, `ISO 27001`, `enterprise-grade`): forbidden without real evidence.
Sources: `rules/integrity.json#ZS-INTEGRITY-005`, `#ZS-INTEGRITY-006`, `#ZS-INTEGRITY-015`.

**Invented stories and history.** Case studies, anecdotes, founding dates, launches, and milestones presented as real events must be real. Hypotheticals use `imagine`/`suppose` framing, never past-tense lived experience.
Sources: `rules/integrity.json#ZS-INTEGRITY-010`, `#ZS-INTEGRITY-011`.

**Quotes and attributions.** Never claim a person or org said something without a real, verifiable source; quotes must match the source exactly. Paraphrase with attribution or skip it; misattribution is a defamation risk, not a style choice.
Sources: `rules/integrity.json#ZS-INTEGRITY-007`.

**Citation verification.** `research shows`, `studies indicate`, `according to experts`, `independent testing confirms`, `analysts agree` are unfalsifiable hedges standing in for sources. Demand a named source with date (`a Databricks report from March 2026`), the test, and the result, or cut the claim. Verify the citation resolves before shipping: title exists, date matches, quoted words appear.
Sources: `rules/integrity.json#ZS-INTEGRITY-012`, `#ZS-INTEGRITY-021`.

**Structural tells.** A stat-led proof bar whose stats are decorative, and a hero whose sole headline is a giant number with no worded headline, are slop at the layout level; rebuild the section, don't just reword the number.
Sources: `rules/integrity.json#ZS-INTEGRITY-013`, `#ZS-INTEGRITY-014`.

**Placeholder hygiene.** Filler (`Lorem ipsum`, `TBD`), slot-fillers (`[Your Name]`, `[INSERT SOURCE URL]`, `2025-XX-XX`, `|url=URL`), placeholder names (`Jane Doe`, `Acme`, `Nexus`), and model-guessed asset URLs (`images.unsplash.com/photo-<id>`, use `picsum.photos` or SVG instead) must be explicitly labeled as placeholders; never shipped as final.
Sources: `rules/integrity.json#ZS-INTEGRITY-008`, `#ZS-INTEGRITY-009`, `#ZS-INTEGRITY-020`, `#ZS-INTEGRITY-023`, `#ZS-INTEGRITY-027`.

**Pasted-tool fingerprints.** Leaked chat-tool tokens (`citeturn0search1`, `oai_citation`, `[attached_file:1]`, `↩`), auto-appended tracking (`utm_source=chatgpt.com`, `utm_source=openai`, `utm_source=copilot.com`), zero-width characters, and homoglyph swaps are near-definitive evidence of uncleaned pastes or detection-evasion tricks; strip and re-verify surrounding claims.
Sources: `rules/integrity.json#ZS-INTEGRITY-016`, `#ZS-INTEGRITY-017`, `#ZS-INTEGRITY-018`, `#ZS-INTEGRITY-019`.

**Detection humility.** TTR below 0.40 on 200+ words earns a second look, never a verdict. Never make high-confidence AI-authorship claims on texts under 200 words, and never flag on a single indicator; require 2–3 corroborating signals from different categories (4+ for `likely AI`), and never inject a stock voice (manufactured stakes, forced contrarianism, performed candor, fake first person) while rewriting.
Sources: `rules/integrity.json#ZS-INTEGRITY-024`, `#ZS-INTEGRITY-025`, `#ZS-INTEGRITY-026`, `#ZS-INTEGRITY-022`.

**Speculative gap-filling.** `likely founded in the 1990s`, `while details are limited`, `maintains a low profile`; a hedge wrapped around an invented fact is fabrication, not hedging style. Say the record is silent, or cut the sentence.
Sources: `rules/integrity.json#ZS-INTEGRITY-029`.

**Provenance is not proof.** `official`, `community`, a risk label or an unqualified `verified` badge identifies origin, never current maintenance, efficacy or security; and a heuristic score is not merge authority. The outlet-list and follower-count slice is machine-checked by `rules/integrity.json#ZS-INTEGRITY-028`; the badge and label claims stay review-only.
Sources: `rules/integrity.json#ZS-INTEGRITY-028`.

**Verdict wording.** A score is never presented as proof and an accused person is never named: report `AI-like signals are present, but this is not proof`, with the confidence and the caveats, and ask for a longer sample below ~80 words.
Sources: `rules/integrity.json#ZS-INTEGRITY-031`.

**Evidence labels and counting.** A missing proof artifact downgrades the claim to `hypothesis` or `insufficient evidence`; a weak proxy (an HTTP 200, exit 0) is never proof of success. Never pad findings to reach a quota: every file, symbol, and line number was read, and an invented `file:line` is worse than an omitted finding.
Review-only: these labels are reader-assigned, never machine-assigned.

Deterministic layer: run `zero-slop scan` against `rules/integrity.json` first; treat its hits as candidates and apply the judgment above. Chat-domain copy (tone, formatting tics) belongs to the prose skill; this skill owns only verifiable-truth failures.

## Gotchas

- A real, sourced figure with a named benchmark passes; the tell is the round fabricated multiplier, not quantification itself (`rules/integrity.json#ZS-INTEGRITY-001` notes).
- `trusted by` with real, permissioned logos is fine; the ban is on the unverifiable count-plus-bar combo (`rules/integrity.json#ZS-INTEGRITY-003`).
- `[REAL DATA]`-style labels are tripwires for the user, not decorations for the reader; resolve them before ship.
- Single-indicator flags (`it says delve so it's AI`) are the canonical false positive; corroborate or stay silent (`rules/integrity.json#ZS-INTEGRITY-026`).
- Stripping a `utm_source=openai` parameter without re-checking the linked claim leaves the fabrication in place; fingerprints mark surrounding content as suspect (`rules/integrity.json#ZS-INTEGRITY-017`).
