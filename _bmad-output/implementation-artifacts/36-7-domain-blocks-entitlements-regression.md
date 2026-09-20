# Story 36.7: Domain blocks + entitlements + Epic integration

Status: ready-for-dev

<!-- Ultimate context engine analysis completed - comprehensive developer guide created -->

**Epic:** 36 — Form Studio 2.0 Visual Form Builder  
**Sprint key:** `36-7-domain-blocks-entitlements-regression`  
**Depends on:** 36.1–36.6 ACCEPTED + MERGED (`a569938` on main)  
**Final Epic 36 story:** YES — after this story is accepted, merged, and post-merge CI is green, close Epic 36 (do not start 36.8).

## Story

As a tenant operator,
I want to add Cohestra domain-aware blocks that stay bound to live Activity and Community data, with server-authoritative plan gates,
so that Form Studio 2.0 can compose a real registration form that reflects Cohestra domain state — not copied text — and Epic 36 can close as a coherent product.

## Readiness (Grok 4.6)

| # | Item | Decision |
|---|------|----------|
| 1 | Title | Domain blocks + entitlements + Epic integration |
| 2 | User outcome | Operator adds live-bound Activity/Community blocks; Preview/public match; Basic stays polished without those blocks |
| 3 | AC | See Acceptance Criteria |
| 4 | PRD | FR-FS2-2, FR-FS2-12–14, FR-FS2-21–29, FR-FS2-32–34 |
| 5 | UX | EXPERIENCE.md palette group **Activity**; DESIGN.md tokens/surfaces |
| 6 | Architecture | AD-2 `domain` kind; AD-6 form-body only; AD-9 Core domain blocks |
| 7 | Domain blocks in scope | **Only** `activityDetails`, `communityIdentity`, `capacityStatus` |
| 8 | Data sources | Current Activity / public payload — never schema copies |
| 9 | Plan | Domain blocks **Core+**; existing Columns / tokens / layouts / conversational unchanged |
| 10 | Preview | Same resolver + renderer as public; live Activity props already on Form tab |
| 11 | Public | Same `RegistrationCompositionRenderer` path |
| 12 | Fallback | Omit missing rows; omit whole block if nothing public-safe remains |
| 13 | BC | Legacy v1 and v2 without domain nodes unchanged; no migration |
| 14 | Responsive | Domain blocks wrap at 1440 / 1024 / 768 / 430 / 390 / 360 |
| 15 | A11y | Textual meaning; logo alt from Community name; palette/inspector keyboard |
| 16 | Performance | One shared `FormDomainContext`; no per-block fetch |
| 17 | Security | Current tenant Activity only; public-safe fields only; no schema-supplied foreign IDs |
| 18 | Non-goals | Separate date/time or location kinds; header-replace flag; uniqueness; Phase 2 logic; Tally parity claim |
| 19 | Final story | **Yes** |

## Acceptance Criteria

1. **Canonical domain model only** — reuse `kind: "domain"` + `domain: activityDetails | communityIdentity | capacityStatus`. Do not invent `ActivityBlockSchema` / parallel composition systems.
2. **References, not copies** — persist configuration only (`id`, `kind`, `domain`). Never persist Activity title, schedule, location, capacity counts, or Community name/logo into FormSchema.
3. **activityDetails** resolves current public-safe Activity `schedule` + `location`. Do **not** re-render Activity title (shells already show it). Hide empty rows; omit the block when both are absent.
4. **capacityStatus** uses existing `buildRegistrationCapacitySummary` + `RegistrationCapacityStatus` (unlimited, zero, full, over-cap, never negative spots).
5. **communityIdentity** resolves current `communityLabel` + `logoAssetId` (same public-safe logo path as shells). Hide missing logo; omit block when name and logo are both absent.
6. **Shared context** — `PublicRegistrationOpen` → `RegistrationForm` → `RegistrationCompositionRenderer` receives one `FormDomainContext`. Preview and public use the same resolver. No `DomainBlockPreview` fake values.
7. **Builder** — palette group **Activity** with three items. Inspector is read-only bound-data copy. Deleting a domain node removes only that node (Activity/Community unchanged). Duplicates allowed.
8. **Nesting** — domain is a leaf. Allowed in Section and Columns. Client + server reject children/columns on domain nodes (already true for leaves).
9. **Conversational** — domain nodes are presentation. Question flow stays field-only. Operator warning includes Activity/community blocks.
10. **Entitlements** — Basic: UI lock + upgrade copy, no empty broken palette. Core/Pro: unlocked. Server `FormSchemaPlanGate` rejects Basic save/API bypass (`403` `plan_locked`). Existing Columns, design-token, layout, conversational, website-link gates must not change.
11. **Submission** — domain nodes never become answers or validation fields.
12. **Tenant isolation / public-safe** — schema cannot point at another Activity/Community. Resolver uses request Activity only. No internal/private fields.
13. **Freshness** — no domain snapshot cache. Follow existing public Activity payload freshness.
14. **Epic integration** — 36.7 is the last Epic 36 story. After AC, run the full Form Studio 2.0 operator path and regression matrix.

## Tasks / Subtasks

- [ ] Domain resolver + shared context (AC: 2, 3, 4, 5, 6, 12, 13)
  - [ ] `web/lib/form-domain-blocks.ts` + tests
  - [ ] Thread context from `PublicRegistrationOpen` (already has live Activity props)
- [ ] Builder palette / inspector / mutations (AC: 7, 8, 9)
  - [ ] `addDomainBlock` — no `fields[]` entry
  - [ ] Activity group + Basic lock
  - [ ] Conversational notice includes domain blocks
- [ ] Canonical renderer (AC: 1, 6, 14)
  - [ ] Domain case in `RegistrationCompositionRenderer`
  - [ ] Theme-consistent presentational component (not admin widget)
- [ ] Server entitlements (AC: 10, 12)
  - [ ] `FormSchemaPlanGate.CompositionUsesDomain` + Basic reject
  - [ ] Trigger `EnsureAllowed` when domain present (Activity + FormTemplate)
- [ ] Tests + checkpoint + CI (AC: 11–14)
- [ ] Epic closeout artifacts after merge + post-merge CI

## Dev Notes

### Do not reinvent

36.1 already shipped the domain node on both sides:

- `src/Domain/Activities/FormComposition.cs` — `FormCompositionKinds.Domain`, `FormCompositionDomainTypes`
- `FormSchemaCompositionValidator.ValidateDomainNode` already accepts the three types
- `FormCompositionNodeDto.Domain` + mapper already round-trip `domain`
- `web/lib/activities-api.ts` `FormCompositionNode.domain`
- Contract: `docs/contracts/activity-form-schema-v2-composition.md`

**Missing today:** palette, mutations, inspector, renderer case, shared resolver, conversational inclusion, Core+ plan gate, Preview context threading.

### Data flow (mandatory)

```
Activity (admin) / PublicActivity
        ↓  already loaded on Form tab / public page
FormDomainContext (in-memory only)
        ↓
RegistrationCompositionRenderer
        ↓
resolveFormDomainBlock(domain, context)
        ↓
RegistrationDomainBlock
```

Do **not** fetch Activity per domain node. Do **not** store resolved values on the node.

`FormDomainContext` fields (public-safe only):

- `schedule`, `location` (Activity)
- `communityLabel`, `logoAssetId`
- `registrationCount`, `maxRegistrants`, `isRegistrationFull`

Do **not** pass tenant IDs, operator notes, emails, or unpublished internals.

Schedule string is already timezone-formatted by the existing Activity/public API. Do not re-parse with browser-local time.

### Fallback

| Block | Missing | Public + Preview |
|-------|---------|------------------|
| activityDetails | empty schedule | hide When row |
| activityDetails | empty location | hide Where row |
| activityDetails | both empty | omit block |
| communityIdentity | no logo | name only |
| communityIdentity | no name, no logo | omit block |
| capacityStatus | unlimited + 0 going | omit (`kind: "hidden"`) |

Never render `undefined`, `null`, or a blank giant area.

### Entitlement architecture

Extend `FormSchemaPlanGate` (do not scatter `if (plan === Basic)` in random components).

Today `EnsureAllowed` early-returns when only domain nodes exist — **that is the bug to fix**.

UI lock reason must match server message family: Core or Pro.

Regression must still prove:

- Columns Basic 403
- Premium design tokens Basic reject
- Split/Poster Core; Conversational Pro
- Basic publisher website link stripped/rejected

### Conversational

`compositionHasPresentationBlocks` currently checks content/section/columns only — add `domain`.

Update `CONVERSATIONAL_PRESENTATION_NOTICE` to mention Activity/community blocks.

Do not redesign the conversational engine.

### Previous story intelligence (36.1–36.6)

- Preview path is `RegistrationPublicPreviewShell` → `PublicRegistrationOpen` → `RegistrationForm` → `RegistrationCompositionRenderer`. Do not remount the shell for draft edits (36.6).
- Columns + domain are both Core+. Mirror `COLUMNS_LOCKED_REASON` + `CompositionUsesColumns`.
- Client/server composition validation must stay aligned (`form-composition-client.ts` vs `FormSchemaCompositionValidator`).
- Presentation nodes must not enter answers (36.3 integration test pattern).
- Preview e2e must scope to `#form-studio-preview-panel` (36.6 strict-mode dual shells).
- Form schema 400 `Unsupported content type ''` was using `type` instead of `contentType` — domain uses `domain`, not `contentType`.

### Git intelligence

Recent Epic 36 pattern: web lib + renderer + .NET plan gate + integration 403 + Playwright live checkpoint. No new packages.

### Files to touch (expected)

**UPDATE**

- `web/lib/form-composition-mutations.ts` — `addDomainBlock`
- `web/lib/form-composition-client.ts` — validate domain type
- `web/lib/form-composition-presentation.ts` — include domain
- `web/components/activities/form-composition-builder.tsx` — Activity palette
- `web/components/activities/form-composition-inspector.tsx` — bound-data copy
- `web/components/registration/registration-composition-renderer.tsx`
- `web/components/registration/registration-form.tsx` — `domainContext` prop
- `web/components/registration/public-registration-open.tsx` — pass context
- `src/Infrastructure/Activities/FormSchemaPlanGate.cs`
- `src/Infrastructure/Activities/ActivityService.cs`
- `src/Infrastructure/Activities/FormTemplateService.cs`
- tests + e2e + sprint-status + this story

**NEW**

- `web/lib/form-domain-blocks.ts` (+ test)
- `web/components/registration/registration-domain-block.tsx`
- `web/e2e/form-studio-domain-36-7.spec.ts`
- `src/Infrastructure.Tests/Activities/FormSchemaPlanGateDomainTests.cs`

### Testing requirements

Behavioral, not snapshot spam.

1. add each domain block — stable id, no new field
2. invalid `domain` rejected client + server
3. resolver fallbacks (missing location, unlimited, no logo)
4. Preview/public use same resolver
5. deletion does not touch Activity
6. domain inside section + left/right column
7. conversational notice
8. Basic UI lock + API 403; Core/Pro allow
9. Columns + token entitlement regressions
10. submit excludes domain keys
11. legacy v1 unchanged

### Project Structure Notes

Keep domain resolution in `web/lib` (pure). Keep presentational output in `web/components/registration`. Keep plan gates in `FormSchemaPlanGate`.

### References

- [Source: `_bmad-output/planning-artifacts/epics-form-studio-2-0-36.md` — Story 36.7]
- [Source: `prd-form-studio-2-0-2026-09-20/prd.md` — FR-FS2-12–14, FR-FS2-26–29]
- [Source: `architecture-form-studio-2-0-2026-09-20/ARCHITECTURE-SPINE.md` — AD-2, AD-6, AD-9]
- [Source: `ux-form-studio-2-0-2026-09-20/EXPERIENCE.md` — Activity palette group]
- [Source: `web/lib/registration-capacity-summary.ts`]
- [Source: `src/Infrastructure/Activities/FormSchemaPlanGate.cs`]

## Dev Agent Record

### Agent Model Used

Grok 4.6 (primary) / Composer 2.5 (bounded secondary, if used)

### Debug Log References

### Completion Notes List

### File List
