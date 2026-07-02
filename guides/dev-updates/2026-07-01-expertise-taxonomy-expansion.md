# Expertise Taxonomy Expansion + Orphan Audit (SANDBOX)

**Date:** 2026-07-01 · **Workspace:** ws3, `sandbox` data source only · **Tables:** `expertise_category` (460), `domain_expertise` (459), `sub_domain_expertise` (654)

Follow-on to the music taxonomy build (see `2026-07-01-music-expertise-taxonomy-plan.md`). Everything below is sandbox content; on live-promote, **match by name, not id** (sandbox/live ids have diverged — e.g. sandbox 123 = Biotechnology & Genomics, live 123 = Acting & Performance).

## New categories (460)

| ID | Category |
|----|----------|
| 18 | Science & Academia |
| 19 | Public Sector & Social Impact |
| 20 | Sports & Wellness |

## New domains (459)

| ID | Domain | Cat | Why |
|----|--------|-----|-----|
| 123 | Biotechnology & Genomics | 13 | biotech vertical (pharma/devices covered medical side only) |
| 124 | Scientific & Academic Research | 18 | large orphan cluster (physics, chemistry, geology, humanities…) |
| 125 | Education & Teaching | 18 | orphan cluster (education ×8, teaching, higher ed) |
| 126 | Government & Public Policy | 19 | orphan cluster (policy, intl relations, campaigns, military) |
| 127 | Nonprofit & Philanthropy | 19 | orphan cluster (nonprofit mgmt, philanthropy, CSR) |
| 128 | Sports & Fitness | 20 | performance/coaching/fitness side (description scoped to defer business to 129) |
| 129 | Sports Business & Athlete Representation | 20 | celebrity/entertainment business directive |
| 130 | Entertainment Merchandising & Licensing | 16 | same |
| 131 | Celebrity Brands & Ventures | 16 | same |

## New curated sub-domains (654) — 66 rows, all with 3-sentence house-style descriptions

- **Crypto/Web3 (9):** 8 rows, ids 3079–3086 (protocol eng, smart contracts, DeFi, tokenomics, trading/MM, security & auditing, ZK crypto, DAO governance)
- **Fintech (22):** +5 rows, ids 3087–3091 (embedded finance/BaaS, InsurTech, WealthTech, fraud & fincrime tech, capital-markets tech) — complements 3 pre-existing curated children
- **Biotech (123):** 7 rows, ids 3092–3098 (genomics, synbio, cell & gene therapy, bioinformatics, biomanufacturing, molecular dx, ag/industrial bio)
- **Robotics (16):** 8 rows, ids 3099–3106 (perception, motion/control, robot learning, mechatronics/hardware, AVs, industrial automation, drones, surgical)
- **Real Estate (71–75):** 12 rows, ids 3107–3118 (residential brokerage, mortgage origination; land/entitlements, construction PM, urban planning; facilities ops, tenant relations; acquisitions/underwriting, funds & REITs, RE debt; RE data, smart buildings) — 70 already had 3 children
- **Media/tech-adjacent (84/85/27):** 9 rows, ids 3119–3127 (programmatic/RTB, measurement & attribution, privacy & identity; CMS/publishing systems, creator economy platforms, media rights & metadata; streaming infra, live streaming, recommendations)
- **Celebrity/sports business (129/130/131/64):** 17 rows, ids 3128–3144 (athlete rep & NIL, sponsorship, team/league ops, sports media rights, sports merch retail, sports marketing & fan engagement; character/IP licensing, celebrity merch, retail partnerships, tour merch; celebrity-founded brands, endorsement & equity, celebrity media ventures, legacy/estate mgmt; brand identity & positioning, personal & celebrity branding, brand architecture & rebranding)

Plus the 42 music sub-domains (3037–3078) from the music plan doc. **Total curated seed this session: 108 sub-domains + 9 domains + 3 categories.**

## Orphan audit (654, domain_expertise_id = 0)

- Start state: 2,895 orphans (2,668 unique names). Duplicates = importance proxy (resolver re-creates hot concepts): python ×31, law ×30, java ×11, communications ×9, education ×8, medicine ×7.
- **483 orphans linked** to domains via conservative word-boundary keyword rules (16.7%), incl. 72 → Scientific & Academic Research, 70 → Legal, 52 → Software Engineering, 30 → Gov & Policy. One manual correction: law enforcement → 126, not Legal.
- **3 corrupted rows deleted** (2579/2580/2581 — HTTP error strings in node_uuid from a deno outage; unreferenced in person_has_expertise). The create-path guard (music plan Phase 3c) prevents recurrence.
- **~2,409 orphans remain** — long-tail one-offs (go-to-market, sales ops, niche skills). These are LLM-drainer work (#8718 pattern with resolver #13141), NOT keyword work. Prereq: the 9 new domains must exist as graph DomainExpertise nodes first (resolver reads the roster from the graph).

## Is expertise_category (460) needed?

**Not read at runtime, but its content is in the resolver prompt.** The person-enrichment expertise path never queries 460. However, DomainExpertise **graph nodes** carry a `category` string property (verified: 135/135 sandbox, 137/137 live) denormalized from 460's text at graph-seeding time, and resolver #13141 renders `name [category]` for every domain in its LLM-pick prompt. So 460 = seed-time curation source + relational grouping FK; changing/removing it only matters at the next graph seed. Cleanup opportunity: legacy category strings are noisy lowercase ("engineering and software development categories") — worth normalizing (drop the "categories" suffix) before the next graph seeding since they are prompt tokens.

## Drift warning found

Graph and relational domain rosters have drifted: sandbox graph has **135** DomainExpertise nodes vs **128** relational rows (now 131 after this session); live graph 137 vs 119 relational. Phase 4 graph seeding must reconcile by name (create missing, flag graph-only strays).

## Pre-re-seed cleanup (executed 2026-07-01, late session)

- **`created_at` columns added** to `domain_expertise` (459) and `sub_domain_expertise` (654) — schema-global, default now, legacy rows null.
- **Resolver #12926 → v2.4** (LIVE function, create-branch hardening): (a) exact-name guard — an existing SubDomain/Domain node with the same lowercased name is matched instead of re-created, killing the python×31 duplicate mode even when the vector index is stale or the vector search throws; (b) graph CREATE verified before the relational row / edges / upserts (no more rows pointing at nonexistent nodes); (c) `created_at` stamped on the relational insert; (d) **relational FK dual-write** — after attach-subdomain-parent (#13142) resolves a parent, `domain_expertise_id` is set via a NAME lookup on domain_expertise (name, not node_uuid — sandbox uuids are placeholders). This closes the original unparented-FK gap at the source.
- **247 sandbox rows deleted** from 654: 226 exact-name duplicates (kept lowest id per group), 6 collisions with curated names (A&R, radio promotion, zero-knowledge cryptography, digital music distribution, mixing engineering, record label management), 12 resolver rows fully absorbed by curated rows (music publicity, music marketing, personal branding, brand identity, programmatic advertising, video streaming, video infrastructure, construction management, gene therapy, creator economy, industrial logistics, live performance), 3 deno-error rows.
- **4 short-name rows linked**: C#→1, Go→1, F#→1, AI→7.
- **Corrupted domain descriptions fixed** (459): Brand Strategy 64, Technical Writing 65, Journalism 66, Podcasting 67 all carried copy-pasted Software Engineering descriptions (embedding/prompt poison) — rewritten in house style. Also fixed "Jewlery Design"→"Jewelry Design" (37) and trailing space on 35. NOTE: live 459 has the same four corrupted descriptions — fix at promote time.
- **Category names normalized** (460): legacy lowercase "…categories" strings → clean Title Case (they are rendered into #13141's prompt as `name [category]`).
- **Similarity scan**: 0 near-dup pairs among the 108 curated sub-domains (or vs pre-existing curated children). Resolver-vs-resolver near-pairs (~250) are almost all specialization hierarchies (venture capital → venture capital law) — correctly left for the 0.15–0.25 LLM-adjudication band at drain time.
- Final sandbox state: **2,346 orphans remain** (from 2,895) for the LLM drainer.

## Re-seed + drain — COMPLETE (2026-07-02)

**Seeder:** `mvp/expertise/seed-expertise-graph-batch` (#13161 v1.1) + `tool/seed-expertise-graph` (#8792). Seeded 127 domains + 2,897 sub-domains (both vectors each, ~6,000 embedding calls, **0 failures**); orphans seeded without edges/flags to queue them for draining. v1.1 fixed a XanoScript trap: var-only OR expressions inside `db.query where` mis-evaluate — use always-applied comparisons with sentinel defaults.

**Drainer:** `mvp/expertise/drain-orphan-subdomains-batch` (#13162) + `tool/drain-orphan-subdomains` (#8794). Graph-as-queue, uuid-hex-prefix parallel partitioning. Drained all 2,346 orphans, **0 failures**: **1,538 attached (66%)** — HAS_SUBDOMAIN edge + relational FK dual-written for every one — and **808 NONE-flagged (34%)** into the `parent_unresolved` review queue (FK stays 0).

**Final state — 100% resolved, exact parity graph↔relational:**
- 2,897 sub-domain nodes = 2,089 parented (edges == FK>0 rows, exact) + 808 flagged (== FK=0 rows, exact)
- Top domains by children: Software Engineering 142 · VC & PE 103 · Corporate Finance 80 · **Government & Public Policy 70 (new)** · Hard Tech 65 · Capital Markets 61 · ML & AI 60 · Clinical Medicine 58 — the new domains absorbed real load (Gov 70, Sci & Academic Research 52, Education & Teaching 51).

**Orphan-proofing (both live create paths):** person resolver #12926 v2.4 and company resolver #12746 v1.8 carry identical hardening — exact-name guard, create-verify, created_at stamp, relational FK dual-write. Parent-picker #13141 v1.3 now retries the LLM 3× with backoff and **throws** on exhaustion instead of returning NONE (a failed LLM can no longer mislabel orphans as reviewed-NONEs — they stay in the drain queue). Residual leak = transient attach failure only; self-healing by re-running the drainer (cron candidate).

**Review queue:** the 808 NONE rows (`parent_unresolved = true` / FK 0) are mostly generic business/ops/leadership skills per v1.2 policy, plus deliberate not-covered industries. Options: review for new-domain candidates (a second pass like the media/crypto/bio expansion), or accept as permanently domainless.

## NONE-queue review + second expansion + re-drain — COMPLETE (2026-07-02)

Reviewed 100% of the 808 NONE-flagged rows. Outcome: 8 Tier-1 domains minted from coherent clusters, Acting & Performance recreated (live-name-exact, fixing sandbox roster drift), ~70 rows identified as misfiles caused by stale prompt policy.

**New categories:** 21 Business Functions · 22 Industries & Commerce.
**New domains (132–140):** Sales & Business Development · People & Talent · Operations & Supply Chain · Management Consulting & Corporate Strategy (cat 21); Insurance · Retail, E-commerce & Consumer Goods · Hospitality, Food & Beverage · Transportation & Mobility (cat 22); Acting & Performance (cat 15, live's exact name+description). All graph-seeded with dual vectors, 9/9.

**#13141 v1.4:** prompt refreshed for the 136-domain roster — stale NONE examples retired (humanities→Scientific & Academic Research, advocacy→Nonprofit, education→Education & Teaching, retail/hospitality→new industry domains), routing hints added for all new domains + accounting→Corporate Finance, new scope rule keeps bare executive titles out of Consulting & Corporate Strategy. NONE list narrowed to: agriculture, construction trades, oil & gas/heavy industry, defense/public safety, beauty/personal care, soft skills, employer names.

**Re-drain of all 808** (flags cleared, re-classified against the new roster): **601 attached (74%)** — every one with edge + relational FK — and **207 re-NONE'd (26%)**, 0 failures. Where they landed: Consulting & Corporate Strategy 112 · Ops & Supply Chain 81 · Retail 61 · Sales & BD 57 · People & Talent 56 · Hospitality 34 · Transportation 33 · Insurance 25 · Acting 5; and the misfile fixes: Scientific & Academic Research 52→99, Education & Teaching 51→63, Nonprofit 63.

**End state (sandbox, exact graph↔relational parity):** 136 domains / 22 categories / 2,897 sub-domains — **2,690 parented (92.9%)**, 207 in the review queue (soft skills, employer names, Tier-2 industries deliberately not minted: energy/industrials, defense/public safety, construction trades, beauty/wellness, healthcare administration, customer success).

## Next steps

1. Graph-seed the 9 new domains + 108 curated sub-domains (nodes + SUBDOMAIN_OF + Gemini dual-embed #13125 pattern), reconciling roster drift by name.
2. Resolver #13141 v1.3: music scope rules + relax the NONE list (academia/gov/nonprofit/sports now have homes) + relational-FK dual-write + node_uuid guard.
3. LLM-drain the remaining ~2,409 sandbox orphans with the expanded roster.
4. Promote taxonomy to live by name once sandbox validates.
