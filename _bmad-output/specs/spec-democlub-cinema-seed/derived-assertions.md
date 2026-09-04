# Derived assertions

Every cinema number is a **function of fixtures**. UI and FeelingCopy may display the result; they must not invent a second source of truth.

## Locked headlines (must compute)

| Assertion | Definition (derive, don’t hardcode independently) |
|-----------|-----------------------------------------------------|
| **34 going · 8 spots left** | Upcoming Golden Hour Run (Fri Sep 11): `activeRegistrations == 34` and `capacity == 42` and `spotsLeft == capacity - activeRegistrations == 8`. |
| **17 need attention** | `count(needsAttention) == 17` where `needsAttention = dueNow ∪ atRisk ∪ opportunity` (predicates below). |
| **8 first-time guests have not returned** | Count of first-timers with attendance ≥1 and no subsequent return within the seeded window (window keyed to `demoNow`). `count == 8`. |
| **Referral retention / attendance statement** | Any Analytics/AI sentence about referrals outperforming must be true on seeded registration→attendance→return rates by source. |

## needsAttention = 6 + 7 + 4 = 17 (locked)

Cinema clock: `demoNow = 2026-09-07T09:00:00+08:00`, `timeZoneId = Asia/Singapore`.

```
needsAttention = dueNow(6) ∪ atRisk(7) ∪ opportunity(4) = 17
```

- Buckets are **mutually exclusive**. Assignment priority: **dueNow → atRisk → opportunity**. A client matching an earlier bucket is not counted in a later one.
- Count is **derived** at read time — never a stored `needsAttention` / `attentionBucket` flag on the fixture.
- **Healthy** clients are excluded from the 17.
- **Incomplete contact does not inflate the 17.** Marcus (missing phone) stays in whatever triage bucket his history warrants; missing channel only constrains actionability (no WhatsApp), not membership in `needsAttention`.
- UI / FeelingCopy **never hardcodes 17**. Mounts call `countNeedAttention(club)`. CI fails if fixture cardinality under these predicates ≠ 17.

### dueNow (cardinality 6)

A client is **dueNow** when all of:

1. Client is **active** (not archived / not deleted).
2. **Either:**
   - a follow-up task / reminder is **due at or before** `demoNow`, **or**
   - the client’s **first activity** occurred in the **prior 72 hours** relative to `demoNow` and there is **no qualifying post-activity follow-up** logged after that activity.
3. There is **no completed or future resolving follow-up** that clears the due item (e.g. completed outreach that closes the task, or a scheduled follow-up that supersedes it).

Anchors expected in or near this set when history matches: e.g. fresh post-event work from Fri Sep 4; Daniel may land here if his leak arc marks contact overdue.

### atRisk (cardinality 7)

A client is **atRisk** when all of:

1. Not already classified **dueNow**.
2. Had **prior meaningful engagement** (attended ≥1 activity, or equivalent relationship history in fixtures).
3. **Last activity or last successful contact** falls **outside** the healthy engagement window (seed window: ~28–31+ days before `demoNow` for the Daniel-class leak; ambient peers use the same window helper).
4. **No future registration** and **no active follow-up plan** that would already address the leak.

Daniel Koh is the Anchor fingerprint for this bucket.

### opportunity (cardinality 4)

A client is **opportunity** when all of:

1. Not already classified **dueNow** or **atRisk**.
2. Shows **strong intent / repeat engagement** (e.g. attended twice+, referral acquisition with strong return behavior).
3. An **obvious next step** exists (membership invite, personal ask) that is **not** already done or scheduled in fixtures.

Priya Nair is the Anchor fingerprint for this bucket.

### Healthy (excluded)

Maya (post-event path complete), Sarah (loyal member), and ambient peers with no due/risk/opportunity signal — present in roster, **not** in the 17.

## Supporting equalities (non-exhaustive)

- Website “34 going” == Activities active reg count for upcoming Golden Hour `activityId` == number of Client records counted in that registration set.
- Dashboard/report registration totals in the cinema week == sum of registration fixtures in that period.
- No-show rate numerators include Marcus when he is a no-show.
- Campaign failed/skipped counts == campaign fixture fields; timeline “sent” events must not contradict them.
- `clientListTotalCount` must not imply fewer people than visible roster + known IDs.
- `countNeedAttention(club) == 6 + 7 + 4 == 17` with disjoint bucket helpers summing to the same total.

## Implementation rule

Prefer **pure helpers** in `marketing-demo-club.ts` (or sibling module) that compute:

- `getGoldenHourSpotsLeft(club)`
- `countNeedAttention(club)` / `countDueNow` / `countAtRisk` / `countOpportunity`
- `countFirstTimersNotReturned(club)`
- `referralRepeatRate(club)` / ranking by source

Mounts and tests call helpers. Forbidden pattern: magic number in JSX that is not asserted equal to helper output in the same test file. CI must fail when `countNeedAttention(club) !== 17`.

## FeelingCopy / live region

FeelingCopy may narrate club facts **only** if those facts equal helpers. Prefer mounting the derived number in the replica and keeping caption copy short (doctrine: copy almost zero).
