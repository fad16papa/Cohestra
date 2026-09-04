---
story_id: 33.2
story_key: 33-2-feeling-copy-kill-chapter-mock-chrome
epic: 33
status: review
baseline_commit: main
created: 2026-09-03
depends_on:
  - 33-1-marketingdemoclub-seed-presentational-mounts
sources:
  - _bmad-output/planning-artifacts/epics-live-proof-cinema.md
  - _bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-09-01/EXPERIENCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-09-01/DESIGN.md
  - _bmad-output/brainstorming/brainstorm-cinema-product-fidelity-2026-09-03/brainstorm-intent.md
  - _bmad-output/implementation-artifacts/33-1-marketingdemoclub-seed-presentational-mounts.md
forward_deps:
  - 33-3-preview-productframe-desktop-pin-seek
---

# Story 33.2: Feeling copy + kill chapter/mock chrome

Status: review

<!-- Ultimate context engine analysis completed — comprehensive developer guide created -->

## Story

As a marketing visitor,
I want feeling-led room copy without chapter pedagogy or fake browser chrome,
So that the section feels like Cohestra — calm proof, not a brochure or SaaS mock.

**FRs:** FR4 (feeling copy). **UX-DR:** UX-DR4, F3 (kill chapter), fidelity AC F1. **Slice:** apex `/#crm` only.

## Acceptance Criteria

1. **Given** the `/#crm` section header  
   **When** the section renders  
   **Then** the H2 thesis is “A week with your people”  
   **And** the lead reads “A week inside a club like yours — the same rooms your team will open on Monday.”  
   **And** there is no “Inside the workspace” (or other) section eyebrow

2. **Given** each product room  
   **When** FeelingCopy updates  
   **Then** copy follows Feeling → Scene → Proof with ≤3 outcome lines  
   **And** the feeling word appears before feature taxonomy

3. **Given** the prior chapter/mock cinema UI  
   **When** Live Proof Cinema ships  
   **Then** `chapterNumber`, “Chapter N of 6”, and “Scroll to continue” are gone  
   **And** `ShowcaseBrowserChrome` fake browser dots are not the authenticity frame  
   **And** hollow Website rails / PRO chip theater are not shown

4. **Given** Midnight Atelier brand inherit  
   **When** cinema typography renders  
   **Then** Fraunces displays + Plus Jakarta Sans instruments are used  
   **And** Sora is not introduced

## Tasks / Subtasks

- [x] **Task 1 — Rewrite PRODUCT_SLIDES copy model** (AC: 2, 4)
  - [x] Change `ProductSlide` fields from taxonomy brochure (`eyebrow`/`title`/`lead`/`points`) to Feeling → Scene → Proof: `feeling`, `feelingLine`, `scene`, `outcomes` (≤3), keep `id`/`navLabel`/`visual`
  - [x] Seed locked copy from EXPERIENCE.md rooms (Relief…Pride) — see Dev Notes
  - [x] Add `job` string per room for live-region readiness (optional wire now; 33.4 owns announce cadence)
  - [x] Update any consumers of old field names (cinema + legacy carousel)

- [x] **Task 2 — Section header + FeelingCopy chrome** (AC: 1, 2, 3)
  - [x] `marketing-product-cinema.tsx`: omit section eyebrow; set locked H2 + lead
  - [x] Remove `chapterNumber` watermark, “Chapter N of 6”, “Scroll to continue”
  - [x] Render feeling word (`text-section text-gold-cinema`) → feeling line (Fraunces H3) → scene (`text-stone-cinema`) → ≤3 outcome lines **without** lagoon checkmark cards
  - [x] Same section header + FeelingCopy rewrite in `marketing-product-carousel.legacy.tsx` (mobile/PRM/rollback must not keep old brochure)

- [x] **Task 3 — Delete mock authenticity theater** (AC: 3)
  - [x] Delete `web/components/marketing/marketing-product-showcase-mocks.tsx`
  - [x] Delete `web/components/marketing/marketing-crm-showcase.tsx`
  - [x] Grep: zero remaining imports of ShowcaseBrowserChrome / MarketingCrmShowcase / *ShowcaseMock
  - [x] Clean dead `.marketing-crm-showcase-*` selectors in cinema className / `globals.css` if unused

- [x] **Task 4 — Verify fonts + no Sora** (AC: 4)
  - [x] Confirm Fraunces + Plus Jakarta remain the only marketing display/instrument faces
  - [x] Grep `web/`: no `Sora` / `font-sora`

- [x] **Task 5 — Tests + manual verify** (AC: all)
  - [x] Unit/smoke: assert PRODUCT_SLIDES outcomes length ≤3; feeling words match locked set; no “Chapter” / “Scroll to continue” / “Inside the workspace” in cinema source
  - [x] `cd web && npx vitest run` (relevant) + typecheck touched files
  - [x] Manual `/#crm`: thesis + lead; Relief…Pride feeling words; no chapter graffiti; no checklist cards; Website eyebrow not “· Pro”

## Dev Notes

### Scope boundaries

| In 33.2 | Out of scope |
|---------|--------------|
| Feeling copy rewrite | ProductFrame URL chrome (33.3 / F2) |
| Kill chapter pedagogy | Pin/seek math changes (33.3) |
| Kill ShowcaseBrowserChrome files | Density quotas / portraits (fidelity P1) |
| Kill checklist cards | Website hero photo gate (F6) |
| Section thesis/lead | Live-region string finalization (33.4) |

### Locked section copy

- **H2:** A week with your people  
- **Lead:** A week inside a club like yours — the same rooms your team will open on Monday.  
- **Eyebrow:** omit

### Locked room copy (from EXPERIENCE)

| id | feeling | feelingLine | scene | outcomes (≤3) |
|----|---------|-------------|-------|----------------|
| clients | Relief | Every person who signs up still has a name on Monday | Elena scanned Sunday clinic… | One profile…; Status…; History… |
| outreach | Connection | Message them where they already are — and keep the record | WhatsApp to Jordan… | Open WhatsApp…; The send is logged…; Nobody gets… |
| dashboard | Control | Know what needs you before the session starts | Follow-ups still open… | Who still needs…; This week…; Jump to… |
| campaigns | Reach | Reach the right people without exporting your community | Sunday clinic regulars… | Segment…; Preview…; Delivery… |
| reports | Proof | Show the week — not a spreadsheet archaeology dig | Elena counted once… | Filter…; People and registrations…; Export… |
| website | Pride | Your public face stays tied to the activities you already run | Sunday clinic and board games… | Activities update…; Preview, then publish; Share… |

Full strings: EXPERIENCE.md rooms 1–6.

### Outcome line presentation

Do **not** use lagoon checkmark cards (`Check` + rounded paper tiles). Prefer quiet ink lines (hairline rules or simple list) so proof stays editorial, not SaaS brochure. Live stage is the real Proof.

### Anti-patterns

- Taxonomy eyebrows (“Client CRM”, “Website builder · Pro”)
- Feature checklist stacks
- Chapter numbers / watermarks / SCROLL TO CONTINUE
- Reintroducing ShowcaseBrowserChrome
- Changing pin VH / ProductFrame chrome “while you’re in there” (33.3)
- Sora

### References

- [Source: epics-live-proof-cinema.md — Story 33.2]
- [Source: ux-cohestra-2026-09-01/EXPERIENCE.md — rooms + FeelingCopy]
- [Source: brainstorm-intent-cinema-product-fidelity-2026-09-03.md — F3]
- [Source: 33-1 story — deferred feeling/chapter to 33.2]

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5

### Debug Log References

### Completion Notes List

- Rewrote PRODUCT_SLIDES to Feeling → Scene → Proof (feeling/feelingLine/scene/outcomes/job)
- Locked section thesis/lead; omitted section eyebrow on cinema + legacy
- Removed chapterNumber watermark, Chapter N of 6, Scroll to continue
- Replaced lagoon checklist cards with quiet outcome lines
- Deleted ShowcaseBrowserChrome mock files (marketing-product-showcase-mocks.tsx, marketing-crm-showcase.tsx)
- Cleaned dead .marketing-crm-showcase-* CSS; live region uses `{navLabel}. {job}.`
- Vitest product-slides.test.ts 5/5; no Sora; tsc clean for touched surface

### File List

- web/lib/marketing/product-slides.tsx
- web/lib/marketing/product-slides.test.ts
- web/components/marketing/marketing-product-cinema.tsx
- web/components/marketing/marketing-product-carousel.legacy.tsx
- web/components/marketing/use-marketing-product-cinema.ts
- web/app/globals.css
- web/components/marketing/marketing-product-showcase-mocks.tsx (deleted)
- web/components/marketing/marketing-crm-showcase.tsx (deleted)
- _bmad-output/implementation-artifacts/33-2-feeling-copy-kill-chapter-mock-chrome.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

### Change Log

- 2026-09-03: Implemented Story 33.2 — feeling copy + kill chapter/mock chrome
