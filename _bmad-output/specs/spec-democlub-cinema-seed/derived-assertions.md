# Derived assertions

Every cinema number is a **function of fixtures**. UI and FeelingCopy may display the result; they must not invent a second source of truth.

## Locked headlines (must compute)

| Assertion | Definition (derive, don’t hardcode independently) |
|-----------|-----------------------------------------------------|
| **34 going · 8 spots left** | Golden Hour Run: `activeRegistrations == 34` and `capacity == 42` and `spotsLeft == capacity - activeRegistrations == 8`. |
| **17 need attention** | Count of clients matching Follow-up predicate P (Due now ∪ At risk ∪ Opportunity as locked). `count(P) == 17`. |
| **8 first-time guests have not returned** | Count of first-timers with attendance ≥1 and no subsequent return within the seeded window (exact window locked with calendar). `count == 8`. |
| **Referral retention / attendance statement** | Any Analytics/AI sentence about referrals outperforming must be true on seeded registration→attendance→return rates by source. |

## Supporting equalities (non-exhaustive)

- Website “34 going” == Activities active reg count for that `activityId` == number of Client records counted in that registration set.
- Dashboard/report registration totals in the cinema week == sum of registration fixtures in that period.
- No-show rate numerators include Marcus when he is a no-show.
- Campaign failed/skipped counts == campaign fixture fields; timeline “sent” events must not contradict them.
- `clientListTotalCount` must not imply fewer people than visible roster + known IDs.

## Implementation rule

Prefer **pure helpers** in `marketing-demo-club.ts` (or sibling module) that compute:

- `getGoldenHourSpotsLeft(club)`
- `countNeedAttention(club)`
- `countFirstTimersNotReturned(club)`
- `referralRepeatRate(club)` / ranking by source

Mounts and tests call helpers. Forbidden pattern: magic number in JSX that is not asserted equal to helper output in the same test file.

## FeelingCopy / live region

FeelingCopy may narrate club facts **only** if those facts equal helpers. Prefer mounting the derived number in the replica and keeping caption copy short (doctrine: copy almost zero).
