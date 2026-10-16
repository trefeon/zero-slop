# UI reference, mirrored from slop-audit-ui
# Slop audit: UI

## Goal

Judge whether a UI's visual choices are deliberate or unchosen defaults.
The deterministic layer is `zero-slop scan` plus `rules/ui.json` (141 checks,
`ZS-UI-001`–`ZS-UI-141`); the CLI flags candidates, you judge intentionality.
A flag is slop only when the pattern carries no brief-backed reason: a purple
brand, a food site in warm tones, an ordered 3-step flow all pass.
Deep copy-voice issues (chat/caption tone, banned openers beyond UI labels)
belong to the prose skill; this skill covers what is seen and laid out.

## Constraints

- Cite every finding as `rules/ui.json#<rule-id>` (budgets below carry cites).
- Quote the concrete budget (hex, count, ms, ch); never "too many" or "too slow".
- One finding per pattern instance; group repeats by rule, not by element.
- Purpose-gate each flag: name the brief reason that would excuse it, then
  rule it slop only when no such reason exists.
- Prefer deletion or a token change over a redesign; never invent replacement
  copy, stats, testimonials, or logos to "fix" a section (see integrity rules).

## Checklist

### Color and surface

| Tell | Budget | Cite |
|---|---|---|
| Indigo→violet gradient (`#6366f1`/`#8b5cf6`/`#a855f7`/`#7c3aed`, `from-indigo→to-purple`, purple glow) | Ban as default; exempt a genuine purple brand | `rules/ui.json#ZS-UI-001` · `reference/hallmark/skills/hallmark/references/color.md` |
| Gradient headline text (`bg-clip:text`, `background-clip: text`) | Ban; no genre allows gradient text (logo wordmark may defend one) | `rules/ui.json#ZS-UI-002` · `reference/hallmark/skills/hallmark/references/slop-test.md` |
| Accent hue in OKLCH H 250–320 (indigo/violet/purple) | Pick an uncontested hue unless the brief demands purple | `rules/ui.json#ZS-UI-093` · `reference/stitch-skills/plugins/stitch-utilities/skills/taste-design/SKILL.md` |
| Pure `#000` / `#fff` base | Tone: paper `oklch(96–98%)`, ink `oklch(16–22%)`; dark paper L 12–18%, never `#000` | `rules/ui.json#ZS-UI-007` · `reference/hallmark/skills/hallmark/references/color.md` |
| Zero-chroma neutrals (`oklch(... 0 ...)`) | Minimum 0.005 chroma toward the anchor hue | `rules/ui.json#ZS-UI-008` · `reference/hallmark/skills/hallmark/references/slop-test.md` |
| Palette overflow | 2–3 core + 1 accent, max 5 distinct colors per page (neutrals excluded) | `rules/ui.json#ZS-UI-009` |
| Accent coverage | Accent ≤ ~5% of any viewport (atmospheric blooms ≤ ~20%) | `rules/ui.json#ZS-UI-012` · `reference/hallmark/skills/hallmark/references/color.md` |
| Warm-cozy wash (`amber/stone-50–300` on beige `#fdf6ec` family) | Ban as default; exempt food/craft brands whose identity is warm | `rules/ui.json#ZS-UI-003` |
| Premium warm-craft family (beige `#f5f1ea`/`#f7f5f1`/`#efeae0`, brass `#b08947`, clay `#b6553a`, espresso `#1a1714`) | Ban as default reach; allowed only when the brief names it | `rules/ui.json#ZS-UI-076` |
| Stock semantic pairs (`bg-blue/amber/green/red-50` + `-600` text) | Grow states from one palette; color only states that truly differ | `rules/ui.json#ZS-UI-004` |
| One-hue status box (border/text/bg all one hue) | Muted accent on neutral; carry state in words first | `rules/ui.json#ZS-UI-005` |
| Gray text on a colored surface | Use the surface hue, darker/desaturated — never gray | `rules/ui.json#ZS-UI-094` · `reference/hallmark/skills/hallmark/references/color.md` |
| Dark-mode elevation via shadow | Base darkest surface L 8–12% (`#121212` ref); elevate by +~3% lightness per level, text off-white | `rules/ui.json#ZS-UI-099` · `reference/hallmark/skills/hallmark/references/color.md` |
| Aurora blobs / floating orbs | Ban ambient gradient blobs; ≤2 warm radial blooms only when the canvas is the design | `rules/ui.json#ZS-UI-061` |
| Palette token named by appearance, component or number (`--color-blue-button`, `--color-sidebar-gray`, `--color-text-2`, `--color-gray-hover`); a token borrowed outside its role | Name the job, not the value, screen or position; ramps stay primitives | `rules/ui.json#ZS-UI-118` · `rules/ui.json#ZS-UI-119` · `reference/jakubkrehel/skills:skills/better-colors/token-naming.md` |
| Contrast | Body 4.5:1 (APCA Lc ≥ 60); large text/icons/focus 3:1 (Lc ≥ 45); button text ≠ fill (ΔL > 5%, ΔC > 0.05) | `rules/ui.json#ZS-UI-007` notes · `reference/hallmark/skills/hallmark/references/slop-test.md` (gates 40–41) |

### Typography

| Tell | Budget | Cite |
|---|---|---|
| Default faces (Inter/Roboto/Poppins/system) as the unchosen start | Landing on a face after comparison is a choice; starting there is not | `rules/ui.json#ZS-UI-015` · `reference/hallmark/skills/hallmark/references/slop-test.md` (gate 1) |
| LLM display serifs (Fraunces, Instrument Serif; also Space Grotesk/Geist as defaults) | Use only with explicit brand justification | `rules/ui.json#ZS-UI-092` · `reference/stitch-skills/plugins/stitch-utilities/skills/taste-design/SKILL.md` |
| Flat hierarchy (headings 14–18px, gray shades doing the work) | Scale steps ≥ 1.25×; merge sizes within ~2px | `rules/ui.json#ZS-UI-022` · `reference/jakubkrehel-skills/skills/better-typography/SKILL.md` |
| More than three families | Ceiling 3: display + body + 1 outlier; mono in non-code UI counts | `rules/ui.json#ZS-UI-023` · `reference/hallmark/skills/hallmark/references/typography.md` |
| Outlier face in > 2 slots | Wordmark + hero stat is the canonical pair; a third slot collapses to body | `rules/ui.json#ZS-UI-023` notes · `reference/hallmark/skills/hallmark/references/slop-test.md` (gate 38) |
| Italic headings / serif-italic emphasis word | Headers roman; emphasis via weight, color, or underline | `rules/ui.json#ZS-UI-016` · `reference/hallmark/skills/hallmark/references/slop-test.md` (gate 38a) |
| Prose measure | 45–75ch, default 65ch | `rules/ui.json#ZS-UI-024` · `reference/hallmark/skills/hallmark/references/typography.md` |
| One tracking value for all sizes | Negative tracking for display, near-0 for body | `rules/ui.json#ZS-UI-117` · `reference/jakubkrehel-skills/skills/better-typography/spacing-and-sizing.md` |
| Data figures in proportional type (density > 7) | `font-variant-numeric: tabular-nums` or monospace | `rules/ui.json#ZS-UI-115` · `reference/stitch-skills/plugins/stitch-utilities/skills/taste-design/SKILL.md` |
| Monospace UI chrome on non-code labels | Mono belongs to code and true terminal aesthetics | `rules/ui.json#ZS-UI-025` |

### Layout, hero, sections

| Tell | Budget | Cite |
|---|---|---|
| Hero overflow | Headline ≤ 2 lines; subtext ≤ 20 words AND ≤ 4 lines; top padding ≤ `pt-24` (6rem); ≤ 4 text elements (eyebrow-or-strip, headline, subtext, CTAs) | `rules/ui.json#ZS-UI-078` |
| Centered-everything hero (eyebrow+title+lede+CTA one axis, `min-h:100vh` stack) | At most two centered elements; eyebrow or CTA sits off-axis | `rules/ui.json#ZS-UI-047` · `reference/hallmark/skills/hallmark/references/slop-test.md` (gate 6) |
| Eyebrow above every section | Max 1 eyebrow per 3 sections (hero counts as one) | `rules/ui.json#ZS-UI-077` |
| Section-layout repetition | ≥ 4 layout families per 8 sections; each family once; image+text zigzag capped at 2 consecutive | `rules/ui.json#ZS-UI-080` · `reference/stitch-skills/plugins/stitch-utilities/skills/taste-design/SKILL.md` |
| Template macrostructure (hero → 3 features → CTA → footer) | Delete sections with no content; vary the fingerprint per page | `rules/ui.json#ZS-UI-045` · `reference/hallmark/skills/hallmark/references/slop-test.md` (gate 8) |
| Bento with blank tiles | N items → exactly N cells; reshape, never pad | `rules/ui.json#ZS-UI-081` |
| Nav wrapping or towering | Single line at ≥ 1024px; height ≤ 80px (default 64–72px) | `rules/ui.json#ZS-UI-083` |
| Full-height `h-screen` / `100vh` sections | `min-h-[100dvh]` (mobile dynamic-viewport jump) | `rules/ui.json#ZS-UI-107` · `reference/stitch-skills/plugins/stitch-utilities/skills/taste-design/SKILL.md` |
| Identical `py-*` on every section | Adjust optically; bottom often slightly larger | `rules/ui.json#ZS-UI-109` · `reference/jakubkrehel-skills/skills/better-layout/spacing-and-adaptivity.md` |
| One gap everywhere (`gap-4`/`space-y-4` stamped flat) | Tight inside groups, generous between them | `rules/ui.json#ZS-UI-046` · `reference/jakubkrehel-skills/skills/better-layout/grouping-and-alignment.md` |
| Random dark section in a light page | A dark band needs a compositional reason, not rhythm relief | `rules/ui.json#ZS-UI-110` |
| Split header with floating filler sub-text | Split only when the right column carries a visual, not filler | `rules/ui.json#ZS-UI-082` |

### Components and decoration

| Tell | Budget | Cite |
|---|---|---|
| Icon-tile feature grid (icon-above-heading × N) | Icon carries meaning or goes; label + sentence beats glyph rows | `rules/ui.json#ZS-UI-027` · `reference/hallmark/skills/hallmark/references/slop-test.md` (gate 3) |
| Cards in cards; left-stripe cards; icon-in-own-tint | Child surface only for a separate object; lists stay lists; containers opaque, not icon-tints | `rules/ui.json#ZS-UI-028` · `rules/ui.json#ZS-UI-029` · `rules/ui.json#ZS-UI-030` |
| Generic card boundary (1px gray border or harsh shadow everywhere) | Hairline only between genuinely distinct content; tint shadows to the bg hue | `rules/ui.json#ZS-UI-106` · `reference/stitch-skills/plugins/stitch-utilities/skills/taste-design/SKILL.md` |
| Hairline border + wide diffuse shadow on one element | Pick one separator, not both ("ghost card") | `rules/ui.json#ZS-UI-096` |
| Oversized / glowing shadows | Tight, dark, sparing; on dark surfaces elevate by lightness | `rules/ui.json#ZS-UI-033` · `rules/ui.json#ZS-UI-034` |
| Pill-everything (`rounded-full` on all) | One generous CTA radius may be intentional; uniform pills are default | `rules/ui.json#ZS-UI-032` |
| Blob rounding on small cards (`rounded-3xl`/≥24px) | Small cards ≤ 16px radius; large radii belong to hero panels | `rules/ui.json#ZS-UI-095` |
| Badge/pill spam, glowing status dots, decorative nav dots | Badge only for live state; dot only with a label word and a real state | `rules/ui.json#ZS-UI-036` · `rules/ui.json#ZS-UI-037` · `rules/ui.json#ZS-UI-085` |
| Glassmorphism as default surface | Glass only to communicate overlay depth over content | `rules/ui.json#ZS-UI-031` |
| Cliché glyphs (sparkle/rocket-for-launch/shield-for-security) and emoji-as-icon | One icon set per page (Lucide/Phosphor/Heroicons); label does the work | `rules/ui.json#ZS-UI-059` · `rules/ui.json#ZS-UI-111` · `rules/ui.json#ZS-UI-063` |
| Mixed icon sets; default set with zero customization | Pick one set, customize stroke/radius, or drop the icon | `rules/ui.json#ZS-UI-100` · `reference/hallmark/skills/hallmark/references/slop-test.md` (gate 30) |
| Arbitrary `z-50` / `z-[9999]`; `transition-all`; layout-property animation | Named z-scale; transition named properties only; never width/height/top/left | `rules/ui.json#ZS-UI-108` · `rules/ui.json#ZS-UI-051` · `reference/jakubkrehel-skills/skills/better-ui/animations.md` |
| Re-drawn OS chrome (fake browser dots, wrong URL bar) | Show content; never imitate the OS | `rules/ui.json#ZS-UI-049` |
| Div-built "screenshots" of a real product | Real capture or an honest labeled placeholder | `rules/ui.json#ZS-UI-088` |
| Missing favicon; custom cursor | Ship a favicon; no custom cursors | `rules/ui.json#ZS-UI-112` · `rules/ui.json#ZS-UI-114` |
| Hero or scene `<video>` without a `poster`; autoplay that is not `muted` | Every video carries a poster; autoplay starts muted or not at all | `rules/ui.json#ZS-UI-133` · `rules/ui.json#ZS-UI-134` · `reference/agiwhitelist/auteur:scripts/slopscan.mjs` |

### Motion

| Tell | Budget | Cite |
|---|---|---|
| State-change duration | 0.2–0.3s ease; < 0.15s jarring, > 0.4s laggy | `rules/ui.json#ZS-UI-057` |
| Duration by size | Press 100–160ms; tooltip 125–200ms; dropdown 150–250ms; modal/drawer 200–500ms; most UI < 300ms | `rules/ui.json#ZS-UI-105` · `reference/jakubkrehel-skills/skills/better-ui/enter-exit.md` |
| Duration over 500ms | Motion vocabulary tops out at 500ms (100/200/300/500); spinner/keyframe shorthand is the documented exception | `rules/ui.json#ZS-UI-139` · `reference/plugin87/ux-ui-agent-skills:tokens/motion.json` |
| `ease-in` on entrances; authored-easing fingerprint | Exits/`ease-out` or custom; plain `ease-in` on enter is the tell | `rules/ui.json#ZS-UI-101` · `rules/ui.json#ZS-UI-097` |
| Scale-from-zero entrances; overshoot springs on state change | No `scale(0)` origin; reserve overshoot for physical gestures | `rules/ui.json#ZS-UI-098` · `rules/ui.json#ZS-UI-052` · `reference/jakubkrehel-skills/skills/better-ui/animations.md` |
| Hover gated wrong; keyboard action animated | Hovers behind `@media (hover:hover) and (pointer:fine)`; focus rings instant, never transitioned | `rules/ui.json#ZS-UI-103` · `rules/ui.json#ZS-UI-104` · `reference/hallmark/skills/hallmark/references/slop-test.md` (gate 15) |
| Endless pulses, scroll-jacking everything, wobbling spinners | Loops only for true loading; hero speaks, the rest stays calm; center art outside the animated transform | `rules/ui.json#ZS-UI-054` · `rules/ui.json#ZS-UI-055` · `rules/ui.json#ZS-UI-053` |
| No `prefers-reduced-motion` fallback | Every transform/animation gets a reduced-motion alternative | `rules/ui.json#ZS-UI-056` · `reference/hallmark/skills/hallmark/references/slop-test.md` (gate 27) |

### Page copy and proof, UI-visible; voice depth defers to prose

| Tell | Budget | Cite |
|---|---|---|
| Invented stats, fake testimonials/people, fabricated trust claims | Error: replace with `—` + grey block or honest empty state; proof must be verifiable | `rules/ui.json#ZS-UI-070` · `rules/ui.json#ZS-UI-071` · `rules/ui.json#ZS-UI-072` |
| Dead links/controls to nowhere | Error: `// TODO` + visible "Coming soon", or remove | `rules/ui.json#ZS-UI-074` |
| Generic CTAs ("Learn more", "Click here", "Oops") | One primary action per screen; link text stands alone | `rules/ui.json#ZS-UI-066` · `rules/ui.json#ZS-UI-067` |
| Duplicate CTA intent ("Get started" + "Try free" + "Sign up") | One label per intent, used everywhere | `rules/ui.json#ZS-UI-079` |
| Placeholder names (Acme/Nexus), 01/02/03 ordinals, always-3-steps, "Trusted by" bars, middle-tier highlight, 4-column footer | Number only ordered things; prove claims; shape follows the real workflow | `rules/ui.json#ZS-UI-039` · `rules/ui.json#ZS-UI-040` · `rules/ui.json#ZS-UI-041` · `rules/ui.json#ZS-UI-042` · `rules/ui.json#ZS-UI-043` · `rules/ui.json#ZS-UI-068` |
| Metric-section tropes (`LABEL // YEAR` stamps, fake system metrics) | Same bar as invented stats: real and specific or gone | `rules/ui.json#ZS-UI-113` · `rules/ui.json#ZS-UI-089` |
| Locale/weather strips, version footers, scroll cues, poetic labels ("Overview", "Insights") | Delete unless the brief needs them; plain arrow glyph at most | `rules/ui.json#ZS-UI-084` · `rules/ui.json#ZS-UI-086` · `rules/ui.json#ZS-UI-087` · `rules/ui.json#ZS-UI-116` · `rules/ui.json#ZS-UI-091` |
| Fake-but-plausible filler in fields and columns (`johndoe@example.com`, "Let's build something") | Error: the labelled generic placeholder (`email@example.com`, `Your Name`) is the sanctioned form | `rules/ui.json#ZS-UI-120` · `reference/miqdadbadjuber/anti-slop:skills/antislop-ui/SKILL.md` |
| Starter-template copy still shipped (`Vite + React`, `Get started by editing app/page.tsx`) | Slop only while the shipped surface still carries the scaffold's identity; a real starter may defend it | `rules/ui.json#ZS-UI-132` · `reference/TheOrcDev/shadscan:packages/cli/src/rules/no-starter-copy.ts` |
| CTA or button label longer than four words ("Click here to get started today") | Verb plus object ("Get started."); an error reads "Email required.", not a polite sentence | `rules/ui.json#ZS-UI-135` · `reference/robzilla1738/svvarm:skills/svvarm/references/slop.md` |

## Gotchas

- **Gradient text is a hard fail, not a taste call.** `rules/ui.json#ZS-UI-002`
  is tier error and no Hallmark genre allows it; do not "soften" it to a
  warning because the hero looks nice otherwise.
- **Budgets combine: a 4-line hero headline is a font-size error**, never a
  copy-length error; shrink the size before cutting words
  (`rules/ui.json#ZS-UI-078`). Same logic for accent > `5%`: retreat the fill,
  don't re-hue it (`rules/ui.json#ZS-UI-012`).
- **`ease-in` versus `ease-in-out`.** Only the plain `ease-in` keyword on
  enter/state-change is banned (`rules/ui.json#ZS-UI-101`); `ease-in-out` is
  not flagged; don't expand the ban.
- **Two overlapping rules are not double counts.** Gray-on-color
  (`rules/ui.json#ZS-UI-094`) vs. the warm-ramp sibling
  (`rules/ui.json#ZS-UI-003`); default-set (`rules/ui.json#ZS-UI-100`) vs.
  mixed-sets (`rules/ui.json#ZS-UI-063`); ghost-card note
  (`rules/ui.json#ZS-UI-033`) vs. dedicated rule (`rules/ui.json#ZS-UI-096`).
  Cite the narrower one.
- **Genre exemptions are real.** Modern-minimal may use pure `#fff` paper and
  zero-chroma neutrals (`rules/ui.json#ZS-UI-007`, `rules/ui.json#ZS-UI-008`);
  atmospheric may center a hero and bloom to `~20%` (`rules/ui.json#ZS-UI-047`,
  `rules/ui.json#ZS-UI-012` notes). Check the genre before failing.
- **The CLI cannot see layout.** Eyebrow density, layout-family diversity,
  hero line-counts, and dark-elevation (`rules/ui.json#ZS-UI-077`,
  `#ZS-UI-078`, `#ZS-UI-080`, `#ZS-UI-099`) need eyes on the render; count
  them visually instead of grepping.
- **Heavy animation libraries for a still job** (Lottie/Three.js for a
  spinner or checkmark) lose to CSS/SVG (`rules/ui.json#ZS-UI-064`); and a
  claimed "cinematic" page that barely moves fails just as a calm page with
  scroll-jacking does (`rules/ui.json#ZS-UI-055`).
