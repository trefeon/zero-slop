import path from "node:path";
import { mergeOptions, resolveConfig, type CliRawOptions } from "../config.js";
import { formatJsonOutput, formatReportSummary } from "../output.js";
import { scanTarget } from "../scan.js";
import type { CommandResult } from "../types.js";

export interface ReportCommandArgs {
  targetPath?: string;
  rawOpts: CliRawOptions;
  cwd?: string;
}

export async function runReportCommand(args: ReportCommandArgs): Promise<CommandResult> {
  const cwd = args.cwd ?? process.cwd();
  const targetPath = args.targetPath ?? ".";
  const absScanRoot = path.resolve(cwd, targetPath);

  const { config, resolvedPath } = await resolveConfig({
    explicitConfig: args.rawOpts.config,
    scanRoot: absScanRoot,
    cwd,
  });

  const opts = mergeOptions(args.rawOpts, config, resolvedPath);
  const { findings, scannedCount } = await scanTarget(targetPath, opts, cwd);

  let output: string;
  if (opts.json) {
    output = formatJsonOutput(findings, scannedCount);
  } else {
    output = formatReportSummary(findings, opts.color);
  }

  // Report command always exits 0
  return { exitCode: 0, output };
}
