import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type { CliConfig, EffectiveOptions, Tier } from "./types.js";
import { VALID_TIERS } from "./types.js";

export const DEFAULT_EXCLUDES = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  "reference",
  "test",
  "tests",
  "fixtures",
  "__fixtures__",
];

export const DEFAULT_CONFIG: Required<CliConfig> = {
  minTier: "info",
  failOn: "error",
  domains: [],
  exclude: DEFAULT_EXCLUDES,
  maxFindingsPerRule: 50,
};

function isTier(val: unknown): val is Tier {
  return typeof val === "string" && (VALID_TIERS as string[]).includes(val);
}

export async function loadConfigFile(filePath: string): Promise<CliConfig> {
  const content = await readFile(filePath, "utf8");
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch (err) {
    throw new Error(`Invalid JSON in configuration file "${filePath}": ${(err as Error).message}`);
  }

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return {};
  }

  const raw = data as Record<string, unknown>;
  const config: CliConfig = {};

  if (isTier(raw.minTier)) {
    config.minTier = raw.minTier;
  }
  if (isTier(raw.failOn)) {
    config.failOn = raw.failOn;
  }
  if (Array.isArray(raw.domains)) {
    config.domains = raw.domains.filter((d): d is string => typeof d === "string");
  }
  if (Array.isArray(raw.exclude)) {
    config.exclude = raw.exclude.filter((e): e is string => typeof e === "string");
  }
  if (typeof raw.maxFindingsPerRule === "number" && Number.isFinite(raw.maxFindingsPerRule)) {
    config.maxFindingsPerRule = Math.max(1, Math.floor(raw.maxFindingsPerRule));
  }

  return config;
}

export interface ResolveConfigArgs {
  explicitConfig?: string;
  scanRoot: string;
  cwd: string;
}

export async function resolveConfig(
  args: ResolveConfigArgs,
): Promise<{ config: CliConfig; resolvedPath?: string }> {
  if (args.explicitConfig) {
    const absPath = path.resolve(args.cwd, args.explicitConfig);
    if (!existsSync(absPath)) {
      throw new Error(`Configuration file not found: "${args.explicitConfig}"`);
    }
    const config = await loadConfigFile(absPath);
    return { config, resolvedPath: absPath };
  }

  const defaultPath = path.resolve(args.scanRoot, "zero-slop.json");
  if (existsSync(defaultPath)) {
    const config = await loadConfigFile(defaultPath);
    return { config, resolvedPath: defaultPath };
  }

  return { config: {} };
}

export interface CliRawOptions {
  config?: string;
  json?: boolean;
  failOn?: string;
  maxFindings?: number;
  domain?: string[];
  color?: boolean;
}

export function mergeOptions(
  cliOpts: CliRawOptions,
  config: CliConfig,
  configPath?: string,
): EffectiveOptions {
  const minTier: Tier = config.minTier ?? DEFAULT_CONFIG.minTier;
  
  let failOn: Tier = DEFAULT_CONFIG.failOn;
  if (isTier(cliOpts.failOn)) {
    failOn = cliOpts.failOn;
  } else if (config.failOn) {
    failOn = config.failOn;
  }

  let domains: string[] = [];
  if (Array.isArray(cliOpts.domain) && cliOpts.domain.length > 0) {
    domains = cliOpts.domain;
  } else if (Array.isArray(config.domains) && config.domains.length > 0) {
    domains = config.domains;
  }

  const exclude: string[] = config.exclude ?? DEFAULT_CONFIG.exclude;

  let maxFindingsPerRule: number = DEFAULT_CONFIG.maxFindingsPerRule;
  if (typeof cliOpts.maxFindings === "number" && Number.isFinite(cliOpts.maxFindings)) {
    maxFindingsPerRule = cliOpts.maxFindings;
  } else if (typeof config.maxFindingsPerRule === "number") {
    maxFindingsPerRule = config.maxFindingsPerRule;
  }

  return {
    minTier,
    failOn,
    domains,
    exclude,
    maxFindingsPerRule,
    json: Boolean(cliOpts.json),
    color: cliOpts.color !== false,
    configPath,
  };
}
