// Integration checks for the agentic-* workflow library.
// Usage: node tools/check-workflow-library.mjs  (run from the repo worktree root)
import { readFileSync, readdirSync, existsSync } from "node:fs";

const dirs = readdirSync("skills").filter((d) => d.startsWith("agentic-")).sort();
const required = ["## Goal", "## Constraints", "## Not for", "## Definition of done"];
const descriptions = new Map();
const sentences = new Map();
let problems = 0;
const note = (m) => {
  problems += 1;
  console.log(`  PROBLEM ${m}`);
};

console.log(`skills: ${dirs.length} (${dirs.join(", ")})`);
for (const dir of dirs) {
  const file = `skills/${dir}/SKILL.md`;
  if (!existsSync(file)) {
    note(`${dir}: missing SKILL.md`);
    continue;
  }
  const text = readFileSync(file, "utf8");
  const fm = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!fm) note(`${dir}: no frontmatter`);
  else {
    const keys = [...fm[1].matchAll(/^([a-z_]+):/gm)].map((m) => m[1]);
    if (keys.join(",") !== "name,description") note(`${dir}: frontmatter keys ${keys.join(",")}`);
    const name = /^name:\s*(\S+)/m.exec(fm[1])?.[1];
    if (name !== dir) note(`${dir}: name field is ${name}`);
    const desc = /^description:\s*([\s\S]*)$/m.exec(fm[1])?.[1] ?? "";
    if (!desc.startsWith("Use when")) note(`${dir}: description does not start with "Use when"`);
    if (desc.length > 1024) note(`${dir}: description ${desc.length} chars`);
    const prev = descriptions.get(desc);
    if (prev) note(`${dir}: description duplicated with ${prev}`);
    descriptions.set(desc, dir);
  }
  for (const section of required) {
    if (!text.includes(`\n${section}`)) note(`${dir}: missing "${section}"`);
  }
  if (text.includes("—")) note(`${dir}: contains an em dash`);
  // sentence-level duplication across skills (>=12 words, letters only)
  for (const raw of text.split(/\n+/)) {
    const line = raw.replace(/`[^`]*`/g, " ").trim();
    if (line.startsWith("#") || line.startsWith("|") || line.startsWith("- ") || line.startsWith("---")) continue;
    for (const sentence of line.split(/(?<=[.:;])\s+(?=[A-Z])/)) {
      const words = sentence.replace(/[^A-Za-z\s]/g, " ").trim().split(/\s+/).filter(Boolean);
      if (words.length < 12) continue;
      const key = words.join(" ").toLowerCase();
      const prev = sentences.get(key);
      if (prev && prev !== dir) note(`${dir}: sentence also in ${prev}: "${words.slice(0, 12).join(" ")}..."`);
      else sentences.set(key, dir);
    }
  }
}
console.log(problems ? `${problems} problem(s)` : "library checks clean");
