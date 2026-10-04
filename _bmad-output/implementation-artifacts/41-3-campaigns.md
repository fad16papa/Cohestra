---
id: 41.3
key: 41-3-campaigns
title: Campaigns
status: done
epic: 41
created: 2026-10-04
baseline_commit: ac5538e1910fc48650b7793214ed57fde40bf09c
accepted_commit: 109729f36d65d8335b142bc45b40e2ed84cb3645
implementation_merge_sha: efdb342b81f0d000b9f6d62eed497f3f0007e1d1
---

# Story 41.3: Campaigns

Status: done (ACCEPTED/CLOSED)

DONE requires the Mandatory Code Review Loop on the final HEAD: IMPLEMENT → BUILD → TEST → BMAD CODE REVIEW (repeat until clean) → PRODUCT/UX ACCEPTANCE → CLOSE.

Code review is repeating, not one-shot. Do not mark done from implementation alone. There is no `bmad-close-story` skill.

## Story

As a TenantAdmin or TenantMember,
I want the existing Campaigns room to present truthful list, compose, preview, send, and detail states,
so that Pro workspaces can send consented email safely, Basic/Core see the established lock, and no overlay, entitlement, or tenant-isolation contract is weakened.

## User problem and evidence

Compose overlays were inaccessible before Story 38.6 migrated the primitive. Campaigns remains Pro-locked. Compose at 390px is cramped. List status is color/icon-only. Unknown plans can be treated as locked-Basic. Send can be submitted twice. Preview/detail HTML is rendered unsanitized in the browser. Evidence: backlog §41.3, PX2-A11Y-004, D4, Stories 38.6 / 39.3 / 39.4.

## Current API and frontend inventory

See `_bmad-output/planning-artifacts/evidence/px2-41-3/inventory.md`.

Authoritative surfaces (reuse; do not invent):

- `GET /api/v1/admin/campaigns` — paged list (`page`, `pageSize`, `totalCount`)
- `GET /api/v1/admin/campaigns/{id}` — detail + recipient results
- `POST /api/v1/admin/campaigns/segment/preview`
- `POST /api/v1/admin/campaigns/assets`
- `POST /api/v1/admin/campaigns/assets/from-activity-qr`
- `POST /api/v1/admin/campaigns/send-test`
- `POST /api/v1/admin/campaigns/send` — 200 completed or 202 queued
- `GET/POST/PATCH/DELETE /api/v1/admin/email-templates`
- Controller: `[Authorize(TenantOperator)] [RequireProPlan]`
- Recipient statuses: `queued`, `sent`, `failed`, `skipped`
- Campaign statuses: `queued`, `sending`, `completed`, `failed`
- Server HTML sanitizer: `CampaignEmailBodyProcessor` (Ganss.Xss allowlist)
- Frontend: `web/lib/campaigns-api.ts`, `web/components/campaigns/**`
- Routes: `/campaigns`, `/campaigns/new`, `/campaigns/{id}`

## Roles, plans, routes, and states

See `role-plan-state-matrix.md`. Campaigns requires Pro or higher. Basic/Core admins get UpgradePanel. Members get ask-admin, never checkout. Missing/unknown plan stays pending/conservative and is never assigned a SKU. Role 403 is permission denial, never UpgradePanel. API remains authoritative.

## Architecture decision

**Improve the existing Campaigns room.** Reuse the existing campaigns API, consent/segment validation, outbox send, fake/test provider path, 38.6 Dialog/AlertDialog, PageHeader, UpgradePanel, and entitlement resolver. Do not add a new send workflow, recipient model, provider, or route.

Rejected: new campaign API; autosave; client-side eligibility inferred only from UI; unlocking Basic writes; changing Paddle/plan math; merging compose into list; replacing 38.6 primitives.

Dirty-state contract (smallest consistent): track compose dirty from subject/body/segment vs initial; `beforeunload` only (same native pattern as Website Studio). No autosave. No new in-app route-block dialog.

Send eligibility comes from `isComposeSegmentReady` + authoritative segment preview `withEmailCount` + server validation. Duplicate send is blocked while `sending`.

## Explicit non-goals

Epic 42, Website Studio, Form Studio, new email provider, plan/Paddle/role/policy changes, new recipient schema, autosave, production fixtures, DigitalOcean, production claim. Do not send email to real recipients in QA.

## Acceptance Criteria

1. `/campaigns`, `/campaigns/new`, and `/campaigns/{id}` remain the canonical rooms with existing nav order and redirects. Each has one `main#main-content` and one document `h1`.
2. Pro/Enterprise TenantOperators reach the room. Basic and Core admins see the existing truthful Pro UpgradePanel. Members never see checkout. Missing/unknown plan is pending, not Basic, and has no SKU.
3. Role 403 is ProductErrorState denial, never UpgradePanel. `plan_locked` 403 may show UpgradePanel. Frontend hiding is not authorization.
4. List states are distinct: loading, empty, error+retry, permission denied, plan locked, populated, paging when `totalCount` exceeds the page. Campaign status is visible text, not color-only.
5. Compose stays usable at 390px and preserves subject, message, templates, community/consent segment, additional recipients, preview, email preview, test send, QR insert, and send confirmation.
6. Compose states are truthful: pristine, dirty, invalid/incomplete, segment preview loading, preview failure+retry, zero recipients, ready, confirmation open, sending, partial, failed, completed. No autosave. Duplicate submit is prevented while sending.
7. Preview Dialog/Sheet explains what recipients will receive. Send confirmation AlertDialog states audience/count and that sending is irreversible. Failure/partial copy distinguishes sent, failed, and skipped. Success is not claimed before async status confirms it.
8. Story 38.6 focus trap, Escape, Cancel, inert ownership, initial focus, and focus restoration remain correct for preview, QR, and send confirmation.
9. Detail exposes queued/sending/completed/failed plus sent/failed/skipped recipients. Partial failures are not hidden behind a generic success message.
10. QR insert keeps published-activity and tenant rules, useful alt text, keyboard insertion, and no script/external URL injection.
11. 390–1440: no document overflow; actions ≥44×44; preview has no min-width trap; one main and one `h1`; named controls; visible opaque focus; light/dark/forced-colors/reduced-motion/200% zoom perceivable. Local motion only, 160ms.
12. Tenant isolation, consent, email validation, and provider secrets stay intact. Preview/detail HTML cannot execute scripts or event-handler payloads. Unsafe links fail closed.
13. QA never sends to real recipients. Protected 38.4–41.2 remain intact. Epic 42 is not started.

## Responsive / accessibility / security

See evidence contract. Focus rings stay Story 38.4 opaque tokens. Overlays stay Story 38.6. Entitlements stay Story 39.3.

## Protected Story 38–41.2 contracts

38.4 tokens, 38.5 landmarks, 38.6 overlays, 39.1–39.5, 40.1–40.5, 41.1 Analytics, 41.2 Cohestra AI. Do not reopen them.

## Automated and visual QA

Affected + full Vitest, `tsc`, targeted ESLint, Next production build, campaign/service/provider units, campaign consent + isolation integration, Story 41.3 Playwright + protected 38.4–41.2. Evidence under `px2-41-3/`.

## Rollout risks

QR insert regression. Treating unknown plan as Basic lock. Claiming send success while still queued. Duplicate send. Preview XSS from unsanitized composer HTML. Real provider calls in QA.

## Exact stop gate

Story 41.3 `done`. Epic 41 `done`. 41.1 and 41.2 remain `done`. Epic 42 not started. Production not claimed.

## Tasks / Subtasks

- [x] Inventory and contracts recorded (AC: all)
- [x] Entitlement/pending/denied/lock matrix on list, compose, detail (AC: #2, #3)
- [x] List truthful states, visible status text, paging (AC: #4)
- [x] Compose 390, dirty, overlays, duplicate-send, async results (AC: #5–#8)
- [x] Detail status/result + sanitized HTML (AC: #9, #12)
- [x] QR + security remain fail-closed (AC: #10, #12)
- [x] Unit + Playwright 41.3 + protected 38.4–41.2 (AC: #13)

## Dev Notes

- Reuse `resolveNavEntitlement("campaigns")`. Do not invent plan math.
- Reuse `isComposeSegmentReady` (community + consentOnly) and server preview counts.
- `sendCampaign` already polls queued/sending via `fetchCampaignById` for 60s. UI must show queued/sending if still in flight.
- Server already sanitizes on send. Browser preview/detail still needs a fail-closed sanitizer.
- 38.6 already covers Preview Dialog and Insert QR Dialog on `/campaigns/new`. Keep those primitives.
- Do not change `RequireProPlan`, Paddle, or TenantOperator policy.

### Project Structure Notes

- Routes stay under `web/app/(admin)/campaigns/`
- Presentational pages stay under `web/components/campaigns/`
- Shared entitlement stays in `web/lib/admin-nav-entitlements.ts`

### References

- [Source: `_bmad-output/planning-artifacts/cohestra-product-experience-2-backlog.md` §41.3]
- [Source: `_bmad/custom/mandatory-code-review-loop.md`]
- [Source: Stories 38.6, 39.3, 41.1, 41.2]

## Dev Agent Record

### Agent Model Used

Grok 4.6 (primary) for catalog, story, readiness, architecture, implementation, tests, and all four review layers. Composer 2.5 unused.

### Debug Log References

See `_bmad-output/planning-artifacts/evidence/px2-41-3/test-results.md` and `review.md`.

### Completion Notes List

- Existing campaigns API, consent, outbox send, and 38.6 overlays reused. No new provider or schema.
- Unknown/missing plan is pending. Role 403 is denied. Members never get checkout.
- QA intercepts send and send-test. No real recipients mailed.
- Closed after post-merge verification on accepted `109729f3` / merge `efdb342b` and required main CI `37202230854` (5/5).
- Story 41.3 is `done`. Epic 41 is `done`. Stories 41.1 and 41.2 remain done. Epic 42 was not started.
- Production is not claimed.

### File List

- `_bmad-output/implementation-artifacts/41-3-campaigns.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/evidence/px2-41-3/**`
- `web/components/campaigns/**`
- `web/lib/campaign-html.ts`
- `web/lib/campaign-room-access.ts`
- `web/lib/campaigns-api.ts`
- `web/e2e/campaigns-41-3.spec.ts`

### Change Log

- 2026-10-04: Created Story 41.3 from main `ac5538e1`. Epic 41 remains in-progress. Stories 41.1 and 41.2 remain done. Epic 42 not started.
- 2026-10-04: Implementation + QA + four-layer review. Tracker moved to `review`. Draft PR #381.
- 2026-10-04: Product-owner review patched Pro-to-Pro isolation coverage, stale-preview send, and in-flight duplicate send. Story remains `review` until merge + tracker-close.
- 2026-10-04: Closed after Product Owner final-head review on `109729f3`, merge of PR #381 as `efdb342b`, post-merge verification, and required main CI `37202230854` (5/5). Epic 41 → done. Epic 42 not started. Production not claimed.
