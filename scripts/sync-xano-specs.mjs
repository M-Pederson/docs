#!/usr/bin/env node

/**
 * Xano → Mintlify MDX Sync Script
 *
 * Fetches OpenAPI specs from Xano for each API group,
 * generates/updates MDX endpoint files, and updates docs.json navigation.
 *
 * Usage:
 *   node scripts/sync-xano-specs.mjs              # sync all groups
 *   node scripts/sync-xano-specs.mjs --dry-run     # preview changes without writing
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const API_REF_DIR = join(ROOT, "api-reference");
const DOCS_JSON_PATH = join(ROOT, "docs.json");
const CONFIG_PATH = join(__dirname, "sync-config.json");

const XANO_BASE_URL =
  process.env.XANO_BASE_URL || "https://xh2o-yths-38lt.n7c.xano.io";

// ─── Config ──────────────────────────────────────────────────────────────────

function loadConfig() {
  return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
}

// ─── Fetch OpenAPI spec from Xano ────────────────────────────────────────────

async function fetchSpec(group) {
  const url = group.specUrl.replace("http://backend", XANO_BASE_URL);
  console.log(`  Fetching: ${group.name} (${group.dir})`);

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`    ✗ HTTP ${res.status} for ${group.name}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`    ✗ Failed to fetch ${group.name}: ${err.message}`);
    return null;
  }
}

// ─── Generate filename from endpoint path ────────────────────────────────────

function pathToFilename(path, method) {
  // /auth/login → auth-login
  // /master-emails/{master_email_id} → master-emails-by-id
  let name = path
    .replace(/^\//, "")
    .replace(/\{[^}]+\}/g, "by-id")
    .replace(/[/_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/-$/, "")
    .toLowerCase();

  if (!name) name = "root";

  // Prefix with method if multiple methods share same path
  // This is handled by the caller if needed
  return name;
}

function pathToTitle(path, method, summary) {
  // Use summary if short and meaningful, otherwise generate from path
  if (summary && summary.length > 0 && summary.length <= 60) {
    return summary;
  }

  // /auth/login → Auth Login
  const clean = path
    .replace(/^\//, "")
    .replace(/\{[^}]+\}/g, "")
    .replace(/[/_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const titleCase = clean
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const methodLabel = { get: "Get", post: "Create", put: "Update", patch: "Update", delete: "Delete" };
  return `${methodLabel[method] || method.toUpperCase()} ${titleCase}`.trim();
}

// ─── Map OpenAPI type to MDX type ────────────────────────────────────────────

function mapType(schema) {
  if (!schema) return "string";
  if (schema.type === "integer") return "integer";
  if (schema.type === "number") return "number";
  if (schema.type === "boolean") return "boolean";
  if (schema.type === "array") return "array";
  if (schema.type === "object") return "object";
  if (schema.format === "email") return "string";
  if (schema.format === "password") return "string";
  return schema.type || "string";
}

// ─── Generate MDX content for an endpoint ────────────────────────────────────

function generateMdx(path, method, operation, group) {
  const verb = method.toUpperCase();
  const fullUrl = `${XANO_BASE_URL}/api:${group.canonical}${path}`;
  const title = pathToTitle(path, method, operation.summary);
  const description = (operation.description || operation.summary || "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  const requiresAuth = operation.security && operation.security.length > 0;

  let mdx = `---
title: '${title.replace(/'/g, "''")}'
api: '${verb} ${fullUrl}'
description: '${description.replace(/'/g, "''")}'
---

## Headers

<ParamField header="X-Data-Source" type="string" required>
  Identifies the data source for the request.
</ParamField>

<ParamField header="X-Branch" type="string" required>
  The Xano branch to target (e.g. \`v1\`, \`staging\`, \`dev\`).
</ParamField>
`;

  if (requiresAuth) {
    mdx += `
<ParamField header="Authorization" type="string" required>
  Bearer token obtained from login or signup.
</ParamField>
`;
  }

  // Path parameters
  const pathParams = (operation.parameters || []).filter(
    (p) => p.in === "path"
  );
  if (pathParams.length > 0) {
    mdx += `\n## Path Parameters\n\n`;
    for (const param of pathParams) {
      const required = param.required ? " required" : "";
      mdx += `<ParamField path="${param.name}" type="${mapType(param.schema)}"${required}>\n`;
      mdx += `  ${param.description || `The ${param.name} parameter.`}\n`;
      mdx += `</ParamField>\n\n`;
    }
  }

  // Query parameters
  const queryParams = (operation.parameters || []).filter(
    (p) => p.in === "query"
  );
  if (queryParams.length > 0) {
    mdx += `\n## Query Parameters\n\n`;
    for (const param of queryParams) {
      const required = param.required ? " required" : "";
      mdx += `<ParamField query="${param.name}" type="${mapType(param.schema)}"${required}>\n`;
      mdx += `  ${param.description || `The ${param.name} parameter.`}\n`;
      mdx += `</ParamField>\n\n`;
    }
  }

  // Request body
  const requestBody = operation.requestBody;
  if (requestBody) {
    const content =
      requestBody.content?.["application/json"] ||
      requestBody.content?.["multipart/form-data"];
    if (content?.schema?.properties) {
      mdx += `\n## Request Body\n\n`;
      const required = content.schema.required || [];
      for (const [name, prop] of Object.entries(content.schema.properties)) {
        const isRequired = required.includes(name) ? " required" : "";
        const desc = prop.description || "";
        mdx += `<ParamField body="${name}" type="${mapType(prop)}"${isRequired}>\n`;
        mdx += `  ${desc || `The ${name} field.`}\n`;
        mdx += `</ParamField>\n\n`;
      }
    }
  }

  // Response
  const response200 = operation.responses?.["200"];
  if (response200?.content?.["application/json"]?.schema?.properties) {
    const props = response200.content["application/json"].schema.properties;
    mdx += `\n## Response\n\n`;
    for (const [name, prop] of Object.entries(props)) {
      const desc = prop.description || "";
      const nullable = prop.nullable ? " Can be `null`." : "";
      mdx += `<ResponseField name="${name}" type="${mapType(prop)}">\n`;
      mdx += `  ${desc || `The ${name} field.`}${nullable}\n`;
      mdx += `</ResponseField>\n\n`;
    }
  }

  // cURL example
  const curlHeaders = [
    `  -H "Content-Type: application/json"`,
    `  -H "X-Data-Source: YOUR_DATA_SOURCE"`,
    `  -H "X-Branch: v1"`,
  ];
  if (requiresAuth) {
    curlHeaders.push(`  -H "Authorization: Bearer YOUR_AUTH_TOKEN"`);
  }

  // Build example body from request schema
  let curlBody = "";
  if (requestBody) {
    const content =
      requestBody.content?.["application/json"] ||
      requestBody.content?.["multipart/form-data"];
    if (content?.schema?.properties) {
      const exampleObj = {};
      for (const [name, prop] of Object.entries(content.schema.properties)) {
        if (prop.type === "string") exampleObj[name] = prop.format === "email" ? "user@example.com" : `example-${name}`;
        else if (prop.type === "integer") exampleObj[name] = 1;
        else if (prop.type === "number") exampleObj[name] = 1.0;
        else if (prop.type === "boolean") exampleObj[name] = true;
        else if (prop.type === "array") exampleObj[name] = [];
        else if (prop.type === "object") exampleObj[name] = {};
        else exampleObj[name] = `example-${name}`;
      }
      curlBody = ` \\\n  -d '${JSON.stringify(exampleObj, null, 4).split("\n").join("\n  ")}'`;
    }
  }

  // Replace path params with example values in URL
  const exampleUrl = fullUrl.replace(/\{[^}]+\}/g, "1");

  mdx += `<RequestExample>
\`\`\`bash cURL
curl -X ${verb} ${exampleUrl} \\
${curlHeaders.join(" \\\n")}${curlBody}
\`\`\`
</RequestExample>
`;

  // Response example
  if (response200?.content?.["application/json"]?.schema?.properties) {
    const props = response200.content["application/json"].schema.properties;
    const exampleResp = {};
    for (const [name, prop] of Object.entries(props)) {
      if (prop.type === "string") exampleResp[name] = prop.default || `example-${name}`;
      else if (prop.type === "integer") exampleResp[name] = 1;
      else if (prop.type === "number") exampleResp[name] = 1.0;
      else if (prop.type === "boolean") exampleResp[name] = prop.default === "true" || prop.default === true;
      else if (prop.type === "array") exampleResp[name] = [];
      else exampleResp[name] = `example-${name}`;
    }

    mdx += `
<ResponseExample>
\`\`\`json 200
${JSON.stringify(exampleResp, null, 2)}
\`\`\`
</ResponseExample>
`;
  }

  return mdx;
}

// ─── Sync a single group ─────────────────────────────────────────────────────

function syncGroup(spec, group, dryRun) {
  const groupDir = join(API_REF_DIR, group.dir);

  if (!dryRun) {
    mkdirSync(groupDir, { recursive: true });
  }

  // Collect existing MDX files
  const existingFiles = new Set();
  if (existsSync(groupDir)) {
    for (const f of readdirSync(groupDir)) {
      if (f.endsWith(".mdx")) existingFiles.add(f);
    }
  }

  const pages = [];
  const generatedFiles = new Set();

  for (const [path, methods] of Object.entries(spec.paths || {})) {
    for (const [method, operation] of Object.entries(methods)) {
      if (!["get", "post", "put", "patch", "delete"].includes(method)) continue;

      let filename = pathToFilename(path, method);

      // Handle multiple methods on same path
      const methodsOnPath = Object.keys(methods).filter((m) =>
        ["get", "post", "put", "patch", "delete"].includes(m)
      );
      if (methodsOnPath.length > 1) {
        filename = `${method}-${filename}`;
      }

      filename = `${filename}.mdx`;

      // Avoid duplicate filenames
      if (generatedFiles.has(filename)) {
        filename = filename.replace(".mdx", `-${method}.mdx`);
      }
      generatedFiles.add(filename);

      const mdxContent = generateMdx(path, method, operation, group);
      const filePath = join(groupDir, filename);

      if (!dryRun) {
        writeFileSync(filePath, mdxContent);
      }

      const pagePath = `api-reference/${group.dir}/${filename.replace(".mdx", "")}`;
      pages.push(pagePath);
    }
  }

  // Remove MDX files that no longer have a corresponding endpoint
  const removedFiles = [];
  for (const existing of existingFiles) {
    if (!generatedFiles.has(existing)) {
      removedFiles.push(existing);
      if (!dryRun) {
        unlinkSync(join(groupDir, existing));
      }
    }
  }

  return { pages, generated: generatedFiles.size, removed: removedFiles };
}

// ─── Update docs.json navigation ─────────────────────────────────────────────

function updateDocsJson(navGroups, dryRun) {
  const docsJson = JSON.parse(readFileSync(DOCS_JSON_PATH, "utf-8"));

  const tabs = docsJson.navigation?.tabs || [];
  let apiTab = tabs.find((t) => t.tab === "API Reference");

  if (!apiTab) {
    apiTab = { tab: "API Reference", groups: [] };
    tabs.push(apiTab);
  }

  // Keep the intro group
  const introGroup = apiTab.groups?.find(
    (g) => g.group === "API Documentation"
  );

  apiTab.groups = [
    introGroup || {
      group: "API Documentation",
      pages: ["api-reference/introduction"],
    },
    ...navGroups,
  ];

  if (!dryRun) {
    writeFileSync(DOCS_JSON_PATH, JSON.stringify(docsJson, null, 2) + "\n");
    console.log("\n✓ Updated docs.json");
  } else {
    console.log("\n📋 docs.json navigation preview:");
    for (const g of navGroups) {
      console.log(`  ${g.group}: ${g.pages.length} pages`);
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  const config = loadConfig();

  console.log("🔄 Syncing Xano APIs to MDX docs...\n");

  const allNavGroups = [];
  let totalGenerated = 0;
  let totalRemoved = 0;
  let synced = 0;
  let failed = 0;
  let skipped = 0;

  for (const group of config.groups) {
    if (group.excluded) {
      skipped++;
      continue;
    }

    if (!group.specUrl) {
      console.log(`  ⚠ Skipping "${group.name}" (no specUrl)`);
      skipped++;
      continue;
    }

    const spec = await fetchSpec(group);
    if (!spec) {
      failed++;
      continue;
    }

    const paths = Object.keys(spec.paths || {});
    if (paths.length === 0) {
      console.log(`    ⚠ No endpoints in ${group.name}, skipping`);
      skipped++;
      continue;
    }

    const result = syncGroup(spec, group, dryRun);
    totalGenerated += result.generated;
    totalRemoved += result.removed.length;

    if (result.removed.length > 0) {
      console.log(`    🗑 Removed ${result.removed.length} stale file(s): ${result.removed.join(", ")}`);
    }

    console.log(`    ✓ ${result.generated} endpoint(s)`);

    allNavGroups.push({
      group: group.name,
      pages: result.pages,
    });

    synced++;
  }

  console.log(
    `\n📊 Results: ${synced} groups synced, ${totalGenerated} files generated, ${totalRemoved} removed, ${failed} failed, ${skipped} skipped`
  );

  if (synced > 0) {
    updateDocsJson(allNavGroups, dryRun);
  }

  if (dryRun) {
    console.log("\n(Dry run — no files were written)");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
