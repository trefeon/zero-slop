import type { Domain } from "../rules.js";

/**
 * Single source of truth for domain → engine routing.
 *
 * Every member of DOMAINS must appear here exactly once; the `Record<Domain, …>`
 * type makes a missing or unknown domain a compile error, and
 * test/dispatch.test.ts asserts the same parity at runtime. Adding a domain
 * without a route silently drops its rules — do not reintroduce domain lists
 * anywhere else; derive buckets from this table.
 */
export const DOMAIN_ROUTE: Record<Domain, "text" | "ui" | "code" | "commit"> = {
  prose: "text",
  chat: "text",
  integrity: "text",
  skill: "text",
  config: "text",
  ui: "ui",
  a11y: "ui",
  code: "code",
  commit: "commit",
};

/** The engine bucket a domain is routed to. */
export type DomainRoute = (typeof DOMAIN_ROUTE)[Domain];
