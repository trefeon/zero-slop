#!/usr/bin/env node
import { Command, Option } from "commander";
import { pathToFileURL } from "node:url";
import { runCheckCommand } from "./commands/check.js";
import { runGateCommand } from "./commands/gate.js";
import { runReportCommand } from "./commands/report.js";
import { runScanCommand } from "./commands/scan.js";
import { CLI_VERSION } from "./output.js";
import { VALID_DOMAINS, VALID_TIERS } from "./types.js";

function addScanOptions(cmd: Command): Command {
  return cmd
    .option("-c, --config <file>", "Config file path (default: zero-slop.json)")
    .option("--json", "Output machine-readable JSON")
    .addOption(
      new Option("--fail-on <tier>", "Fail exit code on tier or above")
        .choices(VALID_TIERS)
        .default("error"),
    )
    .option(
      "--max-findings <n>",
      "Max findings reported per rule (default: 50)",
      (val) => {
        const n = parseInt(val, 10);
        if (Number.isNaN(n) || n < 1) {
          throw new Error(`--max-findings must be a positive integer, got "${val}"`);
        }
        return n;
      },
    )
    .option(
      "-d, --domain <domain>",
      "Filter rules by domain (repeatable)",
      (val, acc: string[]) => {
        if (!(VALID_DOMAINS as string[]).includes(val)) {
          throw new Error(
            `Invalid domain "${val}". Must be one of: ${VALID_DOMAINS.join(", ")}`,
          );
        }
        acc.push(val);
        return acc;
      },
      [] as string[],
    )
    .option("--no-color", "Disable colored terminal output");
}

export function createProgram(): Command {
  const program = new Command();

  program
    .name("zero-slop")
    .description("Zero-slop CLI: detect and eliminate AI-generated slop across prose, code, and UI.")
    .version(CLI_VERSION);

  const scanCmd = program
    .command("scan [path]")
    .description("Scan a directory tree for AI-slop tells")
    .action(async (targetPath?: string) => {
      try {
        const rawOpts = scanCmd.opts();
        const result = await runScanCommand({ targetPath, rawOpts });
        process.stdout.write(result.output);
        process.exitCode = result.exitCode;
      } catch (err) {
        process.stderr.write(`Error: ${(err as Error).message}\n`);
        process.exitCode = 1;
      }
    });
  addScanOptions(scanCmd);

  const checkCmd = program
    .command("check <file>")
    .description("Scan a single file for AI-slop tells")
    .action(async (filePath: string) => {
      try {
        const rawOpts = checkCmd.opts();
        const result = await runCheckCommand({ filePath, rawOpts });
        process.stdout.write(result.output);
        process.exitCode = result.exitCode;
      } catch (err) {
        process.stderr.write(`Error: ${(err as Error).message}\n`);
        process.exitCode = 1;
      }
    });
  addScanOptions(checkCmd);

  const gateCmd = program
    .command("gate [path]")
    .description("CI gate check — prints one-line summary and exits with error code if slop found")
    .action(async (targetPath?: string) => {
      try {
        const rawOpts = gateCmd.opts();
        const result = await runGateCommand({ targetPath, rawOpts });
        process.stdout.write(result.output);
        process.exitCode = result.exitCode;
      } catch (err) {
        process.stderr.write(`Error: ${(err as Error).message}\n`);
        process.exitCode = 1;
      }
    });
  addScanOptions(gateCmd);

  const reportCmd = program
    .command("report [path]")
    .description("Generate summary report by domain and tier")
    .action(async (targetPath?: string) => {
      try {
        const rawOpts = reportCmd.opts();
        const result = await runReportCommand({ targetPath, rawOpts });
        process.stdout.write(result.output);
        process.exitCode = result.exitCode;
      } catch (err) {
        process.stderr.write(`Error: ${(err as Error).message}\n`);
        process.exitCode = 1;
      }
    });
  addScanOptions(reportCmd);

  return program;
}

export async function runCli(argv: string[] = process.argv): Promise<void> {
  const program = createProgram();
  await program.parseAsync(argv);
}

if (process.argv[1]) {
  try {
    const isDirectRun =
      import.meta.url === pathToFileURL(process.argv[1]).href ||
      process.argv[1].endsWith("dist/index.js") ||
      process.argv[1].endsWith("dist\\index.js");
    if (isDirectRun) {
      runCli().catch((err) => {
        process.stderr.write(`Error: ${(err as Error).message}\n`);
        process.exitCode = 1;
      });
    }
  } catch {
    // If pathToFileURL fails, skip direct run execution
  }
}
