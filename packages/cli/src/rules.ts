import { existsSync } from "node:fs";
import path from "node:path";
import { loadRules } from "@zero-slop/core";
import type { Rule } from "./types.js";

let cachedRules: Rule[] | null = null;
let cachedRulesDir: string | null = null;

export function resolveRulesDir(): string {
  if (cachedRulesDir) return cachedRulesDir;

  // In built distribution: dist/../rules = packages/cli/rules
  const bundled = path.resolve(import.meta.dirname, "../rules");
  // In development / monorepo: dist/../../rules or src/../../rules = repo root rules
  const repoRootFallback = path.resolve(import.meta.dirname, "../../rules");

  if (existsSync(path.join(bundled, "prose.json"))) {
    cachedRulesDir = bundled;
  } else if (existsSync(path.join(repoRootFallback, "prose.json"))) {
    cachedRulesDir = repoRootFallback;
  } else {
    // If running from src directly (e.g. tsx or vitest), try ../../../rules from src
    const rootFromSrc = path.resolve(import.meta.dirname, "../../../rules");
    if (existsSync(path.join(rootFromSrc, "prose.json"))) {
      cachedRulesDir = rootFromSrc;
    } else {
      throw new Error(
        `Unable to find rules directory. Checked bundled (${bundled}) and repo root (${repoRootFallback}).`,
      );
    }
  }

  return cachedRulesDir;
}

export async function getRules(): Promise<Rule[]> {
  if (cachedRules) return cachedRules;
  const dir = resolveRulesDir();
  cachedRules = await loadRules(dir);
  return cachedRules;
}
