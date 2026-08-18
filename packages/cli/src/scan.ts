import { readFile } from "node:fs/promises";
import path from "node:path";
import { scanFile } from "@zero-slop/core";
import { getRules } from "./rules.js";
import { collectFilesToScan, getFileDispatch } from "./walk.js";
import type { Domain, EffectiveOptions, Finding } from "./types.js";

export function sortFindingsGlobally(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const fileA = a.file ?? "";
    const fileB = b.file ?? "";
    const fileCmp = fileA.localeCompare(fileB);
    if (fileCmp !== 0) return fileCmp;

    const lineA = a.line ?? 0;
    const lineB = b.line ?? 0;
    if (lineA !== lineB) return lineA - lineB;

    const colA = a.column ?? 0;
    const colB = b.column ?? 0;
    if (colA !== colB) return colA - colB;

    return a.ruleId.localeCompare(b.ruleId);
  });
}

export interface ScanTargetResult {
  findings: Finding[];
  scannedCount: number;
}

export async function scanSingleFile(
  fullPath: string,
  opts: EffectiveOptions,
  cwd: string,
): Promise<Finding[]> {
  const dispatch = getFileDispatch(fullPath);
  if (!dispatch) {
    return [];
  }

  const rules = await getRules();
  const content = await readFile(fullPath, "utf8");
  const relPath = path.relative(cwd, fullPath).split(path.sep).join("/");

  const rawFindings = scanFile(rules, content, {
    file: relPath,
    minTier: opts.minTier,
    maxFindingsPerRule: opts.maxFindingsPerRule,
    isMarkdown: dispatch.isMarkdown,
  });

  const domainFilter = opts.domains.length > 0 ? opts.domains : null;

  return rawFindings.filter((finding) => {
    // 1. Must belong to the allowed dispatch domains for this file type
    if (!dispatch.domains.includes(finding.domain)) {
      return false;
    }
    // 2. Must pass the user domain filter if specified
    if (domainFilter && !domainFilter.includes(finding.domain)) {
      return false;
    }
    return true;
  });
}

export async function scanTarget(
  targetPath: string,
  opts: EffectiveOptions,
  cwd: string,
): Promise<ScanTargetResult> {
  const files = await collectFilesToScan(targetPath, opts.exclude, cwd);
  const allFindings: Finding[] = [];

  for (const file of files) {
    const fileFindings = await scanSingleFile(file, opts, cwd);
    allFindings.push(...fileFindings);
  }

  const sorted = sortFindingsGlobally(allFindings);
  return {
    findings: sorted,
    scannedCount: files.length,
  };
}
