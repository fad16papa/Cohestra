---
baseline_commit: 21f17e3
epic: 17
story: 1
---

# Story 17.1: Auth handoff one-time code exchange

Status: ready-for-dev

<!-- Ultimate context engine analysis completed - comprehensive developer guide created -->

## Story

As a **Tenant Admin completing paid signup (Core/Pro)**,
I want **my session passed to tenant checkout via a one-time server code instead of JWTs in the URL hash**,
So that **tokens never appear in browser history, referrer headers, or server access logs**.

## Acceptance Criteria

1. **Given** successful signup email verification on a Core/Pro plan path  
   **When** the client redirects to `{tenant}/billing/checkout`  
   **Then** the redirect URL contains a short-lived `handoff` query code only — **no** `access_token`, `refresh_token`, or `expires_at` in the URL hash or query

2. **Given** a valid unused handoff code on the correct tenant Host  
   **When** `POST /api/v1/auth/handoff/exchange` is called with the code  
   **Then** the API returns a normal `AuthTokenResponse` (access + refresh + expiry)  
   **And** the code is consumed (single-use)

3. **Given** an expired, reused, or unknown handoff code  
   **When** exchange is attempted  
   **Then** the API returns 400 with ProblemDetails (no token leak)

4. **Given** a handoff code issued for tenant A  
   **When** exchange is attempted on tenant B Host  
   **Then** the API returns 400/403 fail-closed

5. **Given** Basic (free) signup verify success  
   **When** the user is redirected to the tenant dashboard  
   **Then** existing direct session behavior is unchanged (no handoff code required)

6. **Given** the legacy hash-based handoff implementation  
   **When** this story ships  
   **Then** the paid signup→checkout path uses code exchange only; remove hash token handoff from active paid flow (delete or leave unused with no callers)

## Tasks / Subtasks

- [ ] **Task 1 — Server handoff store + contracts** (AC: 2, 3, 4)
  - [ ] 1.1 Add `IAuthHandoffStore` in Application/Auth (CreateAsync, ExchangeAsync — single-use, TTL ~120s)
  - [ ] 1.2 Implement `RedisAuthHandoffStore` — key `auth:handoff:{code}`; payload binds `tenantId`, `tenantSlug`, issued tokens (or re-issue via existing `IssueTokensAsync` pattern)
  - [ ] 1.3 Add contracts: `AuthHandoffExchangeRequest`, extend `SignupVerifyEmailResponse` with optional `HandoffCode` + `HandoffExpiresInSeconds` (omit tokens when handoff issued)
  - [ ] 1.4 Register in `DependencyInjection.cs`

- [ ] **Task 2 — Verify + exchange API** (AC: 1–5)
  - [ ] 2.1 Extend `SignupVerifyEmailRequest` with optional `ForCheckout: bool` (or equivalent)
  - [ ] 2.2 In `SelfServeSignupService.VerifyEmailAsync`: when `ForCheckout=true`, issue handoff code instead of returning tokens in response
  - [ ] 2.3 Add `POST /api/v1/auth/handoff/exchange` on `AuthController` — validate tenant Host via `CurrentTenant` / resolved slug matches stored binding
  - [ ] 2.4 Add `/api/v1/auth/handoff/exchange` to appropriate tenant-resolution path (tenant Host required; not marketing apex skip)
  - [ ] 2.5 Map failures to ProblemDetails; use generic "Invalid or expired handoff code" message

- [ ] **Task 3 — Web paid signup→checkout flow** (AC: 1, 5, 6)
  - [ ] 3.1 Update `verifySignupEmail` in `web/lib/signup/signup-api.ts` to pass `forCheckout: true` when plan is core/pro
  - [ ] 3.2 Replace `buildAuthHandoffUrl` usage in `signup-verify-page-content.tsx` with redirect to `{tenantBase}/billing/checkout?handoff={code}&plan=...&interval=...&start=1`
  - [ ] 3.3 Add `exchangeAuthHandoff(code)` in `web/lib/auth-handoff.ts` (or `auth-api.ts`) calling exchange endpoint on tenant Host
  - [ ] 3.4 Update `checkout-page-content.tsx`: on mount, if `handoff` query param present, exchange → `setAuthSession` → `replaceState` strip param (remove `consumeAuthHandoffFromHash` from active path)
  - [ ] 3.5 Basic path unchanged: verify returns tokens → `setAuthSession` → dashboard redirect

- [ ] **Task 4 — Tests** (AC: 2–4)
  - [ ] 4.1 Unit tests: handoff store create/consume/TTL/wrong-tenant
  - [ ] 4.2 Integration test: signup verify (forCheckout) → exchange on tenant Host → 200 + tokens; second exchange → 400
  - [ ] 4.3 Integration test: exchange on wrong tenant Host → fail-closed
  - [ ] 4.4 Verify no regression: Basic signup verify still returns tokens directly

- [ ] **Task 5 — Docs + sprint hygiene**
  - [ ] 5.1 Update `docs/deploy/enterprise-launch-checklist.md` P1 auth handoff row when done (dev-story completion)
  - [ ] 5.2 Mark Epic 14 retro action item (auth handoff) done in sprint-status when story completes

## Dev Notes

### Problem being solved

Epic 14 deferred replacing URL-hash JWT handoff. Current flow after paid signup verify:

```68:76:web/components/legal/signup-verify-page-content.tsx
    const isPaidPlan = plan === "core" || plan === "pro";
    if (isPaidPlan) {
      const tenantBase = buildTenantDashboardUrl(tenantSlug).replace(/\/dashboard$/, "");
      window.location.href = buildAuthHandoffUrl(tenantBase, session, "/billing/checkout", {
        plan: plan!,
        interval,
        start: "1",
      });
```

`buildAuthHandoffUrl` puts JWTs in `url.hash` — visible in browser history and potentially referrer on subresource requests.

### Recommended implementation design

**Verify path split:**

| Path | Request flag | Response | Web action |
|------|--------------|----------|------------|
| Basic free | `forCheckout: false` (default) | `accessToken`, `refreshToken`, `expiresInSeconds`, `tenantSlug` | `setAuthSession` → dashboard |
| Core/Pro checkout | `forCheckout: true` | `handoffCode`, `handoffExpiresInSeconds`, `tenantSlug` — **no tokens** | Redirect with `?handoff=` only |

**Exchange endpoint:**

- `POST /api/v1/auth/handoff/exchange` body: `{ "code": "..." }`
- Must run on **tenant subdomain Host** (e.g. `creativorare.localhost:8088`) so `TenantResolutionMiddleware` resolves tenant
- Service validates stored `tenantId` matches resolved tenant; consumes code atomically (Redis GET+DEL or Lua)
- Returns existing `AuthTokenResponse` shape for web compatibility

**Redis pattern:** Follow `RedisOtpStore` — cryptographically random code (32 bytes hex), HMAC or direct storage with short TTL, single-use delete on success.

**Token issuance:** Reuse existing refresh token store pattern from `SelfServeSignupService.IssueTokensAsync` — store refresh in Redis, embed in handoff payload or re-issue on exchange (prefer store tokens at handoff creation time to avoid double refresh rows).

### Files to read before coding

| File | Why |
|------|-----|
| `web/lib/auth-handoff.ts` | Current hash handoff — replace paid path |
| `web/components/legal/signup-verify-page-content.tsx` | Paid redirect caller |
| `web/components/billing/checkout-page-content.tsx` | Hash consumer — switch to exchange |
| `web/lib/signup/signup-api.ts` | Verify API wrapper + types |
| `src/Infrastructure/Signup/SelfServeSignupService.cs` | Verify + `IssueTokensAsync` |
| `src/Api/Controllers/V1/PublicSignupController.cs` | Verify endpoint |
| `src/Api/Controllers/V1/AuthController.cs` | Add exchange endpoint |
| `src/Infrastructure/Auth/RedisOtpStore.cs` | Redis single-use TTL pattern |
| `src/Infrastructure/Tenancy/TenantResolutionMiddleware.cs` | Auth path skip list — add exchange appropriately |
| `src/Infrastructure/Auth/AuthService.cs` | `IssueTokensAsync` / refresh store |
| `src/Contracts/Auth/AuthTokenResponse.cs` | Response contract |
| `src/Api.IntegrationTests/PublicSignupIntegrationTests.cs` | Signup test patterns |

### Architecture compliance

- **Contracts:** DTOs in `src/Contracts/` only — no EF entities in API responses
- **ProblemDetails:** All errors via ProblemDetails; include `errorCode` extension where existing signup/auth patterns do
- **Tenancy:** Exchange must fail-closed on Host mismatch (SM-1 spirit) — code bound to tenant
- **No tokens in URLs:** AC explicitly forbids hash **and** query token params; only opaque `handoff` code in query
- **Layering:** Store interface in Application; Redis impl in Infrastructure; thin controller

### Testing requirements

- **Infrastructure.Tests:** Handoff store unit tests (create, consume, expired, wrong tenant)
- **Api.IntegrationTests:** End-to-end verify→exchange happy path; reuse factory Postgres/Redis settings from `IntegrationTestWebApplicationFactory`
- **Web:** `npm run build` must pass; no new env vars required
- **Do not skip** integration tests when stack available — follow `TenantIsolationApiTests` SkippableFact pattern only if Redis/Postgres unreachable

### Security guardrails

- Handoff code entropy: minimum 128 bits (`RandomNumberGenerator.GetBytes(16)` → hex)
- TTL: 60–120 seconds (configurable via `AuthHandoffOptions`)
- Single-use: delete key before returning tokens (prevent race with Redis transaction)
- Generic error messages on exchange failure (no oracle whether code existed vs expired vs wrong tenant)
- Do **not** log handoff codes or tokens

### Previous story intelligence

- **Enterprise launch checklist (done):** Explicitly scoped auth handoff out — "Separate story" in P0 vs P1 table. Do not expand into OTP throttling (Story 17.2) or Member 403 matrix (Story 17.3).
- **Story 14.3:** Verify already issues tokens via `IssueTokensAsync`; paid checkout handoff was deferred with hash workaround.
- **Epic 14 retro #1:** Success = tokens not in browser history/referrer.

### Git intelligence

Recent work on `main` (PR #25): SM-1 public door isolation tests, integration test README, Pro bootstrap docs. Follow same integration test conventions (`Category=TenantIsolation`, Development env, SendGrid sandbox).

### Latest tech information

- Next.js 16 App Router — use `window.location.replace` after exchange to strip sensitive query params (existing checkout pattern)
- Redis `StringSet` with TTL + conditional delete — same StackExchange.Redis 2.8.x as OTP store
- No new npm packages required

### Project structure notes

- New files likely under:
  - `src/Application/Auth/IAuthHandoffStore.cs`
  - `src/Infrastructure/Auth/RedisAuthHandoffStore.cs`
  - `src/Infrastructure/Auth/AuthHandoffOptions.cs`
  - `src/Contracts/Auth/AuthHandoffContracts.cs`
- Web: modify existing `auth-handoff.ts` rather than new module unless exchange API grows

### References

- [Source: `_bmad-output/planning-artifacts/epics-cohestra-enterprise.md` — Epic 17 Story 17.1]
- [Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-07-29.md`]
- [Source: `_bmad-output/implementation-artifacts/epic-14-retro-2026-07-29.md` — Action #1]
- [Source: `docs/deploy/enterprise-launch-checklist.md` — P1 auth handoff row]
- [Source: `_bmad-output/project-context.md` — Testing Rules, ProblemDetails, tenancy]

## Dev Agent Record

### Agent Model Used

Cursor Composer (cloud agent — create-story)

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2026-07-29: Story 17.1 created — P1 auth handoff code exchange; status → ready-for-dev

### Story completion status

ready-for-dev — Ultimate context engine analysis completed; await `bmad-dev-story` implementation.
