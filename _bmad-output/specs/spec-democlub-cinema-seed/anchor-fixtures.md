# Anchor fixtures

100% continuous arcs. IDs are proposed; implementation may rename keys if tests update atomically.

## Cinema clock + week

- `timeZoneId`: `Asia/Singapore`
- `demoNow`: `2026-09-07T09:00:00+08:00` (Mon Sep 7, 09:00) — never system clock

| When (local) | Anchor event | At demoNow |
|--------------|--------------|------------|
| Fri Sep 4, 2026 | Golden Hour Run (prior) | **Completed** — attendance / no-show / post-event follow-up history |
| Mon Sep 7, 2026 09:00 | — | **Now** |
| Wed Sep 9, 2026 | Board Game Night | Upcoming |
| Fri Sep 11, 2026 | Golden Hour Run | Upcoming; **42** cap; **34** going; **8** spots left |
| Sun Sep 13, 2026 | Sunday Pickleball | Upcoming |

## Anchor events

| ID (proposed) | Name | Role |
|---------------|------|------|
| `demo-golden-hour-run` | Golden Hour Run | Fri Sep 11 headline; 42 cap; 34 going; 8 spots left. Prior Fri Sep 4 instance completed. |
| `demo-sunday-pickleball` | Sunday Pickleball | Sun Sep 13; attendance / waitlist / return arcs |
| `demo-board-game-night` | Board Game Night | Wed Sep 9; recurring social continuous with Website |

## 1. Maya Santos — healthy conversion

| Room | Must show |
|------|-----------|
| Website | Registers upcoming Golden Hour Run (Fri Sep 11) from Instagram (counts in 34). |
| Clients | New → progressing; source Instagram; interest Running; joined near cinema now. |
| Activities | Checked in prior Golden Hour (Fri Sep 4), exact timestamp e.g. 18:27 local. |
| Follow-up | Post-event message sent after Fri Sep 4; Maya replied; **Healthy** — not in the 17. |
| Analytics | Counts in Instagram → attended → returned path. |
| AI (future) | Likely repeat attendee — only if seed history supports it. |

**Job:** Prove the healthy path exists.

## 2. Daniel Koh — relationship leak

| Room | Must show |
|------|-----------|
| Website | Older registration footprint (not only Fri Sep 11’s 34 if arc is multi-week — still fingerprintable). |
| Clients | ~3 activities; last seen **31 days** before `demoNow` (≈ Aug 7); At risk. |
| Activities | Declining attendance history across prior weeks. |
| Follow-up | **atRisk** (or **dueNow** if contact overdue under predicate); no contact ~28 days; in the 17. |
| Analytics | Included in churn / inactive risk set. |
| AI (future) | Re-engage Daniel + similar members — grounded in same history. |

**Job:** Prove why Follow-up exists.

## 3. Priya Nair — high-intent opportunity

| Room | Must show |
|------|-----------|
| Website / Clients | Referral acquisition (named referrer preferred — e.g. Sarah). |
| Activities | Attended **twice** (prior week spine + earlier); strong engagement. |
| Clients | Not yet Member (opportunity state). |
| Follow-up | **opportunity** bucket; in the 17. |
| Analytics | Referral attendees show strong repeat behavior in seed math. |
| AI (future) | Membership invitation recommendation grounded in that pattern. |

**Job:** Tie acquisition → CRM → activities → revenue opportunity as one story.

> Note: Current brownfield has `Priya Shah` — replace/rename to **Priya Nair** for this arc or map Shah→Nair in one atomic seed rewrite.

## 4. Marcus Ong — messy / incomplete / no-show

| Room | Must show |
|------|-----------|
| Clients | Profile incomplete; **phone missing**; email may bounce. |
| Activities | Registered for an Anchor event (prefer prior Fri Sep 4 Golden Hour); **no-show**. |
| Follow-up | In triage per history (counts toward 17 only if predicate matches — incomplete contact does **not** add an extra slot); Cannot send WhatsApp (phone missing). |
| Analytics | Counts toward no-show rate. |
| AI (future) | Must recommend completing contact info — **never** WhatsApp him. |

**Job:** Imperfection propagation; make AI credible by refusing magic. Missing phone constrains **actionability**, not `needsAttention` cardinality.

## 5. Sarah Tan — loyal member / referral engine

| Room | Must show |
|------|-----------|
| Website | May appear in community / testimonial (COULD photography). |
| Clients | Long-time Member; rich relationship history. |
| Activities | Repeated attendance across Anchor events (incl. prior Fri Sep 4 and/or upcoming Fri Sep 11). |
| Follow-up | **Healthy** / not leaking — excluded from the 17. |
| Analytics | Referrals tied to members like Sarah = high-retention acquisition (seed math). |
| AI (future) | Ask Sarah + N engaged members to invite someone to next clinic — grounded. |

**Job:** Referrals as economic mechanism, not a slogan.

## Traceability matrix (minimum)

For each Anchor, fixtures must include enough of:

`client row` · `clientDetails` · `registration(s)` · `attendance` · `timeline events` · `follow-up state` · `source` · pointers from Website upcoming / public activity · Analytics aggregates

Ambient people may register for upcoming Golden Hour Run (Fri Sep 11) to fill the 34 without full arcs.
