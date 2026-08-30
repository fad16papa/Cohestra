---
story_id: 32.1
story_key: 32-1-allowed-embed-hosts-and-csp
epic: 32
status: ready-for-dev
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

Status: ready-for-dev

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

- [ ] **Task 1 — Tenant persistence** (AC: 1, 2)
  - [ ] Add `AllowedEmbedOrigins` to `Tenant` — `string[]` stored as JSONB (empty array default)
  - [ ] EF configuration on `TenantConfiguration`; migration
  - [ ] Normalizer: trim, lowercase host for comparison storage optional — store canonical `https://club.example.com` form per validation rules
  - [ ] Include in tenant shell or dedicated settings GET if needed for Settings UI (prefer dedicated admin endpoint mirroring registration-timezone pattern)

- [ ] **Task 2 — Validation + admin API** (AC: 2, 3)
  - [ ] Contracts: `TenantEmbedSettingsResponse`, `UpdateTenantEmbedSettingsRequest` with `IReadOnlyList<string> AllowedEmbedOrigins`
  - [ ] Validator: each entry must be `http://` or `https://` + host (optional port); reject `*`, empty host, path/query/fragment, wildcards
  - [ ] `GET/PATCH /api/v1/admin/tenant/embed-settings` — `[Authorize(TenantOperator)]`; all plans (embed is not Pro-gated in epic — confirm against PRD; default: all plans with Form tab)
  - [ ] `400` ProblemDetails on invalid origins; dedupe on save

- [ ] **Task 3 — CSP: embed route only** (AC: 1, 2)
  - [ ] Extend `web/content-security-policy.ts`:
    - `buildContentSecurityPolicy({ frameAncestors?: string[] })` — default `'none'`; embed route passes tenant origins
    - Export `nginxContentSecurityPolicyForEmbed(origins: string[])` kept in sync
  - [ ] Next.js middleware or route layout for `/embed/**` — read tenant embed origins (from shell/API) and set `Content-Security-Policy` with relaxed `frame-ancestors` only on that path
  - [ ] **Do not** change global CSP for `/register/*`, admin, or marketing pages
  - [ ] Remove or override `X-Frame-Options: DENY` on embed route only (CSP `frame-ancestors` takes precedence when both present — document in deploy checklist)

- [ ] **Task 4 — Deploy docs + nginx note** (AC: 2, NFR-RC-7)
  - [ ] Update `docs/deploy/enterprise-launch-checklist.md` — embed CSP is route-scoped in Next; nginx global header stays `'none'` unless we add location block for `/embed/` (document chosen approach)
  - [ ] Comment in `deploy/nginx/app.conf` that embed framing is Next-owned per-route (Story 32.1)

- [ ] **Task 5 — Settings UI** (AC: 2, UX)
  - [ ] New Settings section **Allowed embed hosts** (EXPERIENCE.md) — list editor, add/remove origins, helper copy: empty = no framing; club/Notion examples
  - [ ] Wire `tenant-settings-api.ts` (or extend) — fetch/patch embed settings
  - [ ] Register in `settings-page-content.tsx` left rail

- [ ] **Task 6 — Tests** (AC: all)
  - [ ] Unit: origin validator (valid https/http, reject `*`, reject path, reject duplicate)
  - [ ] Unit: CSP builder includes only listed origins; empty → `'none'`
  - [ ] Integration: PATCH invalid origin → 400; PATCH valid list → GET round-trip
  - [ ] Web unit: parse embed settings API response

- [ ] **Task 7 — Verify** (AC: all)
  - [ ] `dotnet test Cohestra.sln --filter "Category!=Integration"`
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

_(filled by dev agent)_

### Completion Notes List

### File List

### Change Log
