# Brainstorm Intent — Billing Follow-ups & Sprint Housekeeping

**Date:** 2026-08-10  
**Topic:** Option #4 deferrals from PR #170 review + sprint retro action items  
**Goal:** Prioritize and shape the next billing polish + operator verification slice

---

## Converged direction

Treat this as **one billing trust epic-lite** (3 stories) plus **operator UAT housekeeping** (parallel, non-blocking).

Core principle: **cancel and resume must be symmetric with subscription schedules** — any path that mutates subscription end-state must reconcile Stripe schedule + tenant scheduled fields the same way.

---

## MoSCoW

### Must (ship before Epic 19 billing UAT — Story 19.4)

| ID | Story | Why |
|----|-------|-----|
| **B1** | **Interval-only cancel confirm copy** | Pro annual→monthly (same tier) shows no warning today; user cancels thinking only about Basic downgrade |
| **B2** | **Resume subscription + active schedule** | `Keep subscription` clears `cancel_at_period_end` but leaves paid downgrade schedule — silent downgrade still fires |
| **B3** | **Integration test: cancel-at-period-end with schedule** | Locks the #170 fix; prevents regression on the exact Stripe error |

### Should (same sprint, after Must)

| ID | Story | Why |
|----|-------|-----|
| **B4** | **Shared `hasPendingScheduleChange()` helper** | One predicate for checkout, settings banner, cancel/undo dialogs (plan OR interval) |
| **B5** | **Billing banner precedence copy** | When both cancel-at-end AND scheduled downgrade show, state which wins |
| **O1** | **Operator UAT mini-checklists** | Epic 21 Viber + Epic 24 activities — 30-min scripts for Docker verify |

### Could

| ID | Story | Why |
|----|-------|-----|
| **B6** | Email when schedule released due to cancel | Audit trail for operators |
| **H1** | Close draft brainstorm PRs #117–#126, #129, #131 | Repo hygiene; artifacts already on main |

### Won't (this slice)

- Full Stripe test-clock E2E suite
- CSP enforce / Epic 19 droplet work (separate track)

---

## Story sketches

### B1 — Interval-only cancel confirm warning

**Trigger:** `scheduledPlan === currentPlan` AND `scheduledBillingInterval` differs AND `scheduledPlanEffectiveAt` in future.

**Copy (Settings cancel dialog):**
> Your scheduled switch to {interval} billing will be cancelled — this action ends your paid subscription instead.

**AC:**
- Pro annual with scheduled Pro monthly → cancel confirm shows interval warning
- Pro→Core scheduled → existing plan warning unchanged
- No scheduled change → no extra sentence

**Files:** `in-app-billing-panel.tsx`, possibly extract helper next to `checkout-validation.ts`

---

### B2 — Resume subscription with active schedule

**Problem:** `ResumeSubscriptionAsync` → `UpdateSubscriptionCancelAtPeriodEndAsync(false)` skips schedule release. User clicks "Keep subscription" but downgrade schedule remains.

**Options brainstormed:**
1. **Mirror cancel (recommended):** On resume, if schedule exists AND user had cancel-at-end set, release schedule OR show confirm: "Keep Pro and undo scheduled Core switch?"
2. **Auto-release on resume:** Always release schedule when resuming from cancel-at-end (aggressive, may surprise users who wanted both)
3. **Block resume:** Force undo scheduled change first (bad UX)

**Recommended:** Option 1 variant — **if cancel-at-period-end was active, resume releases schedule and clears scheduled downgrade state** (same code path as cancel release). Rationale: user explicitly chose to *keep* current paid subscription; scheduled downgrade contradicts that intent.

**AC:**
- Pro + scheduled Core + cancel-at-end → Keep subscription → schedule cleared, cancel flag cleared, stays on Pro
- Pro + scheduled Core, no cancel-at-end → Keep subscription N/A (button hidden)
- Pro, no schedule → resume unchanged

**Files:** `StripeBillingService.UpdateSubscriptionCancelAtPeriodEndAsync` (extend `ShouldReleaseScheduleBeforeCancelAtPeriodEnd` logic for resume case OR separate branch)

---

### B3 — Integration test: cancel with schedule

**AC:**
- Seed tenant with mocked/stubbed Stripe subscription having `schedule_id`
- Call cancel-at-period-end API
- Assert schedule release invoked (mock) + `cancel_at_period_end=true` + tenant scheduled fields cleared

**Note:** May extend existing `BillingIntegrationTests` with Stripe mock handler pattern used elsewhere.

---

## Operator UAT scripts (O1)

**Epic 24 (15 min):**
1. Create activity at reg cap → list shows recovery chip
2. Bookmark `?status=at-cap` → filter persists on reload
3. Quick actions on card work

**Epic 21 (15 min):**
1. Client profile → Viber click-to-message opens correct deeplink
2. Log follow-up → status appears in timeline + dashboard coverage

---

## Suggested execution order

1. `bmad-create-story` → **B1** (smallest, pure FE)
2. `bmad-dev-story` B1
3. `bmad-create-story` → **B2** (backend symmetry)
4. `bmad-dev-story` B2 + **B3** test in same PR
5. Optional: **B4** helper extraction in same PR as B1
6. Operator runs **O1** checklists locally

---

## Downstream

- After B1–B3: `bmad-checkpoint-preview` on billing Settings flows
- Then Epic 19.4 Stripe billing UAT on droplet with confidence
- `bmad-help` → Epic 19 kickoff if droplet ready
