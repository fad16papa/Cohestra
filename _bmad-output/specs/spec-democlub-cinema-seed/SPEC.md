---
id: SPEC-democlub-cinema-seed
companions:
  - world-contract.md
  - anchor-fixtures.md
  - derived-assertions.md
  - reverse-chain-tests.md
  - brownfield.md
  - ../../brainstorming/brainstorm-cinema-mount-density-fidelity-2026-09-04/cohestra-cinema-doctrine.md
  - ../../brainstorming/brainstorm-cinema-mount-density-fidelity-2026-09-04/brainstorm-intent.md
sources:
  - ../../brainstorming/brainstorm-cinema-mount-density-fidelity-2026-09-04/brainstorm-intent.md
  - ../../brainstorming/brainstorm-cinema-mount-density-fidelity-2026-09-04/cohestra-cinema-doctrine.md
---

> **FROZEN 2026-09-05** with Live Proof Cinema. Close-out: [`../../planning-artifacts/cinema-frozen.md`](../../planning-artifacts/cinema-frozen.md). Do not change Harbourline identity, derived numbers, or anchor arcs.

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability only — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# DemoClub cinema seed world

## Why

**Pain + vision.** Apex `/#crm` still reads as sparse demo theater because numbers and people are not one continuous operating world. The cinema doctrine locks mental move-in via progressive house tour; that illusion collapses unless the **seed is UX** and **continuity is the acceptance test**. Designing Website or AI first invents attractive claims that later cannot be reconciled. This work makes the DemoClub fixtures the single honest world every room projects — before mount polish or an intelligence surface.

## Capabilities

- **CAP-1** Continuous DemoClub world
  - **intent:** Cinema can project Website → Clients → Activities → Follow-up → Analytics → (future) Cohestra AI from one static seed without resetting the club between rooms.
  - **success:** Automated invariants prove shared org, people, activities, sources, timestamps, and statuses; seeking rooms never invents a parallel dataset.

- **CAP-2** Anchor character + event arcs
  - **intent:** Operators (and QA) can follow five authored lives and three anchor events through every relevant room as fingerprints of one story.
  - **success:** Each of Maya, Daniel, Priya, Marcus, Sarah has a complete arc fixture; Golden Hour Run, Sunday Pickleball, and Board Game Night appear consistently wherever referenced (see `anchor-fixtures.md`).

- **CAP-3** Derived number assertions
  - **intent:** Every cinema headline number is computed from fixtures, not hand-copied into UI copy.
  - **success:** Tests assert `34 going · 8 spots left`, `17 need attention`, `8 first-timers not returned`, and the referral retention statement equal derived counts from the seed (see `derived-assertions.md`).

- **CAP-4** Reverse-chain QA harness
  - **intent:** Any important AI/Analytics/Follow-up claim can be walked backward to Client + acquisition; inconsistency fails CI.
  - **success:** For each anchor, reverse-chain tests AI → Analytics → Follow-up → Activity → Client → Acquisition pass; breaking any link fails (see `reverse-chain-tests.md`). AI assertions may be stubbed until the product intelligence surface exists, but the seed must already support the chain.

- **CAP-5** Ambient operational pressure
  - **intent:** Roster and queues feel like Monday work — enough rows that sorting/filtering matter — without wallpaper or bespoke six-room arcs for every ambient person.
  - **success:** 25–40 visible client rows (plus ambient history) with purposeful statuses; ambient population is statistically coherent with Anchor events/sources; no Acme/demo-smell names.

## Constraints

- Single static JSON module remains the cinema seed source of truth (`web/lib/marketing/marketing-demo-club.json` + parser/invariants) — no fetch, no cookies, no live operator DB in cinema.
- Two-class data only: **Anchor** (100% continuous) vs **Ambient** (statistically coherent; no bespoke six-room narratives).
- Nothing important may exist in only one room; marketing claims are database assertions.
- Existing DemoClub hard rules stand unless this SPEC explicitly supersedes them: forbid Acme/yourclub org names; client emails `@example.com`; no remote `logoAssetId` / `heroImageAssetId`.
- Club brand locked: `orgName` **Harbourline Social Club**; `publicHost` like `harbourline-social.cohestra.app` (fictional SG DemoClub, not Cohestra branding).
- Deterministic cinema clock only: `timeZoneId` `Asia/Singapore`; `demoNow` `2026-09-07T09:00:00+08:00` — never the system clock.
- `needsAttention` is derived (`dueNow ∪ atRisk ∪ opportunity` = 17, mutually exclusive; Healthy excluded) — never a stored flag; UI never hardcodes 17; CI fails if predicates ≠ 17.
- Incomplete contact does not inflate `needsAttention`; it only constrains actionability (Marcus: no WhatsApp).
- Imperfection propagates: Marcus missing phone ⇒ Follow-up cannot WhatsApp ⇒ AI cannot recommend WhatsApp.
- Cohestra AI chapter remains product-gated (doctrine): seed must support future reverse-chain; this SPEC does not invent a cinema-only AI surface.
- BMAD build order for cinema: **Seed → Website → Clients/Activities/Follow-up → Analytics → committed AI surface → cinema polish.**

## Non-goals

- Website visual polish, house-tour pill reorder, or mount chrome redesign (downstream of this seed).
- Implementing the Cohestra AI product surface (gated; seed readiness only).
- Live operator routes or mutating production tenant data for marketing.
- 100% bespoke continuity arcs for every ambient client.
- Replacing backend `DemoDataSeeder` tenant seed unless a later story explicitly unifies marketing JSON and API demo seed.

## Success signal

A reviewer can pick Maya (or any Anchor), walk Website → … → Analytics (and stubbed AI facts), and every name, event, capacity, source, and count agrees — including `34 going · 8 spots left` matching exactly 34 registrations on a 42-cap Golden Hour Run — with reverse-chain tests green. The cinema can then say those numbers without lying.

## Assumptions

Resolved facts (no longer open):

- **Club identity.** `orgName` = **Harbourline Social Club** (fictional Singapore DemoClub; not Cohestra branding). `publicHost` like `harbourline-social.cohestra.app`.
- **Clock.** `timeZoneId` = `Asia/Singapore`. Cinema `demoNow` = `2026-09-07T09:00:00+08:00` (Monday 09:00). Never use the system clock for relative labels or predicates.
- **Week calendar.** Fri Sep 4 prior Golden Hour completed → Mon Sep 7 now → Wed Sep 9 Board Game Night → Fri Sep 11 Golden Hour Run **34/42** → Sun Sep 13 Sunday Pickleball.
- **needsAttention.** `dueNow(6) ∪ atRisk(7) ∪ opportunity(4) = 17`, mutually exclusive buckets; derived count never a stored flag; Healthy excluded. Predicate detail in `derived-assertions.md`. Incomplete contact (Marcus missing phone) does **not** inflate the 17 — it only constrains actionability.
- **UI / CI.** UI never hardcodes `17`; count comes from the same predicates as Follow-up queues. CI fails if fixture cardinality ≠ 17 under those predicates.
- Golden Hour Run capacity **42** with **34** active registrations ⇒ **8** spots left (doctrine numbers).
- Board Game Night is the third recurring Anchor activity (youth open play may remain ambient only).
