---
generated: 2026-07-29
project: cohestra
author: Correct Course workflow (Track B — P1 Launch Hardening)
status: approved
approved: 2026-07-29
awaiting_approval: false
baseline: main @ 21f17e3 — enterprise-launch-checklist merged (PR #25)
change_scope: moderate
issue_type: post-launch-hardening
---

# Sprint Change Proposal — P1 Launch Hardening (Epic 17)

## Section 1: Issue Summary

### Problem statement

Cohestra Enterprise feature delivery (Epics 11–16 v1) and the enterprise launch checklist (PR #25) are **complete**, but **P1 security hardening items** remain open from Epic 12–14 retrospectives and the launch checklist P1 backlog. These items do not block local/UAT sign-off documentation but **must ship before public production launch**.

### Triggering context

| Source | Finding |
|--------|---------|
| User choice (Track B) | After `bmad-next`, Francis chose **P1 hardening dev sprint** over Epic 16 parked pull-forward |
| `enterprise-launch-checklist.md` | P1 follow-ups documented: auth handoff, OTP throttling, Member JWT 403 matrix |
| Epic 14 retro (2026-07-29) | Auth handoff uses URL **hash** tokens — leaks to history/referrer; OTP verify lacks brute-force throttling |
| Epic 12 retro (2026-07-29) | Member→403 and tenant JWT→403 on `/platform/*` deferred from integration tests |
| `sprint-status.yaml` | Sprint queue empty post–launch-checklist; 9 open retro action items (Epics 11–15) |
| `deferred-work.md` | 14.3 review deferrals explicitly point to hardening pass |

### Evidence

**Auth handoff — tokens in URL hash (security risk):**

```16:22:web/lib/auth-handoff.ts
  const hash = new URLSearchParams({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
    expires_at: String(session.expiresAt),
  });
  url.hash = hash.toString();
```

Used after paid-plan signup verify → tenant checkout redirect (`signup-verify-page-content.tsx`).

**OTP verify — no attempt throttling:**

```416:421:src/Infrastructure/Signup/SelfServeSignupService.cs
        if (!await otpStore.ValidateAndConsumeAsync(email, OtpPurpose.EmailVerification, code, cancellationToken))
        {
            return SelfServeSignupResult<SignupVerifyEmailResponse>.Fail(
                SelfServeSignupError.Validation,
                "Invalid or expired verification code.");
        }
```

Signup IP rate limits count **successful creates only** — verify endpoint is brute-forceable.

**Authz integration matrix — unit tests only:**

Epic 12 retro action #1: live-stack Member JWT → 403 on admin routes; tenant JWT → 403 on `/platform/*` — deferred with policy unit tests as substitute.

### Issue type

**Post-MVP hardening sprint** — additive Epic 17; no rollback of Epics 11–16 or launch checklist work.

---

## Section 2: Impact Analysis

### Epic impact

| Epic | Status | Impact |
|------|--------|--------|
| Epics 1–16 v1 | done | **No changes** — foundation retained |
| enterprise-launch-checklist | done | **Reference only** — P1 items triaged into Epic 17 |
| **Epic 17 (new)** | backlog | **P1 Launch Hardening** — 3 stories (see Section 4) |
| Epic 16 parked | parked | **Unchanged** — custom domain, tickets, etc. stay parked |

### Story impact

| Story | Scope | Maps to retro / checklist |
|-------|-------|---------------------------|
| **17.1** Auth handoff code exchange | API + web signup→checkout flow | Epic 14 retro #1; checklist P1 auth handoff |
| **17.2** OTP verify throttling + abuse tests | Redis counter + integration tests | Epic 14 retro #3; checklist P1 OTP; deferred-work 14.3 |
| **17.3** Member JWT 403 integration matrix | Api.IntegrationTests authz cases | Epic 12 retro #1; checklist P1 Member 403 |

**Out of Epic 17 (remain open / ops):**

- reCAPTCHA enable in prod compose (Ops — documented in checklist)
- GitHub branch protection SM-1 (Ops)
- nip.io apex tightening (Product gate)
- Platform async-action refactor (Epic 11 retro — P2)
- Skippable platform integration tests (Epic 11 retro — P2)

### Artifact conflicts

| Artifact | Action |
|----------|--------|
| `epics-cohestra-enterprise.md` | Append **Epic 17** with 3 stories |
| `sprint-status.yaml` | Add epic-17 + stories; mark epic-17 `in-progress` when 17-1 story file created |
| `enterprise-launch-checklist.md` | No edit in this sprint — stories will flip checklist P1 boxes when done |
| PRD / Architecture | **No change** — hardening satisfies existing FR-26 / SM-1 / auth patterns |

### Technical impact

| Component | Change |
|-----------|--------|
| `web/lib/auth-handoff.ts` | Replace hash tokens with `?handoff=` code + exchange API call |
| `SelfServeSignupService` / Auth | New Redis-backed one-time handoff store; optional handoff code in verify response |
| `PublicSignupController` / `AuthController` | Handoff issue + exchange endpoints |
| Signup verify | Redis attempt counter per email+IP |
| `Api.IntegrationTests` | Abuse + authz matrix cases |

**Rollback assessment:** Not applicable — additive hardening; hash handoff can remain as fallback only if migration requires (prefer clean removal).

---

## Section 3: Recommended Approach

### Chosen path: **Direct Adjustment** — new Epic 17 within existing plan

Add Epic 17 as a focused P1 hardening epic. Work stories **17.1 → 17.2 → 17.3** sequentially (17.1 unblocks paid signup security; 17.2 closes abuse gap; 17.3 closes authz evidence gap for launch).

### Rationale

- Launch checklist explicitly deferred these as **separate stories** — scope was correct.
- No PRD or architecture replan needed — patterns exist (Redis OTP store, SM-1 integration tests, TenantAuthPolicies).
- Moderate scope: backlog reorganization + 3 implementation stories; Developer agent can execute.

### Risk assessment

| Risk | Mitigation |
|------|------------|
| Handoff exchange open redirect | Bind code to tenant slug + Host; short TTL; single-use |
| Breaking paid signup→checkout flow | Keep Basic path unchanged; integration test happy path |
| Integration test flakiness | Reuse IntegrationTestWebApplicationFactory patterns from PR #25 |

---

## Section 4: Detailed Change Proposals

### Epic 17 — P1 Launch Hardening

**Goal:** Close P1 security gaps from enterprise launch checklist and Epics 12–14 retros before public production launch.

**FRs / NFRs touched:** FR-26 (abuse controls), SM-1 (isolation evidence extension for authz), auth security NFR.

#### Story 17.1: Auth handoff one-time code exchange

Replace URL-hash JWT handoff (post signup verify → Core/Pro checkout) with a server-issued one-time code exchanged via API on the tenant checkout page.

#### Story 17.2: OTP verify brute-force throttling and signup abuse tests

Add Redis-backed verify-attempt limits on public signup verify; extend integration tests for captcha reject, 429 signup limit, registrationClosed, OTP throttling.

#### Story 17.3: Member JWT 403 integration matrix

Add live-stack integration tests: TenantMember JWT → 403 on admin-only routes; tenant-scoped JWT → 403 on `/platform/*`.

---

## Section 5: Implementation Handoff

### Scope classification: **Moderate**

- Backlog: Epic 17 added to epics + sprint-status
- Implementation: Developer agent (`bmad-dev-story`) per story
- Review: `bmad-code-review` after each story

### Handoff recipients

| Role | Responsibility |
|------|----------------|
| Developer (Amelia) | Story 17.1 → 17.2 → 17.3 implementation |
| Test Architect (Murat) | Validate integration coverage on 17.2 / 17.3 |
| Ops | reCAPTCHA keys + branch protection (parallel, not blocking dev) |

### Success criteria

- [ ] Paid signup → checkout flow works without tokens in URL hash or browser history
- [ ] OTP verify endpoint rate-limited; abuse cases in CI
- [ ] Member/platform authz matrix green in integration job
- [ ] Epic 14 retro action items #1 and #3 marked done in sprint-status
- [ ] Epic 12 retro action item #1 marked done in sprint-status

---

**Correct Course workflow complete.** Next: `bmad-create-story` for `17-1-auth-handoff-code-exchange`, then `bmad-dev-story`.
