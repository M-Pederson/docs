# Music Expertise Taxonomy — Build Plan

**Date:** 2026-07-01 · **Workspace:** Xano ws3 · **Status:** Phase 1 SEEDED in SANDBOX 2026-07-01 (42 rows, ids 3037–3078, all verified with FK set); Phases 2–5 not started · **Out of scope:** backfill of existing orphan rows / existing people

> Sandbox note: sandbox is wiped and repopulated periodically, so the seed lives free-reign there for iteration; the curated list + descriptions in this doc (and in the sandbox rows) are the source to re-seed from and to promote to live later. Open decisions below were resolved: Booking & Concert Promotion → 55; music supervisors → 98 film-side, 55 keeps music-side sync licensing. "Sound Design (music context)" was named **Sound Design & Synthesis**.

## Problem

- The six curated music domains (`domain_expertise` 52–57, category 8) have **zero curated sub-domains** in `sub_domain_expertise` (table 654). Every music person the resolver meets gets a freshly invented, unparented sub-domain.
- The unparented-FK problem is **not sandbox-only**: live has 2,524 of 2,694 sub-domain rows with `domain_expertise_id = 0` (sandbox: 2,895). The 2026-06-19 taxonomy-completion work (resolver #13141 + drainer #8718) fixed the **graph** SUBDOMAIN_OF edges but never dual-writes the relational FK — so "person has music expertise → route to music waterfall" cannot be answered from the relational table anywhere today.
- Resolver #13141 (`mvp/expertise/resolve-parent-domain`) reads the domain list **from the graph**, and the person-expertise resolver vector-matches against **graph** SubDomainExpertise nodes. New taxonomy rows only influence matching once seeded into FalkorDB — graph seeding is the activation step.
- Data-quality finds along the way: sandbox sub-domain row 2581 has a literal HTTP error string (`"Network error: Failed to connect to deno port 3004…"`) stored in `node_uuid` (no guard on the create path), and duplicate-name orphans exist (e.g. two "artificial intelligence" rows).

## Current top-level music domains

| ID | Domain | Category |
|----|--------|----------|
| 52 | Music Production & Recording | 8 (Music) |
| 53 | Music Composition & Songwriting | 8 |
| 54 | Music Performance | 8 |
| 55 | Music Business & Rights | 8 |
| 56 | Music Technology | 8 |
| 57 | Music Distribution & Marketing | 8 |
| 98 | Music & Scoring | 15 (Film & Television Production) — adjacent |

## Phase 1 — Curate ~40 music sub-domains (relational seed)

Role-level granularity, deliberately **not** instrument-level (no "guitarist"/"drummer" rows — they'd become vector magnets; instruments are enumerated inside the Instrumental Performance description).

| Parent domain | Proposed sub-domains |
|---|---|
| **52 Production & Recording** | Record Production · Recording Engineering · Mixing Engineering · Mastering Engineering · Vocal Production · Beatmaking & Music Programming · Remixing · Sound Design (music context) |
| **53 Composition & Songwriting** | Songwriting · Composition · Lyric Writing · Music Arrangement · Orchestration · Media Scoring & Sync Composition |
| **54 Performance** | Vocal Performance · Instrumental Performance · Session Musicianship · DJing & Turntablism · Conducting & Musical Direction · Touring & Live Performance · Live Sound Engineering |
| **55 Business & Rights** | Artist Management · A&R · Record Label Management · Music Publishing · Music Supervision & Sync Licensing · Royalties & Rights Administration · Music Law & Legal Affairs · Booking & Concert Promotion · Music Catalog Investment & Finance |
| **56 Technology** | Audio Software Development · Audio DSP & Signal Processing · Music AI & Generative Music · Instrument & Audio Hardware Design · Streaming Platform Engineering · Music Metadata & Data Systems |
| **57 Distribution & Marketing** | Digital Music Distribution · Music Marketing & Promotion · Playlist & Streaming Promotion · Radio Promotion · Music PR & Publicity · Fan & Audience Development |

Mechanics:

- Insert into table 654 with `domain_expertise_id` set at insert; house-style 2–3 sentence practitioner description (match the Real Estate / Finance curated batch); `node_uuid` empty until Phase 4.
- **Adopt, don't duplicate:** name-check existing orphan rows first ("music production" almost certainly exists as an orphan). Exact matches get adopted — FK set + description rewritten to curated — instead of creating a twin row. This is taxonomy hygiene, not people-backfill.

## Phase 2 — Deterministic MusicBrainz role → sub-domain map

New small table `mb_role_expertise_map`: MB relationship type (+ optional attribute) → `sub_domain_expertise_id`, plus depth/weight hints.

MusicBrainz supplies a finite role vocabulary to map from:

- **Recording rels (production side):** producer, recording engineer, mix engineer, mastering, balance engineer, remixer, programming, editor, field recordist
- **Work rels (writing side):** composer, lyricist, librettist, writer, arranger, instrument/vocal arranger, orchestrator
- **Recording rels (performance side):** performer, instrument, vocal, conductor, chorus master, performing orchestra, mix-DJ
- **Business/misc rels:** A&R, booking, publisher, legal representation, phonographic copyright, art direction, photography

Effect: people arriving via the Music_Artist → master_person SAME_AS bridge get expertise emitted **from their MB credits with no LLM at all** — with a minimum-credit threshold (e.g. ≥3 recordings in a role) so one-off credits don't mint expertise. The LLM resolver path remains as fallback for bio-text signals only.

## Phase 3 — Resolver #13141 v1.3 + write-path fixes

1. **Music scope rules in the prompt** (targeted vetoes, v1.2 style):
   - Music recording/mixing/mastering engineering → 52, never Film/TV "Sound Department" (93)
   - Music-artist management → 55, not "Talent Management" (103)
   - Music software / audio DSP / music AI → 56, not "Software Engineering" (1)
   - Score composers → 53 "Media Scoring & Sync Composition"; 98 reserved for film-side roles (music supervisors, music editors)
   - Music marketing / playlist promotion → 57, not "Digital Marketing" (62)
2. **Dual-write the relational FK** whenever a parent is assigned — in the person-expertise resolver CREATE branch (#12926/#12746 forward-fix) and in drainer #8718. Fixes the 94%-unparented table going forward.
3. **Guard the create path** so HTTP error strings can never land in `node_uuid` (validate UUID shape before write; skip + log otherwise).

## Phase 4 — Graph activation (later, per direction)

Seed SubDomainExpertise nodes + SUBDOMAIN_OF edges + Gemini dual-embeddings (helper #13125 pattern); backfill `node_uuid` on the relational rows. This is when vector-match starts hitting curated music nodes and `match_type` flips from `created` to `matched` — orphan creation for music people effectively stops at the source.

## Phase 5 — Sandbox validation

Judge-panel harness (group-42 style, as used for the 2026-06-19 taxonomy run): sample bridged music people (Steve Aoki, Cinq/Beluga producers and engineers already in the live graph), run the MB map + resolver dry-runs, measure precision and NONE-rate before anything touches live.

## Open decisions

1. **Booking & Concert Promotion** — under 55 as planned, or closer to Event Production (61)? *(Lean: 55.)*
2. **Music supervisors** — stay in 98 (film-side hirers) with 55 keeping only music-side sync licensing? *(Lean: yes.)*
3. Confirm the ~40-row list above before seeding (any additions, e.g. Music Education / Music Journalism, are currently deliberate NONEs).
