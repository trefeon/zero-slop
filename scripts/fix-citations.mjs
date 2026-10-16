// Normalizes corpus citations in this repo to the flat `reference/<manifest-name>:<path>` form.
// Usage: node scripts/fix-citations.mjs [--apply]   (run from the repo root)
// Needs the research corpus: reference/ in the main checkout, or ZS_CORPUS=<dir>.
// Dry run by default; --apply rewrites the citing files.
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CORPUS = process.env.ZS_CORPUS ?? "D:/github_repo/zero-slop/reference";
const APPLY = process.argv.includes("--apply");

const manifest = JSON.parse(readFileSync(path.join(ROOT, "scripts/reference-corpus.json"), "utf8"));
const entries = Array.isArray(manifest) ? manifest : manifest.repos;

/** owner/repo -> manifest name */
const bySlug = new Map();
for (const e of entries) {
  const m = /github\.com[/:]([^/]+)\/([^/.]+)/.exec(e.url ?? "");
  if (m) bySlug.set(`${m[1]}/${m[2]}`, e.name);
}
const dirs = new Set(readdirSync(CORPUS));
const isName = (s) => dirs.has(s);

/** citation prefixes that appear in the repo but are not corpus dir names */
const slugs = [...bySlug.keys()].filter((slug) => !isName(slug));

const files = [];
(function walk(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    if (["node_modules", ".git", "reference", "dist"].includes(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(md|mdx|json|mjs|ts)$/.test(e.name)) files.push(p);
  }
})(ROOT);

const edits = new Map(); // file -> count
const unresolvedTails = [];
let total = 0;

for (const file of files) {
  let text = readFileSync(file, "utf8");
  const before = text;
  for (const slug of slugs) {
    const name = bySlug.get(slug);
    // `reference/<slug>:` and bare `<slug>:` tails inside a citation list
    const re = new RegExp(`(?:reference/)?${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:`, "g");
    text = text.replace(re, `reference/${name}:`);
  }
  if (text !== before) {
    for (const m of text.matchAll(/reference\/([A-Za-z0-9._-]+):([^\s;`'")]+)/g)) {
      const [, name, tail] = m;
      const target = path.join(CORPUS, name);
      if (!isName(name) || !existsSync(target)) continue;
      const tailPath = tail.split("#")[0].replace(/[.,]$/, "");
      const candidate = path.join(target, tailPath);
      if (tailPath && !existsSync(candidate)) {
        // inline references may point at a directory prefix of a deeper file
        const parent = path.dirname(candidate);
        if (!existsSync(parent)) unresolvedTails.push(`${path.relative(ROOT, file)} -> reference/${name}:${tailPath}`);
      }
    }
    const count = (before.match(/reference\//g) ?? []).length === (text.match(/reference\//g) ?? []).length
      ? "rewritten prefixes"
      : "rewritten";
    edits.set(path.relative(ROOT, file), count);
    total += 1;
    if (APPLY) writeFileSync(file, text);
  }
}

console.log(`mapping entries: ${bySlug.size}; broken slug forms: ${slugs.length}`);
console.log(`files rewritten: ${edits.size}${APPLY ? "" : " (dry run)"}`);
for (const [f, c] of edits) console.log(`  ${f} (${c})`);
if (unresolvedTails.length) {
  console.log(`unresolved tails after mapping: ${unresolvedTails.length}`);
  for (const t of unresolvedTails.slice(0, 30)) console.log(`  ${t}`);
} else {
  console.log("all rewritten citations resolve to a corpus path");
}
