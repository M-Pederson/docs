# Terminal preflight generation deadlock (RESOLVED 2026-07-26)

Found 2026-07-26 during a Chamillionaire sandbox run; reproduced 2 of 3 runs. **Fixed and
verified 2026-07-26** in `mvp/enrich/finalize-person-semantic-state` (**#13194**).

## Symptom

A person run reached `full_enrich = false` and never settled. The sweeper
`mvp/enrich/sweep-person-non-bio-terminal-retries` (#13260) logged a real crash every cycle:

```
error_message : superseded_generation
note          : terminal retry outbox dispatcher exception
data          : { run_id: person-1-company-4-dependency-1, receipt_id: 13,
                  error_class: superseded_generation, attempt_before: 0,
                  breaker_reason: retry_scheduled }
```

## Exact state at deadlock

| Receipt | Stage | Status | Attempts | Lease |
| ---: | --- | --- | ---: | --- |
| 1 | `terminal_materialization` (company **1**) | `superseded` | 0/3 | — |
| 13 | `terminal_materialization` (company **4**) | `error` | 0/3 | `next_attempt` 4 min overdue, `checkpoint: terminal_ready` |
| 14 | `terminal_preflight_generation` (company **4**) | **`running`** | **1/1** | **expired**, `checkpoint: generation_claimed` |

## Root cause — the error was raised in #13194, not #13260

The decisive miss in the original diagnosis: a search for `superseded_generation` found it
only in #13260 and concluded nothing downstream raised it. **#13194 was not searched.** It
raises the string directly, in three bounded-preflight `precondition` guards.

Those guards fetched the preflight generation receipt with a **person-wide query** on
`person_terminal_stage`, keyed on `master_person_id`, rather than on the receipt id they were
already holding. That is safe only while a person has exactly one generation row.

When the selected company is retargeted (1 → 4) a **second** generation row exists for the
same person. The person-wide query then returned a row that was not the one the caller had
claimed, so the precondition's identity / version / status / token / lease compare failed and
threw `superseded_generation`. #13260 caught it in its dispatcher error path and logged it —
which is why the audit showed `transition_applied: true` (the claim genuinely succeeded, at
#13203) while the frame still ended in the error path. Both original theories were testing
the wrong function.

`terminal_preflight_generation` is a singleton on `run_id + pipeline + stage`, so the row
stayed `running` at `attempt_count = max_attempts = 1` with an expired lease, and the
dependent `terminal_materialization` retried forever without ever materializing.

## The fix

In #13194, all three bounded-preflight guards now resolve the receipt by **exact id** instead
of by person:

```
db.get person_terminal_stage {
  field_name  = "id"
  field_value = $input.preflight_generation_receipt_id
  output = ["id","run_id","master_person_id","stage_version","status","lease_token","lease_expires_at"]
} as $boundedPreflightGenerationAtEntry

precondition (($x.id == $input.preflight_generation_receipt_id)
  && ($x.master_person_id == $input.master_person_id)
  && ($x.stage_version == $input.preflight_generation_version)
  && ($x.status == "running")
  && ($x.lease_token == $input.preflight_generation_token)
  && ($x.lease_expires_at > now)) {
  error = "superseded_generation"
}
```

Guards: `$boundedPreflightGenerationAtEntry`, `$boundedPreflightGenerationBeforeExpertise`,
`$boundedPreflightGenerationBeforePersonNode`. Verified post-deploy: **0** person-wide
generation queries remain, **3** exact-id lookups. A retarget can no longer invalidate the
preflight the caller is holding.

Nothing changed in #13260 or #13203, so the ledger contract every pipeline depends on was left
untouched.

## Verification

Clean Chamillionaire run 2026-07-26 on a certified wipe, seeded via API `8861` with
`{"full_name":"Chamillionaire","linkedin_url":"https://www.linkedin.com/in/chamillionaire/"}`
(`person_created: true`, `master_person_id: 1`).

**The run hit the retarget** — the triggering condition — and completed anyway:

```
id=1      terminal_materialization        superseded  att=0   <- pre-phase-7 reservation
id=2..5   terminal_context, current_company_dependency,
          terminal_preflight_generation, terminal_preflight_v2      success att=1
id=6..10  the same four again + terminal_materialization           success att=1
```

`terminal_preflight_generation` = `success` on **both** passes. `full_enrich = true`. Settled
in ~25 min (the retarget adds a second terminal sequence; 14.6 min is the no-retarget band).
9 `success` + 1 `superseded`, where the single superseded row is the v3.76 pre-phase-7
reservation placeholder correctly superseded by the real materialization at `id=8`.

All seven QA fixtures pass, including the four terminal-contract gates on `8881`/`8882` with
before/after baselines.

## Reproduction (retained for regression use)

Wipe the sandbox, seed Chamillionaire via API `8861`, and watch `person_terminal_stage`. The
retarget lands within ~10 minutes. Pre-fix, the deadlock was visible by ~22 minutes as
`error` + `running` sitting together and never advancing:

```
run_ids:  person-1-company-1-dependency-1     <- original selection, superseded
          person-1-company-4-dependency-1     <- retargeted selection
```

Post-fix, the same retarget produces two clean terminal sequences instead.

## Lesson

When a durable-state guard compares against a row it already holds an id for, fetch it **by
that id**. A person-wide or entity-wide query is a latent multi-generation bug that stays
invisible until something legitimately creates a second row — here, a company retarget.

And when tracing a thrown string, search **every** function in the frame, not just the one
that logs it. The logger and the raiser were different functions, and assuming otherwise cost
two disproven theories.
