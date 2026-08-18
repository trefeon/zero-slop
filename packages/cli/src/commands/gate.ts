import path from "node:path";
import { mergeOptions, resolveConfig, type CliRawOptions } from "../config.js";
import { formatGateSummary, formatJsonOutput, shouldFail } from "../output.js";
import { scanTarget } from "../scan.js";
import type { CommandResult } from "../types.js";

export interface GateCommandArgs {
  targetPath?: string;
  rawOpts: CliRawOptions;
  cwd?: string;
}

export async function runGateCommand(args: GateCommandArgs): Promise<CommandResult> {
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
    output = formatGateSummary(findings);
  }

  const exitCode = shouldFail(findings, opts.failOn) ? 1 : 0;
  return { exitCode, output };
}
