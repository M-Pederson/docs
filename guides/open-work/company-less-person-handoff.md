# Company-less person enrichment — handoff (updated 2026-07-27)

Core enrichment assumed every person has a company. **Seven defects** trace to that assumption,
plus one regression introduced while fixing them. **All are fixed and live.** Janet Jackson is the
company-less fixture; at the time of writing she is **not yet a verified 100% pass** — a full
wipe + run was in flight when this was written. Do not treat the fixes below as proven until a
gated run says so.

Why this matters (Mark, 2026-07-26): *"we def need ability to create a person without a
company! We might get a person email - that does not resolve enrichment - so ...100% we will
need to create people without a company and not fail."*

## Fixed and live

All byte-verified against the live script after publish; `draft_updated_at` null before and after.

| # | Function | Version | What changed |
|---|---|---|---|
| 1 | `mvp/imdb/resolve-upsert-award` `13246` | v1.5 | Created `film_tv_award` rows and never enqueued them → awards had neither graph node nor queue row → permanent `award_missing_graph_or_retryable_queue` readback failure. Now enqueues via `13244` when no queue row exists. Passes **no** `priority_tier`, so `13244` owns banding/equalization. |
| 2 | `mvp/enrich/enrich-master-person` `13040` | v3.79 | Pre-phase-7 terminal reservation was gated on `master_company_id` being non-empty → company-less people got no dependency, no receipt, nothing for task `193` to sweep. Now reserves for every root run; `run_id` becomes `person-{pid}-nocompany-dependency-{did}`. |
| 3 | `mvp/enrich/run-person-non-bio-terminal-continuation` `13235` | v1.35 | `ready` required `fresh && succeeded`, permanently false with no company. Now requires them **only when a company exists**. |
| 4 | `mvp/enrich/sweep-person-non-bio-terminal-retries` `13260` | v1.29 | `verified` had a hard `selectedCompanyId > 0` conjunct. Now: with a company the person's company must **equal** the dependency's; without one, both must be absent. |
| 5 | `mvp/bios/enforce-current-role` `13189` | 2026-07-26 | `precondition ($roleBio.valid)` hard-failed when there was no bio to validate. Now also passes when `nothing_to_enforce` (no bio **and** no current role **and** no company), with explicit telemetry. |
| 6 | `dates/ensure-company-founded-date` `13234` | **v1.2** | "Cannot project founded date for a missing company" ×4 from the terminal sweeper. `person_terminal_company_dependency` stores `0`, not null, and the sweeper passed it straight through. Now **no company (`id <= 0`) is a clean skip**; a **positive id that does not resolve still throws** — that dangling-reference check is what every company writer relies on and is unchanged. `founded` reads via `\|get:"founded":null` so the empty path never dereferences a missing row. |
| 7 | `mvp/imdb/add-award-records-from-imdb-person` `12887` | **v1.1x** | "Duplicate record detected" ×2 counted as real crashes. Benign check-then-insert race on `film_tv_award`, UNIQUE on `(canonical_identity_key, imdb_person_id)` (index `b69c6ec6`). Classified at the catch site per the `10509`/`12881` pattern; benign races log with **no** `error_message`. |
| 8 | `mvp/imdb/add-award-records-from-title` `12879` | **v1.20** | Same treatment, ×1. |
| 9 | `mvp/enrich/record-person-terminal-stage` `13203` | 2026-07-27 | Sanctioned `success → running` for the auxiliary preflight generation stage. See defect 5. |
| 10 | `mvp/enrich/sweep-person-non-bio-terminal-retries` `13260` | **v1.30** | CAS the `terminal_preflight_v2` proof commit + assert `transition_applied`. See defect 5. |
| 11 | `13040` v3.80, `13235` v1.36, `13248`, `13199` | 2026-07-27 | Run-id alignment: all constructions emit the company-less shape. See defect 6. |
| 12 | `mvp/enrich/resolve-person-terminal-company-dependencies` `13199` | 2026-07-27 | Company-less dependency settles `success`. See defect 7. |
| 13 | `mvp/imdb/resolve-upsert-award` `13246` | **v1.8** | Award graph node refreshed directly via `#2334` when `canonical_identity_key` changes. See defect 3 + the regression. |

Schema: `person_terminal_company_dependency` (table **760**) `master_company_id` is
`nullable=True, required=False`. In practice it stores `0`, not `null` — all guards use
`Number(x || 0) > 0`, so `0` and `null` behave identically.

**No table schema was changed on 2026-07-27.** Every schema `updated_at` predates the session;
all work was function/task code.

## Defect 3 — award `canonical_identity_key` rewritten without a graph refresh

`13246` builds a merged award's key as `[incoming.event_key, finalCategory]` — the **resolving
caller's** event key, not the survivor's. `event_key` embeds `titleIdentity`, which is
`master_person_{id}` when the call carries no `project_title` and `title_{slug}` when it does.
So **any later resolve can flip the key of an already-materialized award**, and the `db.edit`
writes it on *both* merge branches (`upgraded_sparse` and `exact_or_richer_match`).

Nothing re-materialized the node, so table and graph diverged permanently and `13194`'s terminal
readback failed with `materialized_award_structured_property_mismatch` — 10 of 93 awards on one
Janet run, 3 of 89 on another (`master_person_1|…` in the graph vs `title_janet_jackson|…` or
`title_n_a|…` in the table).

Critically, the readback gives **no queue tolerance for this case**: the `retryableQueue` check
sits *after* an `if (awardUuid) { … continue; }`, so once an award has a `node_uuid` it must match
the graph exactly and immediately. A pending refresh does not excuse it.

**Fix (v1.8):** on a key change to a row that already has a `node_uuid`, call
`mvp/edge/add-node-edge-imdb-award` `#2334` directly. `#2334` MERGEs by `uuid` and re-`SET`s
`canonical_identity_key`, preserving `node_uuid` and `edge_uuid`. Verified live via QA endpoint
`8911` on award 17: graph moved `master_person_1|…` → `title_janet_jackson|…`, both uuids intact.
Failure is caught and logged as telemetry only — the refresh is best-effort repair and `13194`
remains the authority on any surviving mismatch.

**Root cause is NOT fixed.** The key still flips scope based on whether a given caller happened to
carry a `project_title`. Making `event_key` scope-stable is the real fix and rewrites every
existing `canonical_identity_key` — large blast radius on the graph merge key (see docs trap #27).
Deferred deliberately.

## 🔴 Regression introduced and resolved — read before touching `13244`

The first shape of the defect-3 fix re-enqueued through `mvp/queue/upsert-imdb-award-graph`
`13244`. That **corrupted `priority_tier`**: unlinked awards driven to the `-1` sentinel, failing
the `no_zero_aggregation` health gate. **18 rows on one run, 58 on the next.**

Two guards were attempted and **both failed**:
- `13246` v1.7 — only call when the queue row is already `status=success`
- `13244` v1.9 — give the `refresh_materialized` branch precedence over every existing-row branch

**The origin of the `-1` was never identified.** `$awardTier` returns 3 for unlinked awards, and
none of `$seedTier`, `$promotedTier` or `$effectiveTier` can go negative (all clamped `>= 0`); the
column default is `3`. It remains unexplained and is **latent for any future caller that reaches
`13244`'s requeue branch**.

The resolution was to stop guarding and remove the path: `13246` v1.8 calls `#2334` directly and is
no longer anywhere in the queue writer's call path. This makes the `-1` moot for this code, not
solved. Live exposure throughout was **zero** — both `live` and `staging` award queues were empty.

Lesson, generalising docs trap #23: guarding your *own* new branch is not enough. The **fall-through**
into an existing branch is also a writer. Before adding a call to a function that writes a shared
field, check every branch your call can land in, not just the one you added.

## Defect 5 — terminal preflight livelock (two layers)

`terminal_materialization` sat at `pending att=0` forever while the sweeper burned a cycle every
6 minutes.

**Layer 1 — the spent generation could not be re-claimed.** The preflight proof snapshots
`master_person.updated_at`; the reuse gate demands exact equality. Any write to the person after
the proof invalidates it — measured at 13 minutes' drift on Janet, caused by
`run-person-callback-terminal` ("cross-waterfall music bridge executed before IMDb"). The sweeper
then tried a fresh frame, but `person_terminal_stage` is UNIQUE(run_id, pipeline, stage) and
`13203`'s transition table sanctioned `error → running` but **not** `success → running`, so the
claim was refused `illegal_or_stale_success_to_running` every cycle.

Fixed in `13203` by mirroring the existing `error → running` rule for `from === 'success'`. Safe by
construction: `exactAuxiliaryCas` is already gated on
`auxiliaryGeneration = stage === 'terminal_preflight_generation'`, so it cannot touch a required
terminal stage or any `deep_bio` stage. `retry: false` — the attempt count is unchanged; this
regenerates a spent proof rather than retrying failed work.

**Layer 2 — the fresh proof was silently discarded.** The `terminal_preflight_v2` commit passed
**no CAS fields**, so a second write was `success → success` with no exact CAS, which `13203`
answers with `terminal_success_immutable_noop` (`apply: false`). The stale proof was retained
forever. The precondition right after **could not catch it**: a refused write returns the
pre-existing row, whose `status` is `success` and whose *old* `result.verified` is `true`.

Fixed in `13260` v1.30 by passing `expected_receipt_id` / `expected_run_id` /
`expected_attempt_count` / `expected_from_status` (taking `13203`'s `exact_cas_success_refresh`
path) **and** asserting `transition_applied` so a refused write can never pass silently again.

Both layers verified live: dispatch moved `superseded_generation` → `dispatched`, and
`terminal_preflight_v2` unfroze from 05:31:52 to 06:43:53 with the watermark matching.

## Defect 6 — run-id shape inconsistency

`13040` v3.79 taught the phase-7 **reservation** to emit `person-{pid}-nocompany-dependency-{did}`,
but **four other sites that recompute the same id** still emitted the pre-v3.79
`person-{pid}-company-dependency-{did}` (or an empty string). The sweeper therefore settled a
run_id with no receipt — observed as `action=deferred / settled=true / verified=true` against
`person-1-company-dependency-1` while the real receipt stayed `pending att=0`.

Aligned in `13040` v3.80 (3 sites), `13235` v1.36, `13248`, `13199`.

**`13235`'s `$legacyTerminalRunId` is deliberately NOT aligned** — it is the backward-compatibility
probe that finds receipts written under the old shape and repairs them onto the canonical id
(`repaired_from_legacy_run_id` → `canonical_run_id`). That divergence is the migration mechanism.

## Defect 7 — company-less dependency never settles (the real blocker)

The same defect as #3 and #4 above, in a **third site that was missed**.

In `13199`'s decision lambda, for a company-less person:
- `selectedCompanyStillMatches` = `0 === 0` = **true** → retarget branch skipped
- `historyClosed` = needs an `enrich_history_company` row → **false**
- `freshCompanyCommit` = needs `master_company.last_enrich` → **false**

Every branch falls through, `status` stays `'pending'`, and `terminal: status !== 'pending'` is
false — so the dependency row is **never written**. `13235` then defers forever on
`if ($dependency.status != "success")` and returns a typed `deferred` result that the sweeper
treats as settled.

Measured: dependency `status: pending` with an **empty error** across ~68 sweep cycles over
6.8 hours.

Fixed by adding `hasCompany` (true if **either** side carries a company) and settling `'success'`
when false — the dependency is vacuously satisfied because there is no company to enrich or
verify. A retarget in or out of a company still takes the normal path. Must be exactly `'success'`;
`13235` accepts nothing else.

## Which crons are required

Most tasks are throughput drains. Only these matter for a run to **terminate**:

| Task | DS | Freq | Why |
|---|---|---|---|
| **192** `sweep-person-non-bio-terminal-retries` | live | 60s | **The critical one.** `13040` reserves the terminal receipt and nothing else executes it. Without 192 every person's terminal receipt sits `pending` forever. |
| **191** `process-queue-imdb-award-graph` | live | 60s | Required for the terminal **readback**, not throughput — see defect 3's no-queue-tolerance note. |
| **193 / 195** | sandbox | 360s / 60s | Sandbox twins of 192 and 191. **195 was created 2026-07-27.** |
| **194** `process-queue-musicbrainz-sandbox` | sandbox | 60s | Sandbox QA only — doubles as the wipe **certifier**. With it off, every wipe hangs at `verifying` forever. |

**Not required for termination** (pure backlog drains, all currently off): `126` person-queue,
`127` company-queue, `159` imdb-person, `160` imdb-title, `180` musicbrainz, `182` person-resolution.

`deep_bio` needs **no cron at all** — its five receipts settle via callbacks.

The failure mode of a missing `192` is invisible from `full_enrich`, which still flips `true`.
Only the receipts show it.

## Operational constraints — do not violate

- **Tasks `192`, `193`, `194`, `195` must stay ENABLED** (see table above).
- **Sandbox only.** Never run `xano function run` or MCP `runWorkspaceFunction` for anything
  data-touching — neither accepts a data-source parameter and both default to **live**. Drive
  sandbox work through API endpoints with `X-Data-Source: sandbox`.
- **Any whole-table schema save strips column validators**, including through the Xano UI.
  Snapshot `GET /table/{id}/schema` and diff before/after any column change.
- Publish with `xano function edit <id> -p orbiter -w 3 -f <file> --publish`, then byte-verify
  against the live script. Check `draft_updated_at` is null before editing.
- The serializer normalizes expressions (drops redundant parens), **strips `== true`**, and
  **strips defaults from optional inputs** (`int x?=0` stores as `int x?`) — so guard with
  `|first_notnull:0` rather than relying on the declared default.
- **`//` comments are not valid inside an object literal.** Putting them inside an `input = { … }`
  block produces a syntax error whose reported line/column points somewhere else entirely.
- The Metadata API **ignores `xanoscript` on both POST and PUT for tasks** — it will create the
  task with an empty stack and report success. The MCP `updateTask` is the write path. The CLI has
  no `task` topic.

## How to run the gated chain

Scripts live in `~/work/qa-scripts/`. `.tok` is a Xano metadata API bearer token; refresh if 401.

```bash
cd ~/work/qa-scripts && ./finish_all.sh
```

Full wipe → wait for task `194` to certify → seed → settle → **gate**, per subject, sequentially.
Mark's instruction: *"Do not proceed to next test unless first test is 100% pass!!"* — fail-closed
via `set -e` plus an explicit `|| exit 1` on each gate.

`qa_snapshot.py` exits non-zero unless **all four** hold: `full_enrich is True`; health
`passed=True`; **zero** real crashes; every receipt in `success`/`superseded`. `vacuous` health
checks do **not** fail the gate.

Do **not** pipe the script through `tee` — the reported exit code becomes `tee`'s, which masks a
failing gate.

Seeds (API `8861`, `POST /api:ewwK9hZc/tmp-person-waterfall-smoke`):

| Subject | `linkedin_url` value |
|---|---|
| Janet Jackson | `https://www.imdb.com/name/nm0001390/` |
| Ryan Reynolds | `https://www.linkedin.com/in/vancityreynolds/` |
| Chamillionaire | `https://www.linkedin.com/in/chamillionaire/` |

`8861`'s `linkedin_url` input is a **misnomer** — internally it does `links: [$input.linkedin_url]`,
so any single URL works, including an IMDb one.

## After the chain

1. **Ryan is the regression check that matters most.** Nine functions changed on 2026-07-27 and six
   of them — `13203`, `13260`, `13040`, `13235`, `13248`, `13199` — sit in the terminal path
   **every** person traverses; `13244`/`13246` are on every IMDb award. Janet passing proves only
   the company-less path. Ryan's baseline is 9/9 with 55 equalization pairs, 0 vacuous, 5/5 Core +
   5/5 Deep Bio receipts, ~19-20 min.
2. Chamillionaire re-proves the `13194` deadlock fix through a company retarget. Watch `13260`
   v1.29's `selectedCompanyId === dependencyCompanyId` equality there specifically — he is the
   subject that retargets (company 1 → 4).

## Open items

- **Root-cause the award key flip** (defect 3). The refresh repairs; it does not stop the scope
  flip. Needs its own session — see docs trap #27 before touching `canonical_identity_key`.
- **The unexplained `-1`** in `13244`. Latent for any caller reaching the requeue branch.
- **`refresh_materialized` in `13244` is now dead code** (v1.8/v1.9). Nothing calls it. Remove it.
- **`13244`'s sibling propagation writes `promotion_source`, which is not a column on table `764`.**
  Pre-existing, noticed in passing, not investigated.
- **Reorder option** for the bio gate: move the pre-expertise reconciliation block in `13040` to
  after the cross-waterfall music/IMDb phase. Mark chose *tolerate* first. Lower value than it
  appeared — the bio **is** generated later regardless, and `13194` independently validates it at
  terminal time. Would also reduce (not eliminate) defect 5's watermark drift.
