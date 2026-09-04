# Anchor fixtures

100% continuous arcs. IDs are proposed; implementation may rename keys if tests update atomically.

## Anchor events

| ID (proposed) | Name | Role |
|---------------|------|------|
| `demo-golden-hour-run` | Golden Hour Run | Friday headline; 42 cap; 34 going; 8 spots left |
| `demo-sunday-pickleball` | Sunday Pickleball | Recurring; attendance / waitlist / return arcs |
| `demo-board-game-night` | Board Game Night | Recurring social continuous with Website |

## 1. Maya Santos — healthy conversion

| Room | Must show |
|------|-----------|
| Website | Registers Golden Hour Run from Instagram (counts in 34). |
| Clients | New → progressing; source Instagram; interest Running; joined near cinema now. |
| Activities | Checked in Friday (exact timestamp, e.g. 18:27 local). |
| Follow-up | Post-event message sent; Maya replied; not “due now.” |
| Analytics | Counts in Instagram → attended → returned path. |
| AI (future) | Likely repeat attendee — only if seed history supports it. |

**Job:** Prove the healthy path exists.

## 2. Daniel Koh — relationship leak

| Room | Must show |
|------|-----------|
| Website | Older registration footprint (not only this Friday’s 34 if arc is multi-week — still fingerprintable). |
| Clients | ~3 activities; last seen **31 days** ago; At risk. |
| Activities | Declining attendance history. |
| Follow-up | At risk · no contact ~28 days; appears in Due now / At risk triage. |
| Analytics | Included in churn / inactive risk set. |
| AI (future) | Re-engage Daniel + similar members — grounded in same history. |

**Job:** Prove why Follow-up exists.

## 3. Priya Nair — high-intent opportunity

| Room | Must show |
|------|-----------|
| Website / Clients | Referral acquisition (named referrer preferred). |
| Activities | Attended **twice**; strong engagement. |
| Clients | Not yet Member (opportunity state). |
| Follow-up | Opportunity bucket. |
| Analytics | Referral attendees show strong repeat behavior in seed math. |
| AI (future) | Membership invitation recommendation grounded in that pattern. |

**Job:** Tie acquisition → CRM → activities → revenue opportunity as one story.

> Note: Current brownfield has `Priya Shah` — replace/rename to **Priya Nair** for this arc or map Shah→Nair in one atomic seed rewrite.

## 4. Marcus Ong — messy / incomplete / no-show

| Room | Must show |
|------|-----------|
| Clients | Profile incomplete; **phone missing**; email may bounce. |
| Activities | Registered; **no-show**. |
| Follow-up | Cannot send WhatsApp (phone missing); incomplete contact state. |
| Analytics | Counts toward no-show rate. |
| AI (future) | Must recommend completing contact info — **never** WhatsApp him. |

**Job:** Imperfection propagation; make AI credible by refusing magic.

## 5. Sarah Tan — loyal member / referral engine

| Room | Must show |
|------|-----------|
| Website | May appear in community / testimonial (COULD photography). |
| Clients | Long-time Member; rich relationship history. |
| Activities | Repeated attendance across Anchor events. |
| Follow-up | Healthy / not leaking. |
| Analytics | Referrals tied to members like Sarah = high-retention acquisition (seed math). |
| AI (future) | Ask Sarah + N engaged members to invite someone to next clinic — grounded. |

**Job:** Referrals as economic mechanism, not a slogan.

## Traceability matrix (minimum)

For each Anchor, fixtures must include enough of:

`client row` · `clientDetails` · `registration(s)` · `attendance` · `timeline events` · `follow-up state` · `source` · pointers from Website upcoming / public activity · Analytics aggregates

Ambient people may register for Golden Hour Run to fill the 34 without full arcs.
