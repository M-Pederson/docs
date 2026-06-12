# Orbiter.io API Documentation — Reference Guide

## Project Overview

This is the Mintlify documentation site for Orbiter.io. API docs are generated from the Xano backend (workspace ID: 3, OrbiterV2).

## Xano MCP Workflow

When creating API documentation for a new group:

1. **List API groups:** `listAPIGroups` (workspace_id: 3) to find the group ID and canonical
2. **List endpoints:** `listAPIs` with the group's `apigroup_id`
3. **Get swagger spec:** `getApiGroupSwagger` for full endpoint details (inputs, outputs, auth)
4. Create MDX files under `api-reference/xano/{group-name}/`
5. Add the group to `docs.json` navigation under the "API Reference" tab

## Base URL Format

Each API group has its own base URL using the Xano canonical:

```url
https://xh2o-yths-38lt.n7c.xano.io/api:{group_canonical}/{endpoint}
```

Example (Auth group, canonical `qMCc0ojP`):

```url
https://xh2o-yths-38lt.n7c.xano.io/api:qMCc0ojP/auth/login
```

## Required Headers

Every request to the Xano API requires these headers:

| Header          | Type   | Required    | Description                                          |
| --------------- | ------ | ----------- | ---------------------------------------------------- |
| `Content-Type`  | string | Always      | `application/json`                                   |
| `X-Data-Source` | string | Always      | Identifies the data source for the request           |
| `X-Branch`      | string | Always      | Xano branch to target (`v1`, `staging`, `dev`, etc.) |
| `Authorization` | string | Conditional | `Bearer {token}` — only for authenticated endpoints  |

## MDX Endpoint File Template

````mdx
---
title: "{Endpoint Title}"
api: "{VERB} https://xh2o-yths-38lt.n7c.xano.io/api:{group_canonical}/path/to/endpoint"
description: "{Short description}"
---

## Overview

{What this endpoint does and when to use it.}

## Headers

<ParamField header="X-Data-Source" type="string" required>
  Identifies the data source for the request.
</ParamField>

<ParamField header="X-Branch" type="string" required>
  The Xano branch to target (e.g. `v1`, `staging`, `dev`).
</ParamField>

<!-- Only include Authorization if endpoint requires auth -->

<ParamField header="Authorization" type="string" required>
  Bearer token obtained from login or signup.
</ParamField>

## Request Body

<!-- Use ParamField body for each input from the swagger spec -->

<ParamField body="field_name" type="string" required>
  Description of the field.
</ParamField>

## Response

<!-- Use ResponseField for each output field -->

<ResponseField name="field_name" type="string">
  Description of the response field.
</ResponseField>

<RequestExample>
```bash cURL
curl -X {VERB} https://xh2o-yths-38lt.n7c.xano.io/api:{canonical}/{path} \
  -H "Content-Type: application/json" \
  -H "X-Data-Source: YOUR_DATA_SOURCE" \
  -H "X-Branch: v1" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "field": "value"
  }'
</RequestExample>

<RequestExample>
```json 200
{
  "field": "value"
}

</ResponseExample>
```

## docs.json Navigation Structure

New API groups go under the "API Reference" tab:

```json
{
  "group": "Group Name",
  "pages": [
    "api-reference/xano/{group-name}/endpoint-1",
    "api-reference/xano/{group-name}/endpoint-2"
  ]
}
```

## API Groups Reference

| Group | ID  | Canonical  | Base URL                                          |
| ----- | --- | ---------- | ------------------------------------------------- |
| Auth  | 27  | `qMCc0ojP` | `https://xh2o-yths-38lt.n7c.xano.io/api:qMCc0ojP` |

<!-- Add new groups here as they are documented -->

## File Conventions

- Directory per API group: `api-reference/xano/{group-name}/`
- Kebab-case filenames: `login-clerk.mdx`, `add-local-timezone.mdx`
- Match endpoint names where possible
- Include realistic example values in request/response examples
````

## Xano artifact reference blocks (functions, tables, APIs)

When a docs page lists Xano artifacts created or referenced for a feature (functions, tables, API endpoints), use the **Card + fenced code block** pattern. Locked example: `guides/open-work/fundable-investor-enrich.mdx`.

Each artifact gets its own block with:
- A `<Card>` component with an `icon` only (no `title` prop)
- A fenced code block inside the card body, on its own paragraph, containing `name — ID` as the first element. Mintlify renders this with a bordered, tinted-background container AND a one-click copy icon in the top-right.
- A short plain-English description paragraph below the code block.

```mdx
<Card icon="play">

```
enrichment/resolve_org_identity — 12984
```

**Public entry point** — the function callers invoke. Orchestrates context build → classify → LLM call → write-back.

</Card>
```

Icon conventions (Font Awesome names — Mintlify supports them directly):

| Artifact kind | Icon |
|---|---|
| Public entry point / orchestrator function | `play` |
| Context-assembly / join-builder function | `layer-group` |
| Classifier / filter function | `filter` |
| External API call / OpenRouter / network | `cloud-arrow-up` |
| Database table | `database` |
| Public HTTP endpoint / API wrapper | `globe` |
| Helper / utility function | `wrench` |
| Backfill / scheduled task | `clock-rotate-left` |

Use this pattern whenever the page is a quick-reference for "what got built in Xano" — the kind a teammate scans to find an ID to copy into another function's `function.run` call. Do NOT use this pattern when the page is a tutorial / step-by-step / deep-design explainer — those should use plain headings + code examples instead.

### Notes
- Blank lines before/after the fenced code block inside the Card are **required** — MDX won't parse the code block correctly otherwise.
- Omit the `title` prop on Card so the icon sits cleanly at the top-left and the code block becomes the visible label.
- Keep descriptions to 1–2 short paragraphs. Anything longer should live on a separate detailed page (and be linked at the top/bottom of the reference page).

## XanoScript authoring traps (verified by live failures, 2026-06-11)

When creating or patching Xano functions/tables/tasks via the MCP, these WILL bite — each was confirmed by a real failure while building the MusicBrainz pipeline:

1. **Re-fetch after every create/update.** The serializer silently rewrites code: inline `{...}`/`[...]` literals or parenthesized `(expr)|filter` chains in `var` values can be stored as backtick **template strings** (dead expressions at runtime). After any `createFunction`/`updateFunction`, `getFunction` with `include_xanoscript: true` and diff the stored body.
2. **`function.run` targets store as empty strings** when the named callee doesn't exist yet at create/update time — and they do NOT self-heal when the callee is created later. Create callees before callers; re-store callers afterward.
3. **No leading-`?` nullable marker** (`timestamp ?updated_at?` is a syntax error despite appearing in doc examples). Trailing `?` (optional) and `?=default` only; "nullable" fields land as not-null with empty/zero defaults.
4. **`'\\n'` inside `api.lambda` heredocs stores a literal backslash-n** → FalkorDB fails with `Invalid input '\'`. Join Cypher fragments with spaces, or use single-backslash `'\n'` (e.g. `lines.join('\n')` stores correctly).
5. **FalkorDB rejects `a:Label` predicates in WHERE** — use `'Label' IN labels(a)`. `mvp/falkor/send-cypher` (#2815) returns Cypher errors as **strings**, not thrown errors — check `typeof r === 'string'` before reading `.data`, or failures read as silent nulls.
6. **`each as $index` may not resolve** when referenced inside conditionals in API endpoints (`Missing var entry: $index`). Guard loops with a counter var or `($results|count) < $cap` instead.
7. **Defaulted ints that may legitimately be 0** (priority tiers, depths) must use `first_notnull`, never `first_notempty` (0 is "empty" and gets coerced to the default). Same for bool flags.
8. **`vectors/create-vectors-string` (#4676) returns a string** `"[0.1,...]"`, not an array — splice directly into `vecf32(...)`; an `Array.isArray` guard silently drops the embedding.
9. **Tasks: include `active = false` explicitly** — omitting it ships the cron live immediately.
