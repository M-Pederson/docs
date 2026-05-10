# Orbiter.io API Documentation — Reference Guide

## Project Overview

This is the Mintlify documentation site for Orbiter.io. API docs are generated from the Xano backend (workspace ID: 3, OrbiterV2).

## Xano MCP Workflow

When creating API documentation for a new group:

1. **List API groups:** `listAPIGroups` (workspace_id: 3) to find the group ID and canonical
2. **List endpoints:** `listAPIs` with the group's `apigroup_id`
3. **Get swagger spec:** `getApiGroupSwagger` for full endpoint details (inputs, outputs, auth)
4. Create MDX files under `api-reference/{group-name}/`
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
    "api-reference/{group-name}/endpoint-1",
    "api-reference/{group-name}/endpoint-2"
  ]
}
```

## API Groups Reference

| Group | ID  | Canonical  | Base URL                                          |
| ----- | --- | ---------- | ------------------------------------------------- |
| Auth  | 27  | `qMCc0ojP` | `https://xh2o-yths-38lt.n7c.xano.io/api:qMCc0ojP` |

<!-- Add new groups here as they are documented -->

## File Conventions

- Directory per API group: `api-reference/{group-name}/`
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
