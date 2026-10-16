// Integration checks for the skill library in skills/.
// Usage: node scripts/check-skills.mjs   (run from the repo root)
// Needs no research corpus and no build output: it reads skills/ only.
//
// Every pack (any directory in skills/, so the audit family and the router
// included) is checked for:
//   - frontmatter keys exactly name,description, with name equal to the directory
//   - a description that is present, <=1024 chars, and unique across packs
//   - no sentence of >=12 words repeated across packs
// The workflow family (every zeroslop-* pack except zeroslop-audit* and the
// router) additionally carries the family contract: the sections
// ## Goal, ## Constraints, ## Not for, ## Definition of done, a trigger-first
// description, and no em dash.
import { readFileSync, readdirSync, existsSync } from "node:fs";

const ROUTER = "zeroslop";
const WORKFLOW_SECTIONS = ["## Goal", "## Constraints", "## Not for", "## Definition of done"];
const isWorkflowPack = (dir) =>
  dir !== ROUTER && dir.startsWith("zeroslop-") && !dir.startsWith("zeroslop-audit");

const dirs = readdirSync("skills", { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const workflow = dirs.filter(isWorkflowPack);

const descriptions = new Map();
const sentences = new Map();
let problems = 0;
const note = (m) => {
  problems += 1;
  console.log(`  PROBLEM ${m}`);
};

/** Frontmatter scalar -> value, so a quoted description reads as its text. */
const scalar = (raw = "") => {
  const v = raw.trim();
  if (v.length > 1 && v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1).replace(/\\(["\\])/g, "$1");
  if (v.length > 1 && v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1).replace(/''/g, "'");
  return v;
};

console.log(`packs: ${dirs.length} (${dirs.join(", ")})`);
console.log(`workflow family: ${workflow.length} (${workflow.join(", ")})`);
for (const dir of dirs) {
  const isWorkflow = isWorkflowPack(dir);
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
    const desc = scalar(/^description:[ \t]*(.*)$/m.exec(fm[1])?.[1]);
    if (!desc) note(`${dir}: no description`);
    else {
      if (isWorkflow && !desc.startsWith("Use when")) note(`${dir}: description does not start with "Use when"`);
      if (desc.length > 1024) note(`${dir}: description ${desc.length} chars`);
      const prev = descriptions.get(desc);
      if (prev) note(`${dir}: description duplicated with ${prev}`);
      descriptions.set(desc, dir);
    }
  }
  if (isWorkflow) {
    for (const section of WORKFLOW_SECTIONS) {
      if (!text.includes(`\n${section}`)) note(`${dir}: missing "${section}"`);
    }
    if (text.includes("—")) note(`${dir}: contains an em dash`);
  }
  // sentence-level duplication across packs (>=12 words, letters only)
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
process.exitCode = problems ? 1 : 0;
