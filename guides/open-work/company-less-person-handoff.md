# Company-less person enrichment — handoff (2026-07-26)

Core enrichment assumed every person has a company. Six defects trace to that one assumption.
**Five are fixed and live. Two remain.** Janet Jackson is the fixture; she reached
`full_enrich=true` for the first time on run 3 but is **not yet a 100% pass**.

Why this matters (Mark, 2026-07-26): *"we def need ability to create a person without a
company! We might get a person email - that does not resolve enrichment - so ...100% we will
need to create people without a company and not fail."*

## Fixed and live (all byte-verified, no drafts)

| # | Function | Version | What changed |
|---|---|---|---|
| 1 | `mvp/imdb/resolve-upsert-award` `13246` | v1.5 | Created `film_tv_award` rows and never enqueued them → awards had neither graph node nor queue row → permanent `award_missing_graph_or_retryable_queue` readback failure. Now enqueues via `13244` when no queue row exists. Passes **no** `priority_tier`, so `13244` owns banding/equalization (per that function's v1.3 warning against a third tier writer). |
| 2 | `mvp/enrich/enrich-master-person` `13040` | v3.79 | Pre-phase-7 terminal reservation was gated on `master_company_id` being non-empty → company-less people got no dependency, no receipt, nothing for task `193` to sweep. Now reserves for every root run; `run_id` becomes `person-{pid}-nocompany-dependency-{did}`. |
| 3 | `mvp/enrich/run-person-non-bio-terminal-continuation` `13235` | v1.35 | `ready` required `fresh && succeeded`, which are permanently false with no company (no `master_company` row → `last_enrich` 0; no `enrich_history_company` → `history.id` 0). Now requires them **only when a company exists**. |
| 4 | `mvp/enrich/sweep-person-non-bio-terminal-retries` `13260` | v1.29 | `verified` had a hard `selectedCompanyId > 0` conjunct. Now: with a company the person's company must **equal** the dependency's (stricter than before); without one, both must be absent. |
| 5 | `mvp/bios/enforce-current-role` `13189` | 2026-07-26 | `precondition ($roleBio.valid)` hard-failed ~21s in when there was no bio to validate, aborting Core before music/IMDb supplied any material. Now `precondition ($roleBio.valid \|\| $roleBioEnforcementScope.nothing_to_enforce)`, where `nothing_to_enforce` = no bio **and** no current role **and** no company. Empty case writes explicit telemetry, never silent. |

Schema: `person_terminal_company_dependency` (table **760**) `master_company_id` is now
`nullable=True, required=False`. In practice it stores `0`, not `null` — all guards use
`Number(x || 0) > 0`, so `0` and `null` behave identically.

## STILL BROKEN — the two remaining fixes

Janet run 3 settled with `full_enrich=True` but `{success: 5, running: 1, error: 1}` and
**7 real crashes**:

### A. Fourth company-less gap (the actual blocker)

```
4x  mvp/enrich/sweep-person-non-bio-terminal-retries
    "Cannot project founded date for a missing company"
```

A company founded-date projection assumes a company exists. This errored receipt `id=1`
(`orchestrator/terminal_materialization`) and left `id=7`
(`orchestrator/terminal_preflight_generation`) stuck `running` at `att=1/1` — the stranded
shape of the original deadlock, but caused here by the founded-date crash killing the frame
mid-generation, **not** by the preflight bug already fixed in `13194`.

Start at `dates/ensure-company-founded-date` (called from `13194` ~line 659) and the sweeper's
projection path. Apply the same narrow treatment: skip the projection when there is no company,
rather than throwing.

### B. Three benign unique-index races counted as real crashes

```
2x  mvp/imdb/add-award-records-from-imdb-person   "Duplicate record detected"
1x  mvp/imdb/add-award-records-from-title         "Duplicate record detected"
```

Same benign check-then-insert race already classified in `10509` and `12881`: a concurrent
caller wins between lookup and insert, and the row existing **is** the desired outcome. These
two functions never got that treatment. Copy the SECTION6 pattern — catch, test
`indexOf('Duplicate record detected') !== -1`, and log **without** `error_message` when benign.

## Janet's progress across three runs

| | Run 1 | Run 2 | Run 3 |
|---|---|---|---|
| Died at | award readback | bio gate, 21s | completed |
| `full_enrich` | False | False | **True** |
| Orchestrator receipts | 0 | 1 pending | 7 (5 success) |
| IMDb linked | yes | no | **yes** |
| Real crashes | 2 | 1 | 7 |

Run 3's higher crash count is not a regression — earlier runs died before reaching the code
that now runs.

## How to run the gated chain

Scripts live in `~/work/qa-scripts/` (copied out of the session scratchpad, which is
ephemeral). `.tok` is a Xano metadata API bearer token; refresh if 401.

```bash
cd ~/work/qa-scripts && ./finish_all.sh
```

Runs Janet → **gate** → Ryan → **gate** → Chamillionaire, sequentially (one sandbox, each needs
its own certified wipe, ~20-30 min each). Mark's instruction: *"Do not proceed to next test
unless first test is 100% pass!!"* — the chain is fail-closed via `set -e` plus an explicit
`|| exit 1` on each gate.

`qa_snapshot.py` exits non-zero unless **all four** hold: `full_enrich is True`;
health `passed=True`; **zero** real crashes; every receipt in `success`/`superseded`.
`superseded` is allowed only because that is the legitimate state of the v3.76 reservation
placeholder once the real materialization supersedes it. `vacuous` health checks do **not**
fail the gate — they mean the run had no rows to assert on (Chamillionaire and possibly Janet
have too few IMDb awards to exercise equalization); treating them as failures would make those
subjects unpassable for a non-defect.

To run one subject: `python3 run_subject.py "Ryan Reynolds" "https://www.linkedin.com/in/vancityreynolds/"`

Seeds (API `8861`, `POST /api:ewwK9hZc/tmp-person-waterfall-smoke`):

| Subject | `linkedin_url` value |
|---|---|
| Janet Jackson | `https://www.imdb.com/name/nm0001390/` |
| Ryan Reynolds | `https://www.linkedin.com/in/vancityreynolds/` |
| Chamillionaire | `https://www.linkedin.com/in/chamillionaire/` |

`8861`'s `linkedin_url` input is a **misnomer** — internally it does `links: [$input.linkedin_url]`,
so any single URL works, including an IMDb one. That is how Janet is seeded.

## Operational constraints — do not violate

- **Task `194` (`process-queue-musicbrainz-sandbox`) must stay ENABLED.** It is the wipe
  *certifier*, not just the MB drainer. With it off, every wipe hangs at `verifying` forever and
  no manual call can rescue it — endpoint `8918` runs the check but writes no `log_crash` row, so
  the `13286` cycle counter never passes 1. Task `193` must also stay enabled.
- **Sandbox only.** Never run `xano function run` or MCP `runWorkspaceFunction` for anything
  data-touching — neither accepts a data-source parameter and both default to **live**.
- **Any whole-table schema save strips column validators**, including through the Xano UI. The
  `760` change lost `status`'s `{trim, lower}` and there is no API route to restore them.
  Snapshot `GET /table/{id}/schema` and diff before/after any column change.
- Publish functions with `xano function edit <id> -p orbiter -w 3 -f <file> --publish`, then
  byte-verify against the live script. Check `draft_updated_at` is null before editing so an
  unpublished draft is not clobbered.
- The serializer normalizes expressions (drops redundant parens) and **strips `== true`
  comparisons** — gate on `== false` or a bare boolean.

## After the two fixes

1. Re-run the gated chain. Janet must pass before Ryan runs.
2. **Ryan is the regression check that matters most** — four of the five landed fixes touch code
   every person runs through. His baseline is 9/9 with 55 equalization pairs, 0 vacuous, 5/5 Core
   + 5/5 Deep Bio receipts, ~19-20 min.
3. Chamillionaire re-proves the `13194` deadlock fix through a company retarget. Watch `13260`
   v1.29 there specifically: the new `selectedCompanyId === dependencyCompanyId` equality is
   evaluated against the dependency's stored company, and he is the subject that retargets
   (company 1 → 4). If he fails terminal verification, look there first.

## Deferred

- **Reorder option** for the bio gate: move the pre-expertise reconciliation block in `13040`
  to after the cross-waterfall music/IMDb phase so biography enforcement runs against the real
  bio. Mark chose *tolerate* first. Lower value than it appeared — the bio **is** generated later
  regardless (run 1's finalize payload carried a valid 163-char bio), and `13194` independently
  validates it at terminal time. Blast radius is every person's phase sequence; verify whether
  expertise extraction runs before or after the cross-waterfall phase before attempting it.
