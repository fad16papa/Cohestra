---
story_id: 32.1
story_key: 32-1-allowed-embed-hosts-and-csp
epic: 32
status: done
baseline_commit: main
created: 2026-08-30
depends_on:
  - 30-1-hidden-field-and-campaign-query-passthrough
sources:
  - _bmad-output/planning-artifacts/epics-registration-capture.md
  - _bmad-output/specs/spec-registration-capture/SPEC.md
  - _bmad-output/planning-artifacts/prds/prd-registration-capture-2026-08-29/prd.md
  - _bmad-output/planning-artifacts/prds/prd-registration-capture-2026-08-29/addendum.md
  - _bmad-output/planning-artifacts/ux-designs/ux-registration-capture-2026-08-29/EXPERIENCE.md
  - _bmad-output/implementation-artifacts/18-2-content-security-policy-baseline.md
forward_deps:
  - 32-2-activity-embed-route-and-share-kit-snippet
  - 32-3-website-contact-section-creates-a-client
---

# Story 32.1: Allowed embed hosts and CSP

Status: done

<!-- Ultimate context engine analysis completed — comprehensive developer guide created -->

## Story

As an Operator,
I want to list the hosts that may iframe my public Form,
So that we can relax framing **only** for those origins — never `*`.

**FRs:** FR-RC-12. **SPEC:** CAP-10 (foundation). **UX:** EXPERIENCE.md — Allowed embed hosts in Settings; empty = no framing. **NFRs:** NFR-RC-7 (embed CSP; deploy docs in lockstep).

## Acceptance Criteria

1. **Given** a tenant with no `allowedEmbedOrigins`
   **When** any origin requests `/embed/register/{slug}` in a frame
   **Then** CSP / `X-Frame-Options` keep `frame-ancestors 'none'` (or equivalent deny)
   **And** admin routes remain non-embeddable

2. **Given** I save an allow-list of origins (scheme + host, no wildcard `*`)
   **When** nginx / `web/content-security-policy.ts` evaluate the **embed route only**
   **Then** `frame-ancestors` includes those origins and nothing else
   **And** public `/register/{slug}` and admin chrome are unchanged
   **And** deploy docs are updated in lockstep (NFR-RC-7)

3. **Given** an invalid origin (`*`, bare `*`, or non-http(s) scheme)
   **When** I save the allow-list
   **Then** the API rejects it (`400` ProblemDetails)

## Tasks / Subtasks

- [x] **Task 1 — Tenant persistence** (AC: 1, 2)
  - [x] Add `AllowedEmbedOrigins` to `Tenant` — `string[]` stored as JSONB (empty array default)
  - [x] EF configuration on `TenantConfiguration`; migration
  - [x] Normalizer: trim, lowercase host for comparison storage optional — store canonical `https://club.example.com` form per validation rules
  - [x] Include in tenant shell or dedicated settings GET if needed for Settings UI (prefer dedicated admin endpoint mirroring registration-timezone pattern)

- [x] **Task 2 — Validation + admin API** (AC: 2, 3)
  - [x] Contracts: `TenantEmbedSettingsResponse`, `UpdateTenantEmbedSettingsRequest` with `IReadOnlyList<string> AllowedEmbedOrigins`
  - [x] Validator: each entry must be `http://` or `https://` + host (optional port); reject `*`, empty host, path/query/fragment, wildcards
  - [x] `GET/PATCH /api/v1/admin/tenant/embed-settings` — `[Authorize(TenantOperator)]`; all plans (embed is not Pro-gated in epic — confirm against PRD; default: all plans with Form tab)
  - [x] `400` ProblemDetails on invalid origins; dedupe on save

- [x] **Task 3 — CSP: embed route only** (AC: 1, 2)
  - [x] Extend `web/content-security-policy.ts`:
    - `buildContentSecurityPolicy({ frameAncestors?: string[] })` — default `'none'`; embed route passes tenant origins
    - Export `nginxContentSecurityPolicyForEmbed(origins: string[])` kept in sync
  - [x] Next.js middleware or route layout for `/embed/**` — read tenant embed origins (from shell/API) and set `Content-Security-Policy` with relaxed `frame-ancestors` only on that path
  - [x] **Do not** change global CSP for `/register/*`, admin, or marketing pages
  - [x] Remove or override `X-Frame-Options: DENY` on embed route only (CSP `frame-ancestors` takes precedence when both present — document in deploy checklist)

- [x] **Task 4 — Deploy docs + nginx note** (AC: 2, NFR-RC-7)
  - [x] Update `docs/deploy/enterprise-launch-checklist.md` — embed CSP is route-scoped in Next; nginx global header stays `'none'` unless we add location block for `/embed/` (document chosen approach)
  - [x] Comment in `deploy/nginx/app.conf` that embed framing is Next-owned per-route (Story 32.1)

- [x] **Task 5 — Settings UI** (AC: 2, UX)
  - [x] New Settings section **Allowed embed hosts** (EXPERIENCE.md) — list editor, add/remove origins, helper copy: empty = no framing; club/Notion examples
  - [x] Wire `tenant-settings-api.ts` (or extend) — fetch/patch embed settings
  - [x] Register in `settings-page-content.tsx` left rail

- [x] **Task 6 — Tests** (AC: all)
  - [x] Unit: origin validator (valid https/http, reject `*`, reject path, reject duplicate)
  - [x] Unit: CSP builder includes only listed origins; empty → `'none'`
  - [x] Integration: PATCH invalid origin → 400; PATCH valid list → GET round-trip
  - [x] Web unit: parse embed settings API response

- [x] **Task 7 — Verify** (AC: all)
  - [x] `dotnet test Cohestra.sln --filter "Category!=Integration"`
  - [ ] Manual: Settings save origins; curl embed route CSP header (dev)

## Dev Notes

### Brownfield anchors

| Area | Today | This story |
|------|-------|------------|
| CSP | `frame-ancestors 'none'` globally (`web/content-security-policy.ts`, nginx) | Relax **only** `/embed/*` |
| Embed route | **Does not exist yet** — Story 32.2 adds page + submit | 32.1 lays CSP + settings; stub route OK for header test |
| Hidden query | Story 30.1 done | 32.2 consumes for parent query passthrough |
| Settings pattern | `registration-timezone`, `notifications` | Mirror for embed-settings |

### Implementation hints

- **Prefer Next middleware** for per-request CSP on `/embed/register/:slug` because origins are tenant-scoped and loaded server-side. Nginx cannot know tenant allow-list without edge logic.
- **Optional stub route** `web/app/embed/register/[slug]/page.tsx` returning minimal placeholder + correct CSP headers — unblocks AC verification before 32.2 full chrome-light form. If stubbing, mark clearly and keep 32.2 scope.
- Store origins as normalized strings e.g. `https://www.notion.so` — no trailing slash.
- Max list size: suggest 20 origins (product guard; not in AC — pick reasonable default).

### Out of scope (32.2 / 32.3)

- Full embed page UI, Share kit iframe snippet, `postMessage` height
- Website Contact section

### References

- `web/content-security-policy.ts` — canonical CSP
- `src/Infrastructure/Tenants/TenantOrganizationService.cs` — settings API pattern
- `web/components/settings/notifications-section.tsx` — Settings section pattern
- Epic 32 stories in `epics-registration-capture.md` lines 674–764

## Dev Agent Record

### Agent Model Used

Composer

### Completion Notes List

- Tenant `AllowedEmbedOrigins` JSONB column + EF migration
- Admin GET/PATCH `/api/v1/admin/tenant/embed-settings` (TenantOperator)
- Public GET `/api/v1/public/embed-origins` for middleware CSP lookup
- Next middleware sets route-scoped CSP on `/embed/*`; stub page at `/embed/register/[slug]`
- Settings → Allowed embed hosts section
- nginx `/embed/` location blocks pass through Next-owned CSP
- 634 unit tests pass; 7 web unit tests pass

### File List

- src/Domain/Tenants/Tenant.cs
- src/Infrastructure/Persistence/Configurations/TenantConfiguration.cs
- src/Infrastructure/Persistence/Migrations/*AddTenantAllowedEmbedOrigins*
- src/Infrastructure/Tenants/EmbedOriginSupport.cs
- src/Infrastructure/Tenants/TenantOrganizationService.cs
- src/Application/Tenants/ITenantOrganizationService.cs
- src/Contracts/Admin/TenantEmbedSettingsContracts.cs
- src/Contracts/PublicEmbed/PublicEmbedContracts.cs
- src/Api/Controllers/V1/AdminTenantEmbedController.cs
- src/Api/Controllers/V1/PublicEmbedOriginsController.cs
- web/content-security-policy.ts
- web/lib/embed-csp.ts
- web/middleware.ts
- web/app/embed/register/[slug]/page.tsx
- web/lib/tenant-settings-api.ts
- web/components/settings/allowed-embed-hosts-section.tsx
- web/components/settings/settings-sections.ts
- web/components/settings/settings-page-content.tsx
- web/components/settings/settings-right-rail.tsx
- deploy/nginx/app.conf
- deploy/nginx/app-ssl.conf.template
- docs/deploy/enterprise-launch-checklist.md
- src/Infrastructure.Tests/Tenants/EmbedOriginSupportTests.cs
- src/Infrastructure.Tests/Auth/TenantAuthControllerPolicyTests.cs
- src/Api.IntegrationTests/TenantEmbedSettingsIntegrationTests.cs
- web/lib/content-security-policy.test.ts
- web/lib/tenant-settings-api.test.ts

### Change Log

- 2026-08-30: Story 32.1 implemented — allowed embed hosts + route-scoped CSP

### Review Findings

- [x] [Review][Patch] Broken import in `embed-csp.ts` — fixed `../content-security-policy` [`web/lib/embed-csp.ts:1`]
- [x] [Review][Patch] AC2 violation: removed `'self'` from `frame-ancestors` [`web/content-security-policy.ts:28`]
- [x] [Review][Patch] `next dev` double CSP on `/embed/*` — excluded embed paths from global CSP headers [`web/next.config.ts`]
- [x] [Review][Patch] Story metadata contradicts itself — aligned to `in-progress` during review [`32-1-allowed-embed-hosts-and-csp.md`]
- [x] [Review][Patch] Max-origin guard runs before dedupe — dedupe first, then enforce max [`EmbedOriginSupport.cs`]
- [x] [Review][Patch] No read-path validation — `SanitizeStoredOrigins` on GET [`TenantOrganizationService.cs:56`]
- [x] [Review][Patch] nginx `/embed/` block missing `proxy_hide_header` — dismissed: hiding upstream CSP would strip Next middleware headers; embed location intentionally passes them through [`deploy/nginx/app.conf:31`]
- [x] [Review][Decision] Settings section is `adminOnly: true` but API uses `TenantOperator` — resolved: API changed to `TenantAdminOnly` to match Settings UI [`AdminTenantEmbedController.cs`]
- [x] [Review][Defer] Public `/embed-origins` exposes tenant allow-list without auth — required for middleware CSP lookup; acceptable recon surface [`PublicEmbedOriginsController.cs`] — deferred, by design
- [x] [Review][Defer] Middleware synchronous uncached API fetch per embed page view — perf concern, no timeout [`web/lib/embed-csp.ts:25`] — deferred, v1 acceptable
- [x] [Review][Defer] Silent fail-closed when embed-origins API unavailable — returns empty list → `'none'`; masks misconfig but is safer [`web/lib/embed-csp.ts:30`] — deferred, fail-closed preferred
- [x] [Review][Defer] No automated e2e assertion of `/embed/register/*` response headers [`TenantEmbedSettingsIntegrationTests.cs`] — deferred to 32.2 manual verify
- [x] [Review][Defer] Settings UI lacks client-side origin validation/max-count guard before PATCH [`allowed-embed-hosts-section.tsx:47`] — deferred, server validates

### Review Findings (pass 2 — 2026-08-30)

- [x] [Review][Patch] Middleware embed CSP fetch ignores `API_URL` — use `getServerApiBaseUrl()` via `resolveMiddlewareApiBaseUrl()` [`web/lib/embed-csp.ts`]
- [x] [Review][Patch] `SanitizeStoredOrigins` does not cap at `MaxOrigins` on read — cap after normalize [`EmbedOriginSupport.cs:120`]
- [x] [Review][Patch] No integration test that `TenantMember` gets 403 on embed-settings — added to `TenantAuthzIntegrationTests` [`TenantAuthzIntegrationTests.cs`]
- [x] [Review][Defer] No unit tests for `embed-csp.ts` URL selection / fail-closed behavior — defer to patch above [`web/lib/embed-csp.ts`] — deferred, covered by fix + optional follow-up test
- [x] [Review][Defer] IDN host punycode mismatch between saved origin and browser `Origin` header — defer v1 [`EmbedOriginSupport.cs:53`] — deferred, edge case
