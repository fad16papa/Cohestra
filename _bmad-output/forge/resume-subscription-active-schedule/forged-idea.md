# Forged Idea — B2: Resume Subscription + Active Schedule

**Status:** HARDENED (revised from brainstorm Option 1)  
**Date:** 2026-08-10

---

## Killed

| Idea | Why dead |
|------|----------|
| **Auto-release schedule on every resume** | Breaks **cancel-then-schedule** path: user cancels to Basic, schedules Core instead, clicks Keep subscription — they want Core at period end, not Pro forever. Releasing schedule destroys their chosen downgrade. |
| **Block resume until schedule undone** | Punishes users fixing an accidental cancel; forces extra step when Keep subscription is the obvious undo. |
| **Resume = mirror cancel (same release path)** | Cancel and resume are not symmetric opposites. Cancel *ends* paid subscription (Basic). Resume *continues* paid subscription. Schedule is compatible with resume, incompatible with cancel-to-Basic intent. |

---

## Locked

### 1. Dual state is real (post-#170)

**Path:** Cancel at period end first → `cancel_at_period_end=true` → user schedules Pro→Core via checkout → Stripe has **both** cancel flag and active schedule. `ScheduleDowngradeExistingSubscriptionAsync` does not clear cancel flag today.

**UI today:** Both banners can show. Keep subscription is one click, no confirm.

### 2. Resume clears cancel only — never auto-releases schedule

`UpdateSubscriptionCancelAtPeriodEndAsync(false)` must **not** release schedule.

**Resume outcome when schedule active:** Stay on current plan until period end; scheduled paid change still applies.

### 3. Prevent dual state at source (backend — primary fix)

When scheduling a paid downgrade/interval change in `ScheduleDowngradeExistingSubscriptionAsync`:

- If loaded subscription has `CancelAtPeriodEnd == true`, **clear it in Stripe first** (`cancel_at_period_end=false`) before creating schedule.
- Clear tenant `ScheduledPlan=Basic` artifacts via `ApplySubscription` refresh.
- Rationale: choosing a paid plan change contradicts cancel-to-Basic intent.

### 4. Confirm dialog on Keep subscription when schedule active (frontend — secondary fix)

If `cancelAtPeriodEnd && hasPendingPaidScheduleChange` (plan OR interval):

> You're keeping your paid subscription active. Your scheduled switch to **{plan/interval}** on **{date}** will still apply at period end.

Primary button: **Keep subscription**  
No schedule release.

Handles any dual state not caught by (3) — webhooks, legacy rows, race.

### 5. Orphan tenant schedule cleanup on resume (tertiary)

If Stripe `subscription.ScheduleId` is null but tenant has stale scheduled fields (same pattern as cancel path `else if` branch), clear tenant state on resume — do not call release.

### 6. Tests

| Case | Expect |
|------|--------|
| Cancel → schedule Core → resume | cancel cleared, schedule intact, confirm shown |
| Schedule Core → cancel (#170) | schedule released on cancel; resume N/A until cancel set |
| Resume, no schedule | unchanged behavior |
| Schedule while cancel pending | cancel flag cleared at schedule time (fix 3) |

---

## Not in B2 scope

- Email on schedule/cancel interaction (B6)
- Banner precedence copy alone without confirm (B5 — can ship with B2 confirm)
- Integration test belongs in B3 (extend for resume path)

---

## Downstream

→ `bmad-create-story` B2 with locks 3–6  
→ Ship with B1 (interval confirm) in same billing-trust PR if small  
→ `bmad-checkpoint-preview` dual-state flows
