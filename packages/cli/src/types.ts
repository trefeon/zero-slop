import type { Finding } from "@zero-slop/core";

export type { Finding };

export type Tier = "error" | "warning" | "info";
export type Domain =
  | "prose"
  | "ui"
  | "code"
  | "commit"
  | "integrity"
  | "a11y"
  | "chat";

export type Rule = any;

export const VALID_TIERS: Tier[] = ["error", "warning", "info"];
export const VALID_DOMAINS: Domain[] = [
  "prose",
  "ui",
  "code",
  "commit",
  "integrity",
  "a11y",
  "chat",
];

export interface CliConfig {
  minTier?: Tier;
  failOn?: Tier;
  domains?: string[];
  exclude?: string[];
  maxFindingsPerRule?: number;
}

export interface EffectiveOptions {
  minTier: Tier;
  failOn: Tier;
  domains: string[];
  exclude: string[];
  maxFindingsPerRule: number;
  json: boolean;
  color: boolean;
  configPath?: string;
}

export interface CommandResult {
  exitCode: 0 | 1;
  output: string;
}

export interface JsonSummary {
  byTier: Record<Tier, number>;
  byDomain: Record<Domain, number>;
}

export interface JsonOutput {
  tool: "zero-slop";
  version: string;
  scanned: number;
  findings: Finding[];
  summary: JsonSummary;
}
