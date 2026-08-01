---
generated: 2026-08-01
project: cohestra
author: Correct Course workflow (Track C — Production Launch Sign-off)
status: approved
approved: 2026-08-01
awaiting_approval: false
baseline: main @ a866f7e — Epic 18 done; Francis local launch checklist §1–3 signed off
change_scope: moderate
issue_type: post-hardening-launch-gates
---

# Sprint Change Proposal — Production Launch Sign-off (Epic 19)

## Section 1: Issue Summary

### Problem statement

Cohestra Enterprise **dev hardening is complete** (Epics 17–18 on `main`), and Francis has **signed off local Docker UAT** for launch checklist **§1–§3** (smoke, security headers/CSP, signup OTP flows). **Public production launch** remains blocked by **ops and droplet gates** in checklist **§4–§7**: billing verification, UAT droplet deploy, HTTPS edge, reCAPTCHA in prod env, SendGrid, and full operator flows on a live stack.

### Triggering context

| Source | Finding |
|--------|---------|
| User choice (Track C) | After local §1–§3 pass, Francis chose **Correct Course → Epic 19** over CSP enforce-mode or Epic 16 parked pull-forward |
| `enterprise-launch-checklist.md` | §1–§3 operator sign-off recorded 2026-08-01; §4–§7 and droplet row still open |
| Epic 18 retro (2026-08-01) | reCAPTCHA before public signup (ops); CSP enforce deferred; httpOnly sessions deferred |
| Epic 17 open action | Regenerate `active-ssl.conf` on droplet after header template changes |
| `sprint-status.yaml` | No Epic 19 defined; Epic 18 retrospective done |

### Evidence

**Local sign-off complete:**

- Smoke script: 10 pass / 0 fail / 4 skip (no published activity on default — acceptable)
- Headers/CSP curl verified on `default.localhost:8088`
- Signup OTP + verify UX validated (Stories 17.1–18.1)

**Launch checklist still open (representative):**

- §3: reCAPTCHA enabled before public signup
- §4: Stripe webhook, price IDs, trial jobs on UAT
- §5: Droplet, firewall, DNS, `docker-compose.uat.yml`, HTTPS, SendGrid, prod seed flags
- §6: Branch protection SM-1; product gates (nip.io, sender UI)
- §7: Core operator flows on Basic + Pro tenant on **live** stack

### Issue type

**Post-hardening launch sprint** — additive Epic 19; no rollback of Epics 11–18.

---

## Section 2: Impact Analysis

### Epic impact

| Epic | Status | Impact |
|------|--------|--------|
| Epics 1–18 | done | **No code changes required** for launch gates — foundation retained |
| enterprise-launch-checklist | in use | **Execution target** — §4–§7 on UAT droplet |
| **Epic 19 (new)** | backlog | **Production Launch Sign-off** — 5 stories (see Section 4) |
| Epic 16 parked | parked | **Unchanged** |
| CSP enforce / httpOnly | deferred | **Epic 20+ candidates** — not blocking first public launch |

### Story impact

| Area | Change |
|------|--------|
| Deploy / ops | Primary — droplet, HTTPS, env secrets, SendGrid |
| Billing | Stripe UAT verification on live URL |
| Signup | reCAPTCHA enablement on UAT/prod compose |
| Operator UAT | §7 flows + sign-off table completion |

### Artifact conflicts

| Artifact | Update |
|----------|--------|
| `epics-cohestra-enterprise.md` | Add Epic 18 summary (done) + Epic 19 definition |
| `sprint-status.yaml` | Add `epic-19` + stories 19.1–19.5 |
| `enterprise-launch-checklist.md` | Updated during stories as evidence recorded (no structural change required) |

### Technical impact

- Mostly **ops/operator** work on existing `docker-compose.uat.yml`, nginx SSL templates, `.env.uat.example`
- Possible **minor dev** tweaks if uat-smoke or deploy docs need gaps filled during 19.1
- **No new product features** in Epic 19 scope

---

## Section 3: Recommended Approach

### Chosen path: **Direct Adjustment** — new Epic 19

Add Epic 19 to backlog and execute stories **19.1 → 19.5** in order. Dev hardening (17–18) stays closed; launch checklist becomes the acceptance oracle.

### Rationale

- Local Docker proved application health; remaining risk is **deployment edge** and **live integrations** (Stripe, SendGrid, reCAPTCHA, HTTPS).
- Splitting ops vs operator stories keeps ownership clear (Ops vs Francis vs Dev doc fixes).

### Risk assessment

| Risk | Mitigation |
|------|------------|
| Droplet env misconfiguration | Follow `digitalocean-uat.md` + `.env.uat.example`; run `uat-smoke.sh` before UAT |
| reCAPTCHA blocks dev testing | Keep test bypass documented for non-prod only; prod requires real keys |
| HTTPS header regression | Story 19.2 explicitly curls HSTS + CSP on HTTPS after `active-ssl.conf` regen |
| Scope creep into CSP enforce | Explicitly deferred to future epic |

### Scope classification: **Moderate**

Backlog reorganization + mostly ops/operator execution; Developer agent for doc/script gaps and story files.

---

## Section 4: Detailed Change Proposals

### Epic 19 — Production Launch Sign-off

**Goal:** Close enterprise launch checklist **§4–§7** on UAT droplet and record operator/PM sign-off for public launch readiness.

**Prerequisite:** Epic 18 done; local checklist **§1–§3** signed off (Francis, 2026-08-01).

**Not in scope:** CSP enforce mode, httpOnly sessions, Epic 16 parked items, sender settings UI (product gate only).

#### Story 19.1: UAT droplet deploy and stack smoke

Deploy Cohestra to UAT droplet using `docker-compose.uat.yml`; prove `/ready`, nginx entry, and `deploy/uat-smoke.sh` green. Document firewall, DNS, and prod seed flags.

#### Story 19.2: HTTPS edge and security header verify

Regenerate `active-ssl.conf` from `app-ssl.conf.template`; verify single security headers + CSP report-only + HSTS on HTTPS public URL (Epic 17/18 edge ownership).

#### Story 19.3: reCAPTCHA production enablement

Enable reCAPTCHA in UAT/prod `.env`; rebuild web; apex signup shows widget and completes flow. Closes checklist §3 reCAPTCHA gates.

#### Story 19.4: Stripe billing UAT on droplet

Configure Stripe test keys, webhook secret, price IDs; run test checkout; verify webhook and trial/delinquency job logs. Closes checklist §4.

#### Story 19.5: Operator core flows and launch sign-off

Execute checklist §7 on Basic + Pro tenant on live UAT URL; complete SendGrid domain auth if sending mail; fill Operator + PM rows in sign-off table.

**Parallel ops (not blocking epic closure but tracked):**

- GitHub branch protection requiring SM-1 checks (Epic 13 retro)
- Product gates: nip.io vs wildcard DNS; sender settings UI defer

---

## Section 5: Implementation Handoff

### Handoff recipients

| Role | Responsibility |
|------|----------------|
| Ops | Stories 19.1, 19.2, 19.3, 19.4 infrastructure and secrets |
| Operator (Francis) | Story 19.5 UAT flows + sign-off table |
| Developer (Amelia) | Story files, doc gaps, minor script fixes from 19.1 |
| Product | Product gates in §6 (parallel) |

### Success criteria

- [ ] UAT droplet stack healthy; `uat-smoke.sh` passes on public URL
- [ ] HTTPS curl shows single security headers + CSP report-only + HSTS
- [ ] reCAPTCHA enabled on public signup path
- [ ] Stripe test checkout + webhook verified
- [ ] Checklist §7 flows signed off on Basic + Pro tenant
- [ ] Operator + PM rows filled in `enterprise-launch-checklist.md` sign-off table
- [ ] Epic 18 action item "Enable reCAPTCHA keys" marked done

### Next workflow steps

1. `bmad-create-story` for `19-1-uat-droplet-deploy-and-smoke`
2. `bmad-dev-story` or ops runbook execution per story
3. `bmad-sprint-planning` optional refresh after Epic 19 kickoff

---

**Correct Course workflow complete.** Epic 19 approved for backlog entry.
