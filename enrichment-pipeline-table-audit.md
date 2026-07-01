# Enrichment Pipeline — Table & Function-Stack Audit

> Workspace 3 (OrbiterV2). Derived by tracing the **actual XanoScript function stacks** —
> following every `function.run` edge and recording every `db.<op> <table>`, `$db.<table>`
> (where-clause) and `addon name:"<table>"` reference, validated against the live 386-table
> registry. Cross-checked by a 5-lens adversarial verification pass.

## Summary

| Pipeline | Entry orchestrator(s) | Functions traced | Tables |
|---|---|---|---|
| **Person enrich** | `master-person-new` #13039 | 167 | **84** |
| **Company enrich** | `master-company-new` #12558 | 133 | **72** |
| **IMDB waterfall** | `run-base-imdb-person/title-enrich` #12880/#12881 | 128 | **6 unique** (75 incl. shared) |
| **Music (MusicBrainz)** | `mb/run-base-*-enrich` + `mb/queue/process-next` | 58 | **16 unique** (19 incl. shared) |

### Key structural finding
The enrichment system is **one strongly-connected graph**, not four separate pipelines.
`master-person-new` and `master-company-new` mutually invoke each other (enriching a person
enriches their employer company and vice-versa), and the IMDB / Music orchestrators feed their
nodes straight into that core. A naive transitive-closure trace therefore collapses Person and
Company into the **identical** 215-function / 110-table set and folds the IMDB tables in with them.

To produce meaningful per-pipeline lists, each trace is **boundary-cut**: when tracing pipeline X,
a call into another pipeline's entry point (or namespace) is recorded but **not expanded**.
- Person/Company share **70** "utility" tables (links, emails, phones, nodes, logs, fundable, …).
- **14** tables are Person-exclusive, **2** are Company-exclusive (listed below).

---

## 1. Person Enrich Pipeline

**Entry points (function stacks all rooted here):**
- `mvp/get-add/master-person-new` **#13039** — main orchestrator (cascade → match → create)
- `mvp/resolve/match-master-person` **#13038**
- `mvp/enrich/enrich-master-person` **#13040** — 12-phase enrichment (`process-person-phase-0..11`)
- `mvp/get-add/master-person-from-exa` **#12997** — Exa-sourced alternate entry
- *Also live, same table set:* `mvp/queue/process-enrichment-queue` **#12816** (queue processor),
  `mvp/enrich/process-full-enrich` **#13049** (FullEnrich webhook handler)

**Stack shape (depth-2):** `master-person-new` → `enrich-master-person` (12 phases) +
`cascade-person-data` + `match-master-person` + utility fan-out (`create-master-link`,
`add-person-email`, `add-person-phone`, `add-person-node`, `replace-avatar`, `add-person-biography`,
`link-fundable-person`, `name-format`). Full tree in `scratchpad/trees/person.txt`.

### Tables (84)
`user`(125) · `skills`(130) · `master_person`(139) · `master_company`(142) · `work_experience`(147) · `master_phone`(151) · `master_email`(155) · `enrich_history_person`(160) · `master_address`(164) · `link_type`(165) · `master_link`(166) · `country`(173) · `marketing_prefix`(174) · `email_provider`(175) · `languages`(178) · `role`(179) · `interest`(180) · `industry`(192) · `master_avatar`(227) · `master_banner`(228) · `education_experience`(230) · `employment`(263) · `environment_variables`(272) · `certification`(283) · `company_financial`(287) · `school`(300) · `crunchbase_permalink`(302) · `award`(305) · `industry_join`(307) · `skills_join`(325) · `language_join`(326) · `interest_join`(327) · `role_join`(329) · `region`(331) · `city`(332) · `about_person`(365) · `about_company`(366) · `twitter_person`(368) · `instagram`(369) · `primary_location`(385) · `enrich_history_company`(404) · `twitter_company`(429) · `permalink_company`(431) · `specialty`(455) · `speciality_join`(456) · `error_log_table`(457) · `domain_expertise`(459) · `permalink_person`(465) · `add_master_person`(468) · `expertise_join`(469) · `investor_profile_person`(475) · `investor_profile_company`(478) · `company_enrich_data`(485) · `linkedin_follower`(495) · `twitter_join`(497) · `permalink_queue`(498) · `linkedin_profile_company`(499) · `person_enrich_data`(500) · `environmental_variables_falkordb`(508) · `personal_website`(513) · `log_crash`(542) · `honor`(573) · `publication`(574) · `project`(575) · `volunteering`(577) · `log_enrichment_person`(579) · `queue_enrich_person`(582) · `queue_enrich_company`(583) · `deep_biography`(591) · `vector_logs`(604) · `kill_switch_blocked_people`(611) · `log_enrichment_company`(632) · `sub_domain_expertise`(654) · `expertise_identification_log`(660) · `youtube_subscribers`(661) · `fundable_organizations`(666) · `fundable_people`(667) · `fundable_deals`(671) · `fundable_institutional_investments`(678) · `fundable_angel_investments`(679) · `fundable_institutional_investments_person`(681) · `investment_thesis`(709) · `person_has_expertise`(711) · `runtime_metadata`(733)

**Person-exclusive (14):** `award`(305), `deep_biography`(591), `domain_expertise`(459), `education_experience`(230), `email_provider`(175), `expertise_identification_log`(660), `expertise_join`(469), `honor`(573), `kill_switch_blocked_people`(611), `log_enrichment_person`(579), `marketing_prefix`(174), `person_has_expertise`(711), `runtime_metadata`(733), `volunteering`(577)

> **Adjacent email-ingest entry — `mvp/enrich-person/add-email-master-person` #409** routes into the
> separate **Merge** subsystem (`merge/mp-merge` #159) and additionally touches
> `contacts`(128), `merges`(262), `possible_conflicts`(271). These belong to the Merge pipeline,
> not enrich — listed here only so the boundary is explicit.

---

## 2. Company Enrich Pipeline

**Entry points:**
- `mvp/get-add/master-company-new` **#12558** — main orchestrator
- `mvp/enrich/enrich-master-company` **#12992** — phased company enrichment + C-suite expansion
- *Also live, same table set:* `mvp/queue/process-enrichment-queue` **#12816**

**Stack shape (depth-2):** `master-company-new` → `enrich-master-company` →
(`apply-company-llm-payload`, `add-company-about/address/phones/links/industry`, `add-company-locations`,
`new-company-enrichment`, `get-exa-company-c-suite`, `build-investment-thesis`, `update-company-node`).
C-suite expansion bridges to person utilities (boundary-cut at `enrich-master-person` #13040 /
`master-person-from-exa` #12997). Full tree in `scratchpad/trees/company.txt`.

### Tables (72)
`user`(125) · `skills`(130) · `master_person`(139) · `master_company`(142) · `work_experience`(147) · `master_phone`(151) · `master_email`(155) · `enrich_history_person`(160) · `master_address`(164) · `link_type`(165) · `master_link`(166) · `country`(173) · `languages`(178) · `role`(179) · `interest`(180) · `industry`(192) · `master_avatar`(227) · `master_banner`(228) · `employment`(263) · `environment_variables`(272) · `certification`(283) · `company_financial`(287) · `school`(300) · `crunchbase_permalink`(302) · `industry_join`(307) · `skills_join`(325) · `language_join`(326) · `interest_join`(327) · `role_join`(329) · `region`(331) · `city`(332) · `about_person`(365) · `about_company`(366) · `twitter_person`(368) · `instagram`(369) · `primary_location`(385) · `enrich_history_company`(404) · `twitter_company`(429) · `permalink_company`(431) · `specialty`(455) · `speciality_join`(456) · `error_log_table`(457) · `permalink_person`(465) · `add_master_person`(468) · `investor_profile_person`(475) · `investor_profile_company`(478) · `company_enrich_data`(485) · `linkedin_follower`(495) · `twitter_join`(497) · `permalink_queue`(498) · `linkedin_profile_company`(499) · `person_enrich_data`(500) · `environmental_variables_falkordb`(508) · `personal_website`(513) · `log_crash`(542) · `publication`(574) · `project`(575) · `queue_enrich_person`(582) · `queue_enrich_company`(583) · `vector_logs`(604) · `log_enrichment_company`(632) · `sub_domain_expertise`(654) · `youtube_subscribers`(661) · `fundable_organizations`(666) · `fundable_people`(667) · `fundable_deals`(671) · `fundable_organization_associations`(673) · `fundable_institutional_investments`(678) · `fundable_angel_investments`(679) · `fundable_institutional_investments_person`(681) · `profile_enrichment_job`(686) · `investment_thesis`(709)

**Company-exclusive (2):** `fundable_organization_associations`(673), `profile_enrichment_job`(686)

---

## 3. IMDB Waterfall — tables UNIQUE to IMDB

**Entry points:** `run-base-imdb-person-enrich` **#12880**, `run-base-imdb-title-enrich` **#12881**,
`add-imdb-to-master-person` **#10509**, queue upserts `upsert-imdb-person/title` **#12871/#12872**,
get-add `imdb-person/imdb-title` **#12873/#12874**, cascades **#12875–#12879/#12887**,
credit/award edges **#13013/#13015/#2334**. (23-function namespace, 128-function closure.)
Stacks: `scratchpad/trees/imdb_person.txt`, `imdb_title.txt`.

### Unique tables (6) — present in IMDB stack, absent from Person/Company
| id | table |
|---|---|
| 394 | `imdb_person` |
| 395 | `film_tv` *(titles)* |
| 396 | `film_tv_award` *(awards)* |
| 406 | `birthday_join` |
| 706 | `queue_imdb_person` |
| 707 | `queue_imdb_title` |

> **Credits & award *edges* are NOT SQL tables** — `add-credit-edges-from-person/title` (#13013/#13015)
> write them straight to **FalkorDB** via `mvp/falkor/send-cypher` (#2815).
> Registry tables `imdb_credit_join`(397), `imdb_award_join`(407), `imdb_demo_samples`(645),
> `person_imdb_scrape`(269) exist but are **touched by no pipeline function** (legacy/unused).
> IMDB writes `master_person` rows directly (`db.add` in #12880), bypassing the person entry points.

---

## 4. Music (MusicBrainz) Waterfall — tables UNIQUE to Music

**Entry points:** `mb/run-base-{artist,recording,release-group,work,label,event}-enrich`
(#13094/#13100/#13099/#13101/#13091/#13105), queue `mb/queue/process-next` **#13102** +
`upsert-{artist,recording,label,event,release-group,work}` (#13081–#13086), get-add
`mb/get-add/*` (#13087/#13088/#13089/#13093/#13098/#13106), person-resolution
`mb/run-person-resolution` **#13121**, plus `mvp/music/*` image/description/finalize helpers.
Stacks: `scratchpad/trees/music_artist.txt`, `music_queue.txt`.

### Unique tables (16) — present in Music stack, absent from Person/Company
Entity tables (9): `mb_artist`(737) · `mb_recording`(738) · `mb_label`(739) · `mb_event`(740) · `mb_release_group`(741) · `mb_work`(742) · `mb_place`(743) · `mb_release`(744) · `mb_rate_limit`(736)
Queue tables (7): `queue_mb_artist`(745) · `queue_mb_recording`(746) · `queue_mb_label`(747) · `queue_mb_event`(748) · `queue_mb_release_group`(749) · `queue_mb_work`(750) · `queue_person_resolution`(751)

> Music node descriptions/edges are written to **FalkorDB** (`mb/node/*`, `mb/edge/*`), not SQL.
> All `api.request` calls in this waterfall hit external services (MusicBrainz, Cover Art Archive,
> OpenRouter, Exa, Serper) — no hidden internal table writes.
> **Operational bug found:** `tool/clear-music-records` (#13124) truncates 14 of the 16 music tables
> but **omits `queue_person_resolution`** — a music reset leaves stale person-resolution rows.

---

## Method & confidence notes

1. **Trace** — BFS over `function.run` edges from each pipeline's entry seeds; cached XanoScript
   for 300+ functions; **0 unresolved** sub-function references.
2. **Table extraction** — three patterns, all validated against the 386-table registry:
   `db.<op> <table>`, `$db.<table>.<field>` (where-clauses), and `addon name:"<table>"` (join blocks).
   The addon pass was the source of late corrections (`award`→Person/IMDB; `skills`,`languages`,
   `certification`→Company).
3. **Boundary-cutting** — cross-pipeline calls recorded but not expanded, so Person≠Company and the
   IMDB/Music "unique" sets exclude the shared core.
4. **Adversarial verification** — 5 independent lenses (entry-completeness, IMDB audit, Music audit,
   extraction-gaps, person/company split) + a synthesizer reconciled all findings.
5. **Known residual gap** — the method reads XanoScript only; if any of the 108 `api.request` calls
   targets an internal Xano endpoint that writes a table reached no other way, it would be invisible.
   Verification found the two internal callbacks (`enrich-profile`, `deep-research-bio-webhook`) touch
   only already-captured tables (`profile_enrichment_job`, `deep_biography`).
