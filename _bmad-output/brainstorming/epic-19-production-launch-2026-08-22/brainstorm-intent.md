# Epic 19 brainstorm intent — Production Launch Sign-off

**Date:** 2026-08-22  
**Mode:** Party + Creative Partner brainstorming  
**Goal:** Execution plan, risk map, and story sequencing for Epic 19 (droplet UAT → operator sign-off)  
**Oracle:** `docs/deploy/enterprise-launch-checklist.md` + stories 19.1–19.5

## Current state (2026-08-22)

| Story | Status | Notes |
|-------|--------|-------|
| 19.0 | Dev mostly done | Preflight, header verify, CI docker smoke, catalog backfill on main |
| 19.1 | in-progress | Droplet deploy + `uat-smoke.sh --full` |
| 19.2 | in-progress | HTTPS + security headers on live edge |
| 19.3 | backlog | reCAPTCHA production enablement |
| 19.4 | backlog | Stripe billing UAT on droplet |
| 19.5 | backlog | Operator §7 flows + sign-off table |

**Local Docker:** Operator verified Epic 25 (Design tab + public presets). P1 hardening (17–18) shipped. Epics 26–28 (support/platform ops) on main.

**Not in Epic 19 scope:** CSP enforce-mode toggle (already enforce on main), sender settings UI, Epic 16 parked items, new product features.

## Converged path — "Evidence ladder"

Run stories **in order**; each story produces **dated evidence** (URL + command output + screenshot note) before the next starts.

```
19.1 stack alive ──► 19.2 HTTPS trustworthy ──► 19.3 signup hardened ──► 19.4 money path ──► 19.5 human sign-off
```

### Story 19.1 — UAT droplet deploy and stack smoke

**Job:** Prove production topology works before touching abuse/billing.

**Minimum evidence bundle:**
1. Droplet provisioned (DO firewall 22/80/443)
2. `.env` from `.env.uat.example` — strong secrets, seeds off, no `DEV_TENANT_SLUG`
3. `docker compose -f docker-compose.uat.yml up -d --build` green
4. `PUBLIC_BASE_URL=… SMOKE_TENANT_HOST=… bash deploy/uat-smoke.sh --full` exit 0
5. `curl ${PUBLIC_BASE_URL}/ready` healthy

**Brainstorm additions:**
- **Two-tenant bootstrap:** Seed `creativorare` (Pro) + one Basic tenant on first deploy — unblocks 19.5 without re-seeding mid-epic
- **DNS decision gate upfront:** Wildcard `*.cohestra.app` vs nip.io interim — pick one before 19.2; document in sign-off notes
- **Migration smoke:** Confirm Epic 28 + expiration migrations applied (`AddPlatformOpsConsoleEpic28`, `AddActivityScheduledStartsAt`)

### Story 19.2 — HTTPS edge and security header verify

**Job:** Browser-trustworthy URL for Stripe webhooks, reCAPTCHA, and operator UAT.

**Minimum evidence bundle:**
1. `active-ssl.conf` regenerated from `app-ssl.conf.template`; nginx reloaded
2. `bash deploy/verify-security-headers.sh https://{tenant-host}` — single CSP, HSTS present
3. HTTP → HTTPS redirect confirmed (or documented nip.io exception)

**Brainstorm additions:**
- **Run header verify on three hosts:** tenant subdomain, apex marketing, `/platform/login`
- **CSP console check:** Login + dashboard + public registration with DevTools — no blocked scripts after HTTPS cutover
- **Pair with 19.1:** Don't enable reCAPTCHA until HTTPS stable (widget + apex cookies)

### Story 19.3 — reCAPTCHA production enablement

**Job:** Close checklist §3 abuse gate before public signup.

**Minimum evidence bundle:**
1. `bash deploy/preflight-launch.sh --strict-recaptcha` pass on server
2. Web rebuilt with `NEXT_PUBLIC_RECAPTCHA_*`
3. Apex signup → OTP verify E2E on **live HTTPS URL** (screenshot + date in sign-off)

**Brainstorm additions:**
- **Fail-closed test:** Submit signup with reCAPTCHA disabled in env — must reject (proves gate is real)
- **OTP window cheat sheet:** Print 3-send vs 5-resend limits near operator keyboard during UAT
- **Redis dependency:** Confirm rate limiters fail closed (503) if Redis stopped — already Story 18.4; one negative test on droplet

### Story 19.4 — Stripe billing UAT on droplet

**Job:** Money path works on live URL with test keys.

**Minimum evidence bundle:**
1. Stripe Dashboard webhook endpoint → droplet HTTPS URL; secret in `.env`
2. Test checkout Core or Pro → plan reflects in tenant API/door
3. Webhook delivery 200 in Stripe Dashboard
4. Delinquency/trial job logs after test event (Epic 14.8 — no silent failures)

**Brainstorm additions:**
- **Pre-flight billing smoke script idea:** `deploy/billing-smoke.sh` — create checkout session, poll tenant plan (future; manual OK for 19.4)
- **Use Pro tenant from 19.1 bootstrap** for checkout; Basic tenant for plan-gate negative test
- **Customer Portal return URL** must use HTTPS tenant host — common footgun

### Story 19.5 — Operator core flows and launch sign-off

**Job:** Human proof §7 + sign-off table.

**Minimum evidence bundle:**
1. Basic + Pro tenant each run §7 checklist (7 flows)
2. Campaign send with SendGrid domain auth (or documented product defer)
3. `enterprise-launch-checklist.md` sign-off table — Operator + PM rows filled with droplet URL + date
4. Open product gates listed with owner (nip.io tightening, sender settings UI)

**Brainstorm additions:**
- **Record a 10-min screen capture** of happy-path: create activity → publish → register → client appears (stakeholder artifact)
- **Include post-Epic-25 flows:** Design tab preset on live URL during §7 item 3
- **Include activity expiration smoke:** past-due badge + auto-archive email (optional but high confidence)
- **Platform ops smoke (Epic 28):** `/platform/support` inbox — one issue submitted from Settings Help

## Risk register (party synthesis)

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `SMOKE_TENANT_HOST` missing on apex URL | High | 19.1 false pass | Checklist + smoke script already warn; verify in 19.1 evidence |
| Web not rebuilt after env change | High | 19.3 reCAPTCHA invisible | Document `docker compose build web --no-cache` in story tasks |
| Stripe webhook URL HTTP not HTTPS | Med | 19.4 silent fail | Block 19.4 start until 19.2 done |
| SendGrid not domain-authed | Med | 19.5 campaign N/A | Decide defer vs block sign-off upfront |
| Operator fatigue on §7 | Med | Skipped flows | Split Basic vs Pro across two sessions; checkbox doc |
| Branch protection still open (Epic 13 retro) | Low | Process gap | Ops task parallel to 19.1 — not story blocker |

## Parallel work (does not block 19.1)

- GitHub branch protection for SM-1 (Ops)
- Close stale draft brainstorm PRs
- Sender settings UI product gate decision
- nip.io vs wildcard DNS product gate

## Recommended next BMad steps

1. **`bmad-create-story`** — refresh story file for **19-1** (or validate if exists) with evidence bundle AC
2. **`bmad-dev-story`** — only if automation gaps found during droplet deploy (prefer ops execution first)
3. After 19.1 evidence captured → **`bmad-create-story` 19-3** (can prep while 19.2 runs)
4. **`bmad-sprint-status`** after 19.1 moves to `review` or `done`

## Decision

**Path:** Controlled UAT on droplet with evidence ladder — same as 2026-08-11 converge, updated for Epics 25–28 + activity expiration on main. No public SaaS marketing push until 19.5 sign-off complete.

**Launch posture:** Self-serve signup with reCAPTCHA on HTTPS UAT → operator §7 sign-off → then production cutover (live Stripe keys separate decision).
