---
name: slop-audit-code
description: Audit a diff for AST-level code slop — swallowed errors, type escapes, wrappers, duplication, dead code — before merging. Triggers on "audit code", "review this diff", "is this sloppy", error-handling or dead-code review requests.
---

# Slop Audit Code

**Goal:** Catch code slop that reads as working but rots the codebase — swallowed errors, type-system escapes, pass-through wrappers, copy-pasted helpers, dead scaffolding. Deterministic checks live in `rules/code.json`; run `zero-slop scan` as the first pass.

**Philosophy:** Slop is an unchosen default, not malice. The CLI flags candidates; the agent judges whether a finding is intentional (e.g. a deliberate local fallback with a typed result, a justified suppression) or real rot.

**Constraints:**
- Cite every finding as `rules/code.json#<rule-id>`; never invent rules or thresholds.
- Review criteria and line gates cite their own rule ids (ZS-CODE-032 comment cap, ZS-CODE-045 file size, ZS-CODE-048 god class).
- Secondary craft guidance may cite `reference/fast-agent/typesafe.md` (narrow suppressions), `reference/hermes-agent-self-evolution` (self-review discipline), and `reference/agent-skills-for-context-engineering` (context-sized modules).
- Keep fixes minimal: delete or fold into the existing helper; never add an abstraction to fix an abstraction.

**Checks (point at CLI + rules JSON):**
- Error handling: never log-and-continue (ZS-CODE-001), default-on-catch (ZS-CODE-002), empty catch (ZS-CODE-003), promise `.catch()` sentinels (ZS-CODE-004), stringified unknowns (ZS-CODE-005), broad/bare except (ZS-CODE-023, ZS-CODE-038), generic-before-specific handlers (ZS-CODE-050), generic or empty messages (ZS-CODE-043), messages without change context (ZS-CODE-047), non-Exception error classes (ZS-CODE-044). Prefer rethrow, a typed result, or a proven-safe fallback.
- Type escapes: no generic status envelopes (ZS-CODE-006), no `Record<string, unknown>` casts on parsed payloads (ZS-CODE-007), no `as any` / double-cast / ts-ignore (ZS-CODE-008), no unjustified try-import fallbacks (ZS-CODE-024), no hasattr/getattr ladders (ZS-CODE-025), no wildcard imports (ZS-CODE-037). Prefer narrow named types; suppressions need a rule name plus a reason (see `reference/fast-agent/typesafe.md` targeted-suppression pattern).
- Structure and duplication: no pass-through wrappers (ZS-CODE-010), no async ceremony (ZS-CODE-011), no copy-pasted signatures (ZS-CODE-012) or mock setups (ZS-CODE-013), no reimplemented helpers (ZS-CODE-017), no `_v2` clones (ZS-CODE-018), no reinvented stdlib/deps (ZS-CODE-019), no single-implementation abstractions (ZS-CODE-020), no config sprawl for a local case (ZS-CODE-022), no 1000-line files (ZS-CODE-045) or 500-line god classes (ZS-CODE-048), no fan-out hotspots or wrapper forests (ZS-CODE-014, ZS-CODE-016). Fold into the existing helper; migrate every caller.
- Comments, tests, review gates: no placeholder promises (ZS-CODE-009), no narrating or boilerplate docs (ZS-CODE-027, ZS-CODE-028), no dead imports/banners (ZS-CODE-029), no paranoid re-validation (ZS-CODE-026), no mock-only or trivial assertions (ZS-CODE-030, ZS-CODE-031), max 10 added comments per change (ZS-CODE-032), no untracked TODO without a ticket (ZS-CODE-049), magic numbers get names (ZS-CODE-040), `== None` becomes `is None` (ZS-CODE-039).
- Agent-code discipline: no dead interactive elements (ZS-CODE-033), never patch files via string-rewriting scripts (ZS-CODE-034), verify by running before delivering (ZS-CODE-035), real data or honest placeholder (ZS-CODE-036), no unjustified lint suppressions in code or config (ZS-CODE-041, ZS-CODE-042), no unfiltered destructive DB calls (ZS-CODE-046), no interpolated SQL (ZS-CODE-051).
- Type-escape gates, JS/TS: no chained `as A as B` (ZS-CODE-053), no open `Record<string, unknown|any|object>` value types (ZS-CODE-055), no conditional `{}` spread to omit a field (ZS-CODE-054), no module mocking (`vi.mock`/`jest.mock`, ZS-CODE-052). Source: reference/dmmulroy/anti-slop:README.md#rules.
- Simplification gates: redundant boolean return (ZS-CODE-058), `await` inside a loop body (ZS-CODE-060), eager `useState(call())` initializer (ZS-CODE-062), JSX `{count && <X/>}` on a falsy-capable value (ZS-CODE-061). Source: reference/addyosmani/agent-skills:skills/code-simplification/SKILL.md;reference/vercel-labs/agent-skills:skills/react-best-practices/rules.
- Dead-code markers: `// removed`, `// unused`, `// dead code`, `// no longer used`, `// might be useful later`, `// kept for backwards compat` are tombstones — delete the code instead of annotating it (ZS-CODE-059). Source: reference/addyosmani/agent-skills:skills/code-review-and-quality/SKILL.md.

## Gotchas
- **Log-and-rethrow looks like log-and-continue:** the warn is fine; the missing `throw` is the bug (ZS-CODE-001).
- **Helpful default that hides an outage:** catch returning `[]` turns a down service into silently empty UI — surface the failure (ZS-CODE-002, ZS-CODE-004).
- **`String(error)` in a telemetry call:** collapses stack, cause chain, and structured fields into one flat line (ZS-CODE-005).
- **`as unknown as T` counted as safe:** the double-cast is the same escape as `as any`, just longer (ZS-CODE-008).
- **Narrow suppression copied file-wide:** a justified `# noqa` on one line pasted into five files is five unjustified suppressions (ZS-CODE-041).
- **Wrapper with one added log line:** still a pass-through unless the log carries fields no caller has (ZS-CODE-010).
- **`foo_v2` kept "for safety":** two sources of truth; migrate callers and delete the original (ZS-CODE-018).
- **Mock-only test that passes on broken code:** every collaborator stubbed, assertion on call counts — delete and test observable behavior (ZS-CODE-030).
- **Index the repo before accusing duplication:** grep `utils`/`helpers`/`common`, validators and base classes first — you cannot recognise a reimplementation of a helper you never found (reference/code-humanizer:SKILL.md).
- **Cluster before you accuse:** one narrating comment is nothing; narration plus a single-impl registry, a `_v2` and an unused export in one PR is a confession (ZS-CODE-018, ZS-CODE-020; reference/code-humanizer:SKILL.md). Report low severity when in doubt.
