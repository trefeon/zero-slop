import { existsSync } from "node:fs";
import path from "node:path";
import { mergeOptions, resolveConfig, type CliRawOptions } from "../config.js";
import { formatFindingsTable, formatJsonOutput, shouldFail } from "../output.js";
import { scanSingleFile, sortFindingsGlobally } from "../scan.js";
import type { CommandResult } from "../types.js";

export interface CheckCommandArgs {
  filePath: string;
  rawOpts: CliRawOptions;
  cwd?: string;
}

export async function runCheckCommand(args: CheckCommandArgs): Promise<CommandResult> {
  const cwd = args.cwd ?? process.cwd();
  const absPath = path.resolve(cwd, args.filePath);

  if (!existsSync(absPath)) {
    throw new Error(`File not found: "${args.filePath}"`);
  }

  const { config, resolvedPath } = await resolveConfig({
    explicitConfig: args.rawOpts.config,
    scanRoot: path.dirname(absPath),
    cwd,
  });

  const opts = mergeOptions(args.rawOpts, config, resolvedPath);
  const rawFindings = await scanSingleFile(absPath, opts, cwd);
  const findings = sortFindingsGlobally(rawFindings);

  let output: string;
  if (opts.json) {
    output = formatJsonOutput(findings, 1);
  } else {
    output = formatFindingsTable(findings, opts.color);
  }

  const exitCode = shouldFail(findings, opts.failOn) ? 1 : 0;
  return { exitCode, output };
}
