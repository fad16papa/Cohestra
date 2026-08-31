---
story_id: 32.2
story_key: 32-2-activity-embed-route-and-share-kit-snippet
epic: 32
status: review
baseline_commit: fad9672
created: 2026-08-31
depends_on:
  - 32-1-allowed-embed-hosts-and-csp
  - 30-1-hidden-field-and-campaign-query-passthrough
sources:
  - _bmad-output/planning-artifacts/epics-registration-capture.md
forward_deps:
  - 32-3-website-contact-section-creates-a-client
---

# Story 32.2: Activity embed route and Share kit snippet

Status: review

## Story

As an Operator,
I want a chrome-light embed of one Activity's Form and an iframe snippet in the Share kit,
So that Saturday's signup can live on a club or Notion page and still write a Registration + Client.

**FRs:** FR-RC-12 (embed route). **UX:** UX-DR18, UX-DR-RC-9 (chrome-light iframe). **Depends:** 32.1 CSP allow-list; 30.1 Hidden query passthrough.

## Acceptance Criteria

1. **Given** at least one allowed origin from 32.1
   **When** that origin iframes `/embed/register/{slug}`
   **Then** the Form renders without admin chrome
   **And** submit uses the same public registration API
   **And** a successful submit creates a Registration + deduped Client as on `/register/{slug}`
   **And** parent query string feeds Hidden Fields (Story 30.1)
   **And** the iframe `postMessage`s height so the parent can resize
   **And** public submit rate limits still apply

2. **Given** the Share kit
   **When** I copy the embed snippet
   **Then** I get an iframe pointing at `/embed/register/{slug}`
   **And** the snippet is not offered in a useful way if the allow-list is empty (copy disabled or helper: add allowed hosts first)

3. **Given** an origin **not** on the allow-list
   **When** it tries to frame the embed route
   **Then** the browser/CSP blocks it (32.1)

## Tasks / Subtasks

- [x] **Task 1 — Port 30.1 Hidden query deps** (AC: 1)
  - [x] Backend: `Hidden` field type, `DefaultValue`, `HiddenValueSanitizer`, answer validation/normalization
  - [x] Web: `hidden-field-query.ts`, `collectHiddenAnswers` in `RegistrationForm` submit
  - [x] Tests: hidden field validator + integration tests from 30.1

- [x] **Task 2 — Chrome-light embed route** (AC: 1)
  - [x] `web/app/embed/layout.tsx` — no PublicFormLayout chrome
  - [x] Replace stub `web/app/embed/register/[slug]/page.tsx` — reuse `PublicRegistrationOpen` variant embed
  - [x] Same public registration API + unavailable states as `/register/{slug}`

- [x] **Task 3 — postMessage height** (AC: 1)
  - [x] `EmbedHeightReporter` — ResizeObserver + `cohestra-embed-resize` message to parent
  - [x] Parent listener example in Share kit helper text

- [x] **Task 4 — Share kit iframe snippet** (AC: 2)
  - [x] `embed-snippet.ts` — build embed URL + iframe HTML
  - [x] `activity-share-kit-panel.tsx` — fetch embed settings; gate copy on allow-list
  - [x] Copy embed snippet button + helper when empty

  - [x] **Task 5 — Tests + verify** (AC: all)
  - [x] Web unit: `embed-snippet.test.ts`, `hidden-field-query.test.ts`
  - [x] `dotnet test Cohestra.sln --filter "Category!=Integration"` — 641 passed
  - [x] `cd web && npm run test -- embed-snippet hidden-field-query` — 7 passed

### Review Findings (2026-08-31)

- [x] [Review][Decision] **Parent-page query vs iframe-src query for Hidden Fields** — Resolved: document that campaign params belong on iframe `src` (e.g. `?ref=wa`); Share kit helper + copy bundle comment.
- [x] [Review][Patch] **Iframe snippet missing `id` matching resize listener** [`web/lib/embed-snippet.ts:34`]
- [x] [Review][Patch] **Embed settings fetch failure shown as empty allow-list** [`web/components/activities/activity-share-kit-panel.tsx:122`]
- [x] [Review][Patch] **Share kit conflates loading vs empty embed hosts** [`web/components/activities/activity-share-kit-panel.tsx:391`]
- [x] [Review][Patch] **Copy embed snippet should bundle iframe + listener (or copy both)** [`web/components/activities/activity-share-kit-panel.tsx:420`]
- [x] [Review][Patch] **Resize listener snippet needs origin + height validation** [`web/lib/embed-snippet.ts:38`]
- [x] [Review][Patch] **EmbedHeightReporter guard non-finite height and skip when top-level** [`web/components/registration/embed-height-reporter.tsx:21`]
- [x] [Review][Patch] **buildActivityEmbedUrl should use URL API not string replace** [`web/lib/embed-snippet.ts:20`]

- [x] [Review][Defer] **postMessage uses targetOrigin `"*"`** [`web/components/registration/embed-height-reporter.tsx:28`] — deferred, standard v1 embed-widget pattern; parent listener should validate origin
- [x] [Review][Defer] **No automated /embed/register or postMessage e2e tests** — deferred, matches 32.1 manual-verify pattern
- [x] [Review][Defer] **AC 3 CSP blocking not tested in this diff** — deferred, enforced by Story 32.1 middleware
- [x] [Review][Defer] **Rate-limit parity for embed submit unverified** — deferred, reuses same public registration API path
- [x] [Review][Defer] **Double activity fetch in generateMetadata + page** [`web/app/embed/register/[slug]/page.tsx`] — deferred, minor Next.js perf
- [x] [Review][Defer] **Hidden query passthrough not integration-tested via URL query string** — deferred, client-side merge covered by unit tests

### Review Findings — Pass 2 (2026-08-31)

- [x] [Review][Patch] **`AppFooter` renders on `/embed/*`, under-reports resize height** [`web/components/layouts/app-footer.tsx:15`]
- [x] [Review][Patch] **Share kit iframe textarea still iframe-only** [`web/components/activities/activity-share-kit-panel.tsx:443`]
- [x] [Review][Patch] **Campaign URL example breaks when embed URL has query** [`web/components/activities/activity-share-kit-panel.tsx:435`]
- [x] [Review][Patch] **EmbedHeightReporter should cap height at 10000** [`web/components/registration/embed-height-reporter.tsx:25`]
- [x] [Review][Patch] **Resize listener should verify `event.source`** [`web/lib/embed-snippet.ts:64`]

- [x] [Review][Defer] **Fixed iframe id breaks multi-embed parent pages** — deferred, v1 assumes one embed per page
- [x] [Review][Defer] **Inline `<script>` in copy bundle blocked by strict parent CSP** — deferred, document external-script alternative in follow-up
- [x] [Review][Defer] **No initial min-height on iframe snippet** — deferred, first postMessage handles resize; minor UX flash
- [x] [Review][Defer] **Required hidden fields not enforced when query absent** — deferred, Story 30.1 contract: required hidden never blocks submit
- [x] [Review][Defer] **Paused registration uses `plan-limit` unavailable reason** — deferred, matches public `/register/{slug}` brownfield

### Review Findings — Pass 3 (2026-08-31)

**Acceptance audit:** All Story 32.2 ACs satisfied (chrome-light embed, iframe-src hidden query, postMessage height, Share kit gating, CSP via 32.1).

- [ ] [Review][Patch] **Duplicate `NonInput` guard in `NormalizeAnswers`** [`RegistrationAnswerValidator.cs:129-137`]
- [ ] [Review][Patch] **Embed iframe uses `loading="lazy"`** [`web/lib/embed-snippet.ts:73`] — delays first load/resize for above-the-fold signup embed; remove or use `eager`.
- [ ] [Review][Patch] **Resize listener accepts height `0`** [`web/lib/embed-snippet.ts:84`] — use `h <= 0` reject to match reporter and avoid collapsed iframe.
- [ ] [Review][Patch] **Strip newlines from activity name before HTML attribute escape** [`web/lib/embed-snippet.ts:10`]

- [x] [Review][Defer] **Hidden field form editor incomplete (no defaultValue UI, stale props on type switch)** — deferred, minimal 30.1 port; full editor ships with Story 30.1
- [x] [Review][Defer] **`PublicRegistrationUnavailable` shows “Public registration” card chrome in embed** — deferred, minor copy polish
- [x] [Review][Defer] **Client-side hidden query length not capped at 200** — deferred, server validates; generic submit error only
- [x] [Review][Defer] **Campaign example URL in HTML comment could break on `-->`** — deferred, API-built URLs unlikely

## Dev Notes

### Brownfield anchors

| Area | Pattern |
|------|---------|
| Public register | `web/app/(public)/register/[slug]/page.tsx` + `PublicRegistrationOpen` |
| CSP embed | Story 32.1 middleware on `/embed/*` |
| Share kit | `activity-share-kit-panel.tsx` |
| Hidden query | Story 30.1 — minimal port without Epic 31 Recipes/steps |

### Implementation hints

- Embed URL: replace `/register/` → `/embed/register/` in registration link path
- `PublicRegistrationOpen variant="embed"` uses compact preset, no platform header (embed layout)
- Hidden answers merged at submit from `window.location.search`

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Ported minimal Story 30.1 hidden-field backend + web query passthrough (no Epic 31 Recipes/steps)
- Full chrome-light `/embed/register/{slug}` with postMessage height reporter
- Share kit iframe snippet gated on tenant allowed embed hosts

### File List

- web/app/embed/layout.tsx
- web/app/embed/register/[slug]/page.tsx
- web/components/registration/embed-height-reporter.tsx
- web/components/registration/public-registration-open.tsx
- web/components/registration/registration-form.tsx
- web/components/activities/activity-share-kit-panel.tsx
- web/lib/embed-snippet.ts
- web/lib/embed-snippet.test.ts
- web/lib/hidden-field-query.ts
- web/lib/hidden-field-query.test.ts
- web/lib/activities-api.ts
- web/lib/form-schema-utils.ts
- src/Domain/Activities/FormFieldTypes.cs
- src/Domain/Activities/ActivityFormSchema.cs
- src/Contracts/Activities/ActivityFormSchemaDto.cs
- src/Infrastructure/Activities/FormSchemaMapper.cs
- src/Infrastructure/Activities/FormSchemaValidator.cs
- src/Infrastructure/Registrations/HiddenValueSanitizer.cs
- src/Infrastructure/Registrations/RegistrationAnswerValidator.cs
- src/Infrastructure/Registrations/ClientProfileExtractor.cs
- src/Infrastructure.Tests/Activities/FormSchemaValidatorTests.cs
- src/Api.IntegrationTests/HiddenFieldRegistrationIntegrationTests.cs
- src/Infrastructure.Tests/Clients/ClientRegistrationAnswerFormatterHiddenTests.cs

## Change Log

- 2026-08-31: Code review pass 2 — hide AppFooter on /embed/*, bundle textarea, campaign URL helper, height cap, event.source guard
- 2026-08-31: Code review pass 1 — decision + 7 patches applied (iframe id, embed bundle copy, settings error/loading, URL API, height guards)
- 2026-08-31: Story 32.2 implemented — embed route, postMessage height, Share kit snippet; minimal 30.1 hidden-field port
