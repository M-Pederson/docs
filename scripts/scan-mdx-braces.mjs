#!/usr/bin/env node
// Temporary scan: find unescaped `{` in MDX prose (the kind acorn tries to parse).
// Strips YAML frontmatter, fenced code blocks, and inline code, then reports braces.
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const ROOT = process.argv[2] || "api-reference";

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (entry.endsWith(".mdx")) out.push(p);
  }
  return out;
}

function stripAndScan(raw) {
  const lines = raw.split("\n");
  const hits = [];
  let inFrontmatter = false;
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    // frontmatter
    if (i === 0 && line.trim() === "---") { inFrontmatter = true; continue; }
    if (inFrontmatter) { if (line.trim() === "---") inFrontmatter = false; continue; }
    // fenced code
    if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    // strip inline code spans (`...`)
    const noInline = line.replace(/`[^`]*`/g, "");
    if (noInline.includes("{")) hits.push({ line: i + 1, text: line.trim() });
  }
  return hits;
}

const files = walk(ROOT).sort();
let total = 0;
for (const f of files) {
  const hits = stripAndScan(readFileSync(f, "utf-8"));
  if (hits.length) {
    total += hits.length;
    console.log(`\n${f}`);
    for (const h of hits) console.log(`  L${h.line}: ${h.text}`);
  }
}
console.log(`\n=== ${total} brace-in-prose occurrence(s) across ${files.length} files ===`);
