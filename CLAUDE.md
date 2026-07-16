# Orbiter.io API Documentation — Reference Guide

## Project Overview

This is the Mintlify documentation site for Orbiter.io. API docs are generated from the Xano backend (workspace ID: 3, OrbiterV2).

## Orbiter Backend navigation is script-managed

The "Orbiter Backend" group in `docs.json` lists its endpoints explicitly (subgroups per OpenAPI tag, alphabetical; entries as `"METHOD /path"`) because Mintlify cannot sort auto-generated OpenAPI navigation. **Do not hand-edit that group.** After any change to `api-reference/orbiter-backend/openapi.yaml`, run:

```bash
node scripts/sync-orbiter-backend-nav.mjs
```

CI does this automatically on pushes to `main` that touch the spec (`.github/workflows/sync-orbiter-backend-nav.yml`), and the daily Xano sync runs it as a safety net. Use `--check` to verify sync status, `--dry-run` to preview.

## Orbiter Universe display-table modeling memory

When documenting Orbiter Universe graph nodes, card/read-model tables, or side-panel hydration, use this frame:

- Start from the ideal entity list first: graph/source entities imply potential display/card types.
- Then combine into physical App display tables where the UI contract is the same. These are **display tables**, not "snapshot" tables.
- Use `*_display` names for greenfield App read models unless a table is truly card-only.
- `person_display` and `company_display` are broad display tables for cards, search rows, side-panel headers, and compact side-panel summary data. Other entity display tables are card-only by default unless the product explicitly adds first-class detail panels for that type.
- School, VC firm, and Organization stay company-shaped: combine into `company_display` with type/label discriminator fields unless the UI diverges.
- Do not create card/display tables for location, expertise, or credential/achievement nodes by default. `Country`, `Region`, `State`, `City`, MusicBrainz `Place`, `DomainExpertise`, `SubDomainExpertise`, `Certification`, and `Honor` should appear as facets, filters, badges, side-panel context, or relationship metadata unless the product explicitly needs standalone cards later.
- Side panels are composed views. Universe projection writes public/enrichment-backed display rows and public side-panel facts; the App backend also joins user/team/org-scoped dynamic data at read time, such as files, notes, collections, private relationship context, reminders, permissions, and workflow state. Universe projection must not overwrite those dynamic sections.
- For Film/TV, keep `Film_TV` title subtypes (`Movie`, `TV_Series`, `TV_Movie`, `TV_Mini_Series`, `Short_Film`, `Documentary`, `TV_Special`, `Video_Game`, `Music_Video`) in one `film_tv_display` unless the UI needs separate contracts. `Film_TV_Award` gets its own `film_tv_award_display`.
- IMDb people are source-specific person facts, not a separate card design or display table. Project/reconcile `imdb_person` data into the graph `Person` node and App `person_display`.
- For MusicBrainz, the graph should have nine node types before display/card consolidation: `Person:Music_Artist`, `Music_Group`, `Recording`, `Work`, `Release_Group`, `Release`, `Company:Music_Label`, `Event:Music_*`, and `Place`. Genres are properties on music nodes, not `Entity:Genre` nodes or `HAS_GENRE` edges. Card/display tables are narrower than graph nodes: use separate card designs for `Person:Music_Artist`, `Music_Group`, and `Recording`; keep `Release_Group`, `Release`, and `Place` out by default because they are graph/support nodes, not standalone cards; fold `Company:Music_Label` into `company_display`; and fold `Event:Music_*` into the Event card design / `live_event_display`.

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
8. **`vectors/create-vectors-string` (#4676) returns a `"[0.1,...]"` string at the XanoScript level — but Xano auto-parses it to a JS ARRAY when read as `$var.x` inside an `api.lambda`.** So splice raw (`vecf32(' ~ $x ~ ')`) in XanoScript, but inside a lambda treat it as an array (`vecf32(' + JSON.stringify($var.x) + ')`). A lambda doing `String($var.x).startsWith('[')` sees `"0.1,0.2,…"` (no brackets) and silently drops or throws on the embedding. `vectors/create-gemini-vectors` (#13114) is a 3072-dim array the same way (1536 for #4676). Use a `toArg` helper that accepts both an array and a bracket-string. *(Verified 2026-06-14 — had silently broken `name_embedding` in `add-music-artist-node` #13092 and `backfill-node-descriptions` #13113.)*
9. **Tasks: include `active = false` explicitly** — omitting it ships the cron live immediately.

Added 2026-06-12 (second session):

10. **`log_crash.phase` (#542) is a STRICT enum** — writing a value outside the list makes the crash-logger itself fail at runtime. Check the enum (`get_table_schema` 542) before any `db.add log_crash` with a new phase; append values first. (Latent example: `mvp/imdb/backfill-film-tv-posters` #13047 logs phase `poster_upload`, which is not in the enum — its catch path is broken.)
11. **Enum values can't be edited via the MCP** — `update_field` has no values param, and the Metadata API per-field PUT routes (`/schema/{field}`, `/schema/type/enum/{field}`) 404. The working route is a whole-schema read-modify-write: `GET /api:meta/workspace/3/table/{id}/schema` → append to the field's `values` → `PUT .../schema` with `{"schema": [...]}`.
12. **Xano lambdas read inputs via `$input.x` and stack vars via `$var.x`** — referencing `$var.foo` for something that only exists as an input silently yields undefined (no error). When cloning a lambda between functions, re-check every `$var.`/`$input.` prefix against the new context.
13. **Reasoning models on OpenRouter (e.g. `deepseek/deepseek-v4-flash`) can return EMPTY `content`** — they burn the completion budget on reasoning tokens for larger prompts, and `choices.0.message.content` comes back `""` while `message.reasoning` holds the thinking. For short structured outputs, pass `reasoning: {enabled: false}` (+ a `max_tokens` cap). Symptom: intermittent null LLM results that look like model refusals (found live in `mvp/music/create-node-description` #13112 — 3 of 4 rows silently skipped until patched).

Added 2026-06-14 (image_url + Gemini dual-embedding session):

14. **A bare filter-chain in `if (...)` does not evaluate truthy.** `if ($x|get:"flag":false)` never fires even when the value is `true` — and the serializer *strips* an explicit `== true`, so you can't force it that way. Use the `== false` comparison (which survives serialization) and invert, or compare to a concrete value: `if (($x|get:"flag":true) == false) { … }`. (Verified live — a `need_name_emb` gate silently skipped every row in `backfill-node-embeddings` #13115.)
15. **FalkorDB vector indexes are on the `:Entity` base label, not per-node-type.** `CALL db.indexes()` shows one `vector:name_embedding` index on `:Entity` (1536-dim, cosine, M:16) + `expertise_embedding` — every music/people/company node shares it via the `Entity` base label. A new vector property (e.g. Gemini `embeddings` 3072) needs ONE `CREATE VECTOR INDEX` on `:Entity` to cover all node types. Setting a `vecf32` property *without* an index is fine (stored, just not KNN-searchable). Dims: OpenAI `text-embedding-3-small` = 1536, `google/gemini-embedding-001` = 3072.

Added 2026-06-14 (person-resolution session):

16. **MCP `updateTableSchema` (full-schema replace) silently DROPS column `filters=trim`/validators** — even when you pass `validators:{trim:true}` in the schema array, the stored column comes back with no validator. There is **no incremental column-add** via the MCP (only the destructive full-replace), so adding any column to an existing table strips `filters=trim` from every text column on it. Data is preserved (rows + types intact); only the write-time auto-trim is lost. Re-fetch the table XanoScript (`getTable include_xanoscript`) after the edit — `filters=trim` will be gone. Restore via the raw Metadata API whole-schema PUT (same route as trap #11) if the trim matters. *(Verified live — `mb_artist` mbid/name/artist_type/node_uuid lost trim when adding `master_person_id` + avatar columns.)*
17. **A `var` declared + `var.update`'d OUTSIDE a `try_catch` reads back EMPTY inside the try block's `api.lambda`s.** `var $x {value={}}` → `api.lambda{} as $raw` → `var.update $x {value=$raw}` *before* a `try_catch`, then an `api.lambda` *inside* the try reading `$var.x`, sees `{}` (the pre-update value), not the updated object. Compute/assign the var with a direct `as $x` **inside the same `try` scope** where the lambda consumes it. (Outer plain vars ARE visible in try blocks — see #13091 — so this is specific to the declare-then-`var.update` pattern across the try boundary.) *(Verified live — silently zeroed `social_count` in `mb/run-person-resolution` #13121 until the vset extraction was moved into the try.)*
18. **`function.run` targets can store as `""` even when the callee ALREADY exists** (extends #2). Hit on a **task** create whose callee function was created seconds earlier — the target serialized empty despite the callee being live. Re-storing the caller (`updateTask`/`updateFunction`) after the callee is confirmed resolves it. Always re-fetch and assert the stored `function.run "<name>"` target is non-empty, not just on first create.
Added 2026-07-16 (address natural_key session):

20. **CLI `xano function edit` saves a DRAFT unless you pass `--publish`.** Without the flag, callers hit "Function does not exist: function:<id>" and the new code isn't live. Always `xano function edit <id> -w 3 -f file.xs --publish`.
21. **MCP `runWorkspaceFunction` reports "Function does not exist: function:<id>" for NESTED `function.run` calls to freshly-edited functions — a DEBUGGER ARTIFACT ONLY.** Direct runs of the edited function work; the real API gateway resolves everything fine (verified live 2026-07-16 via a temp probe endpoint through `api:.../...` with X-Branch v1). Do NOT mass re-store callers or roll back based on this error alone — verify through the gateway first. Corollary: end-to-end validation of edited call chains must go through a real API endpoint (temp unauth probe in an existing group, deleted after), not the MCP runner.

19. **🔴 The Xano CLI `xano workspace push` WIPES a data source's records — even with `--include` for one table.** A `workspace push` *re-imports* the workspace (the push warned "…after import"), and that **truncated the entire `sandbox` data source** (`mb_artist`, `master_person`, `master_link` all → 0 rows) while `live` + `staging` records survived. `--dry-run` only previewed the schema field changes (`UPDATE_FIELD ×4`), NOT the data wipe — so the destruction was invisible until after. The CLI *is* the only way to restore `filters=trim` (trap #16: it pushes XanoScript, which carries the filter, and it DID restore the trim), but the cost was the sandbox data. **NEVER `xano workspace push` against a live workspace for a schema edit.** For schema-only changes use the Xano UI (preserves data); the MCP `updateTableSchema` is non-destructive to data (just drops validators per #16). *(Verified live — restoring `mb_artist` trim via the CLI emptied the sandbox data source; production/live untouched.)*
