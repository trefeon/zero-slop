import { describe, expect, it, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runScanCommand } from "../src/commands/scan.js";
import { runCheckCommand } from "../src/commands/check.js";
import { runGateCommand } from "../src/commands/gate.js";
import { runReportCommand } from "../src/commands/report.js";
import type { JsonOutput } from "../src/types.js";

const tmpDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "zero-slop-test-"));
  tmpDirs.push(tmp);
  return tmp;
}

afterEach(async () => {
  for (const dir of tmpDirs) {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
  tmpDirs.length = 0;
});

describe("zero-slop CLI", () => {
  it("1. scan on a temp fixture dir asserts findings include ZS-PROSE-* and ZS-UI-* and clean ts yields none", async () => {
    const dir = await createTempDir();

    await writeFile(
      path.join(dir, "sloppy.md"),
      `# Slop Article\n\nLet's delve into the tapestry.\n\nSynergies across teams — digital transformation journeys — are key.\n`,
    );

    await writeFile(
      path.join(dir, "sloppy.html"),
      `<!doctype html><html><head><style>body { font-family: "Inter", sans-serif; }</style></head><body><button class="bg-gradient-to-r from-indigo-500 to-purple-600">Click</button></body></html>`,
    );

    await writeFile(
      path.join(dir, "clean.ts"),
      `export function add(a: number, b: number): number { return a + b; }\n`,
    );

    const result = await runScanCommand({
      targetPath: dir,
      rawOpts: { json: true },
      cwd: dir,
    });

    const parsed = JSON.parse(result.output) as JsonOutput;

    // Check we got prose and UI findings
    const proseFindings = parsed.findings.filter((f) => f.ruleId.startsWith("ZS-PROSE-"));
    const uiFindings = parsed.findings.filter((f) => f.ruleId.startsWith("ZS-UI-"));
    const cleanFindings = parsed.findings.filter((f) => f.file?.includes("clean.ts"));

    expect(proseFindings.length).toBeGreaterThan(0);
    expect(uiFindings.length).toBeGreaterThan(0);
    expect(cleanFindings.length).toBe(0);
    expect(result.exitCode).toBe(1); // Contains error-tier delve/em-dash
  });

  it("2. gate exit code: failOn error with error-tier finding → 1; clean dir → 0", async () => {
    const slopDir = await createTempDir();
    await writeFile(
      path.join(slopDir, "sloppy.md"),
      `Let's delve into the solution.\n`, // ZS-PROSE-001 is tier error
    );

    const slopResult = await runGateCommand({
      targetPath: slopDir,
      rawOpts: { failOn: "error" },
      cwd: slopDir,
    });
    expect(slopResult.exitCode).toBe(1);
    expect(slopResult.output).toMatch(/\d+ findings: \d+ errors, \d+ warnings, \d+ info/);

    const cleanDir = await createTempDir();
    await writeFile(
      path.join(cleanDir, "clean.ts"),
      `export function multiply(a: number, b: number): number { return a * b; }\n`,
    );

    const cleanResult = await runGateCommand({
      targetPath: cleanDir,
      rawOpts: { failOn: "error" },
      cwd: cleanDir,
    });
    expect(cleanResult.exitCode).toBe(0);
    expect(cleanResult.output).toBe("0 findings: 0 errors, 0 warnings, 0 info\n");
  });

  it("3. report --json parses and has byDomain/byTier counts", async () => {
    const dir = await createTempDir();
    await writeFile(
      path.join(dir, "sloppy.md"),
      `Let's delve into this topic.\n`,
    );

    const result = await runReportCommand({
      targetPath: dir,
      rawOpts: { json: true },
      cwd: dir,
    });

    expect(result.exitCode).toBe(0); // Report always exits 0
    const parsed = JSON.parse(result.output) as JsonOutput;

    expect(parsed.tool).toBe("zero-slop");
    expect(parsed.version).toBe("0.1.0");
    expect(parsed.summary).toBeDefined();
    expect(parsed.summary.byDomain).toBeDefined();
    expect(parsed.summary.byTier).toBeDefined();
    expect(parsed.summary.byDomain.prose).toBeGreaterThanOrEqual(1);
    expect(parsed.summary.byTier.error).toBeGreaterThanOrEqual(1);
    expect(typeof parsed.summary.byDomain.ui).toBe("number");
    expect(typeof parsed.summary.byTier.warning).toBe("number");
  });

  it("4. scan --json output has the documented shape", async () => {
    const dir = await createTempDir();
    await writeFile(
      path.join(dir, "sloppy.md"),
      `Let's delve into the code.\n`,
    );

    const result = await runScanCommand({
      targetPath: dir,
      rawOpts: { json: true },
      cwd: dir,
    });

    const parsed = JSON.parse(result.output) as JsonOutput;

    expect(parsed).toHaveProperty("tool", "zero-slop");
    expect(parsed).toHaveProperty("version", "0.1.0");
    expect(parsed).toHaveProperty("scanned");
    expect(typeof parsed.scanned).toBe("number");
    expect(Array.isArray(parsed.findings)).toBe(true);
    expect(parsed.findings.length).toBeGreaterThan(0);

    const first = parsed.findings[0]!;
    expect(first).toHaveProperty("ruleId");
    expect(first).toHaveProperty("tier");
    expect(first).toHaveProperty("domain");
    expect(first).toHaveProperty("file");
    expect(first).toHaveProperty("line");
    expect(first).toHaveProperty("column");
    expect(first).toHaveProperty("message");
    expect(first).toHaveProperty("evidence");
    expect(first).toHaveProperty("count");

    expect(parsed).toHaveProperty("summary");
    expect(parsed.summary).toHaveProperty("byTier");
    expect(parsed.summary).toHaveProperty("byDomain");
  });

  it("5. config file: minTier warning drops info findings; exclude matches", async () => {
    const dir = await createTempDir();

    // Create a subfolder that will be excluded
    const ignoredSub = path.join(dir, "ignored_folder");
    await mkdir(ignoredSub, { recursive: true });
    await writeFile(
      path.join(ignoredSub, "bad.md"),
      `Let's delve into this bad file.\n`,
    );

    // Create a root file with an error tell (delve) and info tell if any
    await writeFile(
      path.join(dir, "main.md"),
      `Let's delve into the project.\n`,
    );

    // Config file: excludes "ignored_folder", sets minTier to "warning"
    await writeFile(
      path.join(dir, "zero-slop.json"),
      JSON.stringify({
        minTier: "warning",
        exclude: ["ignored_folder"],
      }),
    );

    const result = await runScanCommand({
      targetPath: dir,
      rawOpts: { json: true },
      cwd: dir,
    });

    const parsed = JSON.parse(result.output) as JsonOutput;

    // The ignored folder should not appear in findings
    const ignoredFindings = parsed.findings.filter((f) => f.file?.includes("ignored_folder"));
    expect(ignoredFindings.length).toBe(0);

    // No info-tier findings should be present
    const infoFindings = parsed.findings.filter((f) => f.tier === "info");
    expect(infoFindings.length).toBe(0);
  });

  it("6. check on a single md file finds prose tells", async () => {
    const dir = await createTempDir();
    const filePath = path.join(dir, "doc.md");
    await writeFile(
      filePath,
      `# Overview\n\nLet's delve into the feature overview.\n`,
    );

    const result = await runCheckCommand({
      filePath,
      rawOpts: { json: true },
      cwd: dir,
    });

    const parsed = JSON.parse(result.output) as JsonOutput;
    expect(parsed.scanned).toBe(1);
    expect(parsed.findings.length).toBeGreaterThan(0);
    expect(parsed.findings.some((f) => f.ruleId === "ZS-PROSE-001")).toBe(true);
    expect(result.exitCode).toBe(1);
  });
});
