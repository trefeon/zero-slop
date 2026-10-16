---
name: slop-audit-a11y
description: Use when auditing UI for WCAG 2.2 AA failures — contrast, focus, keyboard, targets, reflow — before shipping, or when a request says "audit accessibility", "check a11y", "is this accessible", or asks for a contrast or focus review.
---

# Slop Audit A11y

**Goal:** Catch WCAG 2.2 AA failures that ship as unchosen defaults — grey text, missing focus rings, mouse-only widgets. Deterministic thresholds live in `rules/a11y.json`; run `zero-slop scan` as the first pass.

**Philosophy:** Slop is an unchosen default, not malice. The CLI flags candidates; the agent judges whether a finding is intentional (e.g. decorative image, genuine 2D table scroll) or a real barrier.

**Constraints:**
- Cite every finding as `rules/a11y.json#<rule-id>`; never invent thresholds. Canonical numbers: normal text 4.5:1, large text 3:1, non-text UI 3:1, hit targets 44px, focus ring 2px minimum, toast floor 5s, reflow 320px.
- Reuse verbatim thresholds; do not paraphrase numbers loosely.
- Secondary guidance (motion/focus craft) may cite `reference/hallmark/skills/hallmark/references/slop-test.md` and `reference/stitch-skills` contrast/motion notes.
- Keep fixes minimal: semantic HTML first, ARIA only as patch.

**Checks (point at CLI + rules JSON):**
- Contrast: normal text (ZS-A11Y-001), large text (ZS-A11Y-002), non-text UI incl. focus rings (ZS-A11Y-003). Compute the ratio, never eyeball (ZS-A11Y-004); check worst spot over photos/gradients, add scrim if needed (ZS-A11Y-005).
- Focus/keyboard: never bare `outline: none` (ZS-A11Y-006); ring must be visible, 3:1, >=2px (ZS-A11Y-007, ZS-A11Y-017); no mouse-only interactions (ZS-A11Y-008); logical tab order, Escape closes dialogs, never positive tabindex (ZS-A11Y-009, ZS-A11Y-025).
- Targets/feedback: hit targets >=44px (ZS-A11Y-010); never color-only status, pair with icon/text (ZS-A11Y-011).
- Motion/timers: reduced-motion fallback for every animation (ZS-A11Y-012); autoplay needs visible controls (ZS-A11Y-019); toast floor 5s with hover/focus pause (ZS-A11Y-020); toasts in a live region (ZS-A11Y-021).
- Semantics/names: semantic HTML over div-on-click (ZS-A11Y-013); alt text, empty alt for decorative (ZS-A11Y-014); every input labeled, placeholder is never a label (ZS-A11Y-015, ZS-A11Y-022); icon-only buttons named (ZS-A11Y-028); aria-hidden never on focusables (ZS-A11Y-026); no aria-label on role-less div/span (ZS-A11Y-027).
- Reflow/forced-colors: reflow at 200% zoom, no fixed-height clipping (ZS-A11Y-016); no min-width >=800px blocking 320px reflow (ZS-A11Y-023); sr-only via clip pattern, never display:none (ZS-A11Y-018); no forced-color-adjust:none without system colors (ZS-A11Y-024).
- Viewport/zoom: the meta viewport must not block zoom — no `user-scalable=no`/`0`, no `maximum-scale` below 2 (ZS-A11Y-029; reference/axe-core:lib/rules/meta-viewport.json;reference/equal-access:accessibility-checker-engine/src/v4/rules/meta_viewport_zoomable.ts).
- Custom controls: a `role="button"`/`role="tab"` with no Enter/Space handler is a finding, not a nitpick — ship the native element or the full APG key map (ZS-A11Y-030; reference/jakubkrehel-skills:skills/better-accessibility/semantics-and-aria.md).
- Autofill: identity fields (email/tel/password) need an `autocomplete` token, not just a label (ZS-A11Y-033; reference/jakubkrehel-skills:skills/better-accessibility/forms.md).
- Motion: an infinite animation needs a pause/stop control, and auto-rotating content pauses on hover and focus — loading spinners and skeleton pulses are the exceptions (ZS-A11Y-035; reference/jakubkrehel-skills:skills/better-accessibility/motion-and-zoom.md).
- SVG/icons: a non-decorative `<svg>` needs an accessible name; decorative icons get `aria-hidden="true"` plus `focusable="false"` (ZS-A11Y-037; reference/equal-access:accessibility-checker-engine/src/v4/rules/svg_graphics_labelled.ts;reference/accessibility-agents:skills/aria-specialist/SKILL.md).

## Gotchas
- **Grey-on-grey hallucination:** #555 on black "looks fine" but computes to 2.8:1 — always run the formula (ZS-A11Y-004).
- **One-spot contrast check:** verifying the dark corner of a hero photo while the headline sits over sky — check the lightest pixel under the text (ZS-A11Y-005).
- **2px ring in one theme only:** dark-mode ring verified, light-mode ring invisible — check every shipped theme plus forced-colors (ZS-A11Y-007).
- **sr-only with display:none:** hides from screen readers too; use the clip pattern with 1px boxes and nowrap (ZS-A11Y-018).
- **Positive tabindex "fix":** reordering focus with tabindex=5 instead of fixing DOM order — hijacks the whole page (ZS-A11Y-025).
- **Placeholder as label:** field looks labeled until the user types, then the name vanishes (ZS-A11Y-022).
- **Toast as only channel:** critical action inside an auto-dismissing toast with no live region — screen-reader users never hear it (ZS-A11Y-021).
