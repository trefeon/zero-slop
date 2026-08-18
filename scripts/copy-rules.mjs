import { mkdir, copyFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(import.meta.url), "../..");
const sourceDir = path.join(rootDir, "rules");
const targetDir = path.join(rootDir, "packages", "cli", "rules");

await mkdir(targetDir, { recursive: true });

const files = await readdir(sourceDir);
for (const file of files) {
  if (file.endsWith(".json")) {
    await copyFile(path.join(sourceDir, file), path.join(targetDir, file));
  }
}
