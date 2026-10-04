# Story 42.1 post-merge verification

Date: 2026-10-04  
Accepted implementation commit: `d12e13e1fbef70e202af9b9c1adf45cc28467d07`  
Implementation merge SHA: `776fd43c008202a99d9a413ea11ade5829fc228a` (PR #383)  
PR HEAD at merge: `d12e13e1fbef70e202af9b9c1adf45cc28467d07`  
`d12e13e1` is an ancestor of `776fd43c`.  
Merge parents: `c3e57bbc32e2446b19eb050edbbc6be2b9dc5f4c` + `d12e13e1fbef70e202af9b9c1adf45cc28467d07`.

Baseline `c3e57bbc` is synchronized `main` after “merge all pending”: Dependabot (including Next 16.3.6), Epic 37 close docs, and the idempotent `AddTenantRegistrationTimeZoneId` migration. Epic 41 close `73fd2855` is an ancestor of that baseline and is not the Story 42.1 branch point.

## Required main CI

Run [`37213039428`](https://github.com/fad16papa/Cohestra/actions/runs/37213039428) on `776fd43c` — **5/5 success**

- .NET build and test
- API integration tests
- Next.js build
- UAT isolation contract
- Docker stack smoke

DigitalOcean Deploy run [`37213378618`](https://github.com/fad16papa/Cohestra/actions/runs/37213378618) is the existing classification **C** path (missing server host). Credentials and infrastructure were not modified. Production not claimed.

PR CI on #383 is not the close signal. Final-head PR CI was [`37212531413`](https://github.com/fad16papa/Cohestra/actions/runs/37212531413) on `d12e13e1` (6/6 including GitGuardian) before merge. Superseded commit `95f4251f` was not used.

## Focused post-merge tests on synchronized `main` `776fd43c`

Env: `E2E_LIVE_STACK=1 PUBLIC_BASE_URL=http://localhost:3000 E2E_API_BASE_URL=http://localhost:8080`

| Gate | Result |
| --- | --- |
| Website room-access / overlay / landmark / nav / Epic 37 motion Vitest | **38 passed** |
| `AdminSiteEntitlement` + `SiteIsolation` integration | **13 passed** including `CoreTenantB_LegitimateHostOperations_DoNotMutateCoreTenantA_Site` |
| `e2e/website-studio-42-1.spec.ts` | **10 passed** |
| `e2e/website-entitlement-38-2.spec.ts` | **2 passed** — Basic `plan_locked` / Core editor |
| `e2e/landmarks-38-5.spec.ts` | **4 passed** — skip, one main/h1, Website Studio embedded preview |
| `e2e/overlays-38-6.spec.ts` | **1 passed** |
| `e2e/desktop-shell-39-1.spec.ts` | **1 passed** — Website stays rail label, order unchanged |
| `e2e/mobile-nav-39-2.spec.ts` | **1 passed** — Website stays in More, no sixth dock tab |

Combined focused Playwright: **19 passed / 0 failed**. Earlier-story screenshots were not committed.

## Legitimate-host A/B isolation proof

`Cohestra.Api.IntegrationTests.SiteIsolationIntegrationTests.CoreTenantB_LegitimateHostOperations_DoNotMutateCoreTenantA_Site` — **passed** on synchronized `main`.

- Core tenant A and Core tenant B, each with a valid TenantOperator JWT on that tenant’s host.
- A writes unpublished `TENANT_A_*` markers. B writes unique live then unpublished `TENANT_B_*` markers.
- B GET/PUT/publish/revert on B’s host leave A’s admin body byte-equal.
- Public `GET /api/v1/public/site` on each host returns only that tenant’s published content.
- Host/JWT mismatch (`CoreTenantB_CannotReadOrUpdate_CoreTenantA_Site`) remains as an additional check.

## Tracker

- `42-1-website-studio-chrome-and-placement: done`
- `epic-42: in-progress`
- Stories 42.2–42.4 were not created and are not started
- Epic 43 was not created and is not started

## Deferred residuals

From four-layer review on `d12e13e1` — no unresolved BLOCKER or MAJOR:

- 390 Phone/Desktop/Fullscreen and mobile editor-rail Design/Sections/Templates remain under 44px — **MINOR / defer** (AC5 named Save, Publish, Revert, Edit, Preview; those meet 44×44)
- `visited` also suppresses the tour — **MINOR / defer** (pre-existing checklist contract; now tenant-scoped)
- Unused `shouldSkipWebsiteAdminFetch` — **NIT / defer**
- In-flight save/publish after a rare same-SPA slug change — **MINOR / defer**
- Preview tour step leaves workspace in Preview — **MINOR / accept**

## Composer 2.5

Not used. Grok 4.6 owned FINAL HEAD REVIEW, corrections, tests, security verification, merge, post-merge verification, CI triage, close, and reporting.
