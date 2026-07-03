#!/usr/bin/env node

/**
 * Orbiter Backend OpenAPI → docs.json navigation sync
 *
 * The "Orbiter Backend" group in docs.json lists its endpoints explicitly
 * (as "METHOD /path" entries, one subgroup per OpenAPI tag) because Mintlify
 * has no way to sort auto-generated OpenAPI navigation — it orders tag groups
 * by first appearance in the spec's paths. This script keeps that explicit
 * navigation in sync with api-reference/orbiter-backend/openapi.yaml:
 *
 *   - subgroups stay sorted alphabetically by tag name
 *   - endpoints added to the spec are inserted into their tag's subgroup,
 *     positioned relative to their spec-order neighbors
 *   - endpoints removed from the spec are dropped
 *   - entries that already exist keep their committed order (no churn)
 *
 * Usage:
 *   node scripts/sync-orbiter-backend-nav.mjs            # sync docs.json
 *   node scripts/sync-orbiter-backend-nav.mjs --dry-run  # preview changes
 *   node scripts/sync-orbiter-backend-nav.mjs --check    # exit 1 if out of sync
 */

import { readFileSync, writeFileSync } from "fs";
import { execFileSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DOCS_JSON_PATH = join(ROOT, "docs.json");
const SPEC_PATH = join(ROOT, "api-reference", "orbiter-backend", "openapi.yaml");
const NAV_GROUP = "Orbiter Backend";
const METHODS = ["get", "post", "put", "patch", "delete", "options", "head", "trace"];

// ─── Parse the OpenAPI YAML (via the js-yaml CLI, which prints JSON) ─────────

function loadSpec() {
  const json = execFileSync("npx", ["--yes", "js-yaml@4", SPEC_PATH], {
    encoding: "utf-8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return JSON.parse(json);
}

// ─── Desired endpoints per tag, in spec walk order ───────────────────────────

function specEndpointsByTag(spec) {
  const byTag = new Map();
  for (const [path, item] of Object.entries(spec.paths || {})) {
    for (const [method, op] of Object.entries(item)) {
      if (!METHODS.includes(method)) continue;
      const tag = (op.tags && op.tags[0]) || "Untagged";
      if (!byTag.has(tag)) byTag.set(tag, []);
      byTag.get(tag).push(`${method.toUpperCase()} ${path}`);
    }
  }
  return byTag;
}

// ─── Merge spec entries into an existing subgroup, preserving its order ──────

function mergeEntries(existing, specList) {
  const specSet = new Set(specList);
  // keep surviving entries in their committed order
  const result = existing.filter((e) => specSet.has(e));
  const placed = new Set(result);
  // insert new entries after their nearest spec-order predecessor
  for (let i = 0; i < specList.length; i++) {
    const entry = specList[i];
    if (placed.has(entry)) continue;
    let insertAt = 0;
    for (let j = i - 1; j >= 0; j--) {
      const pos = result.indexOf(specList[j]);
      if (pos !== -1) {
        insertAt = pos + 1;
        break;
      }
    }
    result.splice(insertAt, 0, entry);
    placed.add(entry);
  }
  return result;
}

// ─── Locate the Orbiter Backend group anywhere in the navigation tree ────────

function findNavGroup(node) {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findNavGroup(child);
      if (found) return found;
    }
    return null;
  }
  if (node && typeof node === "object") {
    if (node.group === NAV_GROUP) return node;
    for (const value of Object.values(node)) {
      const found = findNavGroup(value);
      if (found) return found;
    }
  }
  return null;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const checkOnly = args.includes("--check");

  const docsJson = JSON.parse(readFileSync(DOCS_JSON_PATH, "utf-8"));
  const navGroup = findNavGroup(docsJson.navigation);
  if (!navGroup) {
    console.error(`✗ Group "${NAV_GROUP}" not found in docs.json navigation`);
    process.exit(1);
  }

  const byTag = specEndpointsByTag(loadSpec());

  const existingSubgroups = new Map(
    (navGroup.pages || [])
      .filter((p) => p && typeof p === "object" && p.group)
      .map((sg) => [sg.group, sg])
  );

  const tags = [...byTag.keys()].sort((a, b) => {
    const la = a.toLowerCase();
    const lb = b.toLowerCase();
    return la < lb ? -1 : la > lb ? 1 : 0;
  });

  const changes = [];
  const newPages = tags.map((tag) => {
    const specList = byTag.get(tag);
    const existing = existingSubgroups.get(tag);
    const oldEntries = existing ? existing.pages : [];
    const merged = mergeEntries(oldEntries, specList);

    if (!existing) {
      changes.push(`+ new group "${tag}" (${merged.length} endpoints)`);
    } else {
      const oldSet = new Set(oldEntries);
      const newSet = new Set(merged);
      for (const e of merged) if (!oldSet.has(e)) changes.push(`+ ${tag}: ${e}`);
      for (const e of oldEntries) if (!newSet.has(e)) changes.push(`- ${tag}: ${e}`);
    }
    return { ...(existing || {}), group: tag, pages: merged };
  });
  for (const name of existingSubgroups.keys()) {
    if (!byTag.has(name)) changes.push(`- removed group "${name}"`);
  }

  const before = JSON.stringify(navGroup.pages);
  navGroup.pages = newPages;
  const changed = JSON.stringify(navGroup.pages) !== before;

  if (!changed) {
    console.log(`✓ "${NAV_GROUP}" navigation already in sync (${tags.length} groups)`);
    return;
  }

  console.log(`Navigation changes for "${NAV_GROUP}":`);
  for (const c of changes) console.log(`  ${c}`);

  if (checkOnly) {
    console.error(`\n✗ docs.json is out of sync with the spec — run: node scripts/sync-orbiter-backend-nav.mjs`);
    process.exit(1);
  }
  if (dryRun) {
    console.log("\n(Dry run — docs.json not written)");
    return;
  }

  writeFileSync(DOCS_JSON_PATH, JSON.stringify(docsJson, null, 2) + "\n");
  console.log(`\n✓ Updated docs.json (${tags.length} groups)`);
}

main();
