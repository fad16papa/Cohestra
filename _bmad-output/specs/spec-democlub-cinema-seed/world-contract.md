# World contract

Load-bearing catalog for the DemoClub cinema seed. Complements `SPEC.md` CAP-1 / CAP-5.

## Club identity

| Field | Contract |
|-------|----------|
| `orgName` | Believable club brand (not Acme / yourclub). **Open:** keep Riverside Rec vs rename. |
| `publicHost` | `{slug}.cohestra.app` matching brand. |
| Website FOH | Customer brand dominates; barely looks like Cohestra. |
| Locale voice | Singapore community life acceptable; timezone **open** (prefer Asia/Singapore). |
| Operator greeting | May stay a first name; must not break Anchor continuity if it matches an Anchor (avoid colliding with Maya Santos if greeting stays “Maya”). |

## Activities / calendar (Anchor + ambient)

**Anchor events (100% continuous)**

1. **Golden Hour Run** — Friday public headline event; capacity **42**; **34** active registrations ⇒ **8** spots left.
2. **Sunday Pickleball** — recurring; used in attendance / first-timer / return arcs.
3. **Board Game Night** — recurring social; continuous with Website THIS WEEK and Activities.

**Ambient calendar (examples; not all need full arcs)**  
Women’s Social Doubles, September Mixer, Corporate Open Play, Beginner Clinic — exist for density; may appear in lists without Anchor-level fingerprints.

Each activity record must carry: stable `activityId`, name, schedule, capacity (where relevant), status `published` for public ones, registration counts derived from registration fixtures.

## Member / client population

| Class | Size | Continuity |
|-------|------|------------|
| Anchor | 5 | Full six-room fingerprints |
| Ambient | enough for **25–40 visible** roster rows | Statistical coherence only |
| List total | May show `clientListTotalCount` ≥ visible rows (e.g. 248-class total OK if derived/consistent) | Must not contradict Anchor/Ambient counts used in Analytics |

Visible rows need purpose: status, source, last activity, relative time — operational pressure, not wallpaper.

## Acquisition sources

Every client (Anchor + Ambient) has a source used by Analytics:

- Instagram
- Website
- Referral (named referrer when Anchor — e.g. Sarah)
- Other sparse ambient sources as needed

Sources must agree across Website registration story, Client record, and Analytics breakdowns.

## Attendance history

Per registration / check-in fixtures:

- Registered
- Checked in (timestamp)
- No-show
- Cancelled
- Waitlisted (e.g. Sunday Pickleball 31/36 · 2 waitlisted pattern when used)

Attendance feeds Follow-up predicates and Analytics rates. Anchor attendance must match their arcs in `anchor-fixtures.md`.

## Follow-up rules

Triage buckets (doctrine): **Due now · At risk · Opportunity · Healthy**.

- Clients room: subtle states only (New / At risk / Needs attention / Returning / Member) — no scream.
- Follow-up room: ruthless hierarchy; urgency from dataset, never red paint.
- Campaigns / messages live inside Follow-up job for cinema narrative (capabilities may compose from campaign fixtures).

**17 need attention** = count of records matching the locked predicate (open question until predicate frozen). Count must equal fixture cardinality.

## Campaigns / messages

- At least one campaign/message fixture tied to Anchor events (e.g. Golden Hour reminder, post-event follow-up).
- Logged outreach on Client timelines must match campaign/message fixtures (kind, timestamp, subject/body constraints).
- Channel constraints: no WhatsApp where phone missing (Marcus).

## Analytics derivation rules

Analytics (`/reports` + dashboard reporting projection) may only show metrics computable from:

- registrations
- attendance / no-shows
- lead statuses
- sources
- follow-up states
- campaign send results

Forbidden: canned % improvements, charts without fixture backing, clairvoyant claims.

Referral retention / strongest-repeat statement must be mathematically true on the seeded history.

## Dates / timestamps / timezone

- One cinema “now” / computedAt for the week.
- All Anchor events share one coherent calendar week (or explicitly multi-week Daniel leak span).
- Relative labels (`18 min ago`, `2 days ago`) must derive from the same clock.
- **Open:** freeze timezone Asia/Singapore; replace or keep March 2026 week.

## Continuity law

> Nothing important may exist in only one room.

If Website shows Golden Hour Run · 34 going · 8 spots left, then:

- Activities has that activity at capacity 42 with 34 active regs
- Clients contains those people (Anchors among them + ambient registrants)
- Follow-up / Analytics / future AI reason from the same registrations and histories
