---
story_id: 33.6
story_key: 33-6-ikigai-democlub-continuous-seed
epic: 33
status: review
baseline_commit: main
created: 2026-09-04
depends_on:
  - 33-1-marketingdemoclub-seed-presentational-mounts
  - 33-2-feeling-copy-kill-chapter-mock-chrome
sources:
  - _bmad-output/specs/spec-democlub-cinema-seed/SPEC.md
  - _bmad-output/specs/spec-democlub-cinema-seed/world-contract.md
  - _bmad-output/specs/spec-democlub-cinema-seed/anchor-fixtures.md
  - _bmad-output/specs/spec-democlub-cinema-seed/derived-assertions.md
  - _bmad-output/specs/spec-democlub-cinema-seed/reverse-chain-tests.md
  - _bmad-output/brainstorming/brainstorm-cinema-mount-density-fidelity-2026-09-04/cohestra-cinema-doctrine.md
forward_deps:
  - 33-3-preview-productframe-desktop-pin-seek
---

# Story 33.6: Ikigai DemoClub continuous seed world

Status: in-progress

## Story

As a marketing visitor,
I want every `/#crm` room to project one continuous Ikigai Social Club week,
So that cinema numbers and people are database assertions — not postcard props.

**Spec:** `spec-democlub-cinema-seed`. **Slice:** seed module + helpers + tests only (mount polish / house-tour pill reorder / AI surface = later).

## Acceptance Criteria

1. **Given** the MarketingDemoClub seed  
   **When** it loads  
   **Then** `orgName` is `Ikigai Social Club` and `publicHost` is `ikigai-social.cohestra.app`  
   **And** it uses frozen clock `Asia/Singapore` / `demoNow = 2026-09-07T09:00:00+08:00` (never system clock)

2. **Given** Anchor events  
   **When** fixtures are inspected  
   **Then** Golden Hour Run (Fri Sep 11) has capacity 42 and exactly 34 active registrations (8 spots left)  
   **And** Board Game Night (Wed Sep 9) and Sunday Pickleball (Sun Sep 13) exist  
   **And** prior Golden Hour (Fri Sep 4) completed feeds attendance/follow-up

3. **Given** five Anchor clients Maya / Daniel / Priya Nair / Marcus / Sarah  
   **When** reverse-chain tests run  
   **Then** each arc fingerprints across Client → Activity → Follow-up → Analytics facts  
   **And** Marcus has no phone and is not WhatsApp-eligible; incompleteness does not inflate needsAttention

4. **Given** Follow-up triage predicates  
   **When** `countNeedAttention(club)` runs  
   **Then** dueNow=6, atRisk=7, opportunity=4, total=17  
   **And** buckets are mutually exclusive; Healthy excluded  
   **And** no stored `needsAttention` boolean; CI fails if count ≠ 17

5. **Given** ambient population  
   **When** clients list renders from seed  
   **Then** ≥25 visible client rows with purposeful statuses  
   **And** Elena/Jordan/Riverside Rec/Sunday clinic locks are removed from invariants

## Tasks / Subtasks

- [ ] Clock + org identity on seed type/JSON
- [ ] Activities + registrations for Golden Hour 34/42 + Pickleball + Board Game Night + prior Golden Hour
- [ ] Five Anchor clientDetails + ambient roster (25–40 visible)
- [ ] Triage helpers: dueNow / atRisk / opportunity / countNeedAttention
- [ ] Golden Hour spots helper; assert derived numbers
- [ ] Reverse-chain tests per Anchor
- [ ] Update assertDemoClubInvariants + unit tests
- [ ] Soft-fix mounts/copy that hardcode Riverside/Elena/Sunday clinic to seed-driven or Ikigai/Golden Hour language where they would lie

## Dev Notes

- Single static JSON architecture from 33.1 stays.
- Operator greeting must not collide with Maya Santos (use another first name).
- FeelingCopy in product-slides may still be old EXPERIENCE prose — update scenes that name Elena/Sunday clinic so cinema does not contradict seed (continuity).
- Do not implement house-tour pill reorder or AI surface here.

## Dev Agent Record

### Agent Model Used
Cursor Grok 4.5

### Completion Notes
(in progress)

### File List
(in progress)
