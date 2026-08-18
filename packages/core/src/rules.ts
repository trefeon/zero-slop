import { z } from "zod";

export const DOMAINS = [
  "prose",
  "ui",
  "code",
  "commit",
  "integrity",
  "a11y",
  "chat",
] as const;
export type Domain = (typeof DOMAINS)[number];

export const TIERS = ["error", "warning", "info"] as const;
export type Tier = (typeof TIERS)[number];

export const KINDS = ["regex", "list", "statistical", "ast", "semantic"] as const;
export type Kind = (typeof KINDS)[number];

const SourceSchema = z.object({
  repo: z.string().min(1),
  rule: z.string().min(1),
  ref: z.string().optional(),
});
export type RuleSource = z.infer<typeof SourceSchema>;

const TestSchema = z.object({
  label: z.string().min(1),
  input: z.string(),
  expect: z.enum(["fail", "pass"]),
});
export type RuleTest = z.infer<typeof TestSchema>;

const ParamsSchema = z.record(z.string(), z.unknown());

const MatcherSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("regex"),
    pattern: z.string().min(1),
    params: ParamsSchema.optional(),
  }),
  z.object({
    type: z.literal("list"),
    terms: z.array(z.string()).min(1),
    params: ParamsSchema.optional(),
  }),
  z.object({
    type: z.literal("statistical"),
    metric: z.string().min(1),
    params: ParamsSchema.optional(),
  }),
  z.object({
    type: z.literal("ast"),
    pattern: z.string().min(1),
    params: ParamsSchema.optional(),
  }),
  z.object({
    type: z.literal("semantic"),
  }),
]);
export type RuleMatcher = z.infer<typeof MatcherSchema>;

const RuleSchema = z.object({
  id: z.string().regex(/^ZS-[A-Z0-9]+-\d{3}$/, "id must be ZS-<DOMAIN>-NNN"),
  domain: z.enum(DOMAINS),
  title: z.string().min(1),
  summary: z.string().min(1),
  tier: z.enum(TIERS),
  kind: z.enum(KINDS),
  matcher: MatcherSchema,
  source: z.array(SourceSchema).min(1, "rule must cite at least one source repo"),
  tests: z.array(TestSchema).min(2, "rule needs at least two tests"),
  notes: z.string().optional(),
});
export type Rule = z.infer<typeof RuleSchema>;

export { SourceSchema, TestSchema, MatcherSchema, RuleSchema };
