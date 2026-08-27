# Forged idea

**Idea:** Steal Tally-like form UX for Cohestra registration without cloning a generic form builder.  
**Goal:** Harden.  
**Outcome:** **HARDENED** (with kills).

## Locks

- Tally.so is the comparator, not TallyPrime.
- Cohestra’s form is an **activity registration pipe into CRM**, not a form product.
- Winning move: Tally-familiar **authoring** + Cohestra **identity**. Losing move: 20 field types and a logic IDE.
- Epic 25 branding non-goals stay. New epic: **Registration Capture**.
- `form_schema` grows additively (v1.1). Field `id` remains the CRM key.
- Public default stays single-page. Optional steps only.
- UX ban on DnD canvas stands. Slash/type insert is allowed (Tally’s model, not Typeform’s, not Jotform’s).
- Slice A first: hidden/UTM, textarea, date, piping, closed copy, slash-add, operator notify.

## Kills

- **Clone Tally** — we lose to a free, better document editor; we are not Notion.
- **Webhook-only Tally integration as the strategy** — keeps Tally as source of truth.
- **Registrant Stripe/Paddle checkout in this epic** — ticketing, not forms.
- **Nested conditional IDE / calculations** — Epic 25 was right; recipes only.
- **Sheets/Notion as the guest list** — that is the problem we sell against.

## Cracks that held

- Embed is high value and high XSS risk — Slice C, not A.
- Draft-as-client beats Tally partials but needs a privacy story.
- Operators who only wanted a website contact form still leak to Tally until Slice C.

## Room

- **Mary (analyst):** TAM is not “form builders”; it is hosts about to paste a Tally link.
- **Hostile Tally PM:** They will always be faster on blank page. Compete on the second event.
- **Winston (architect):** Additive schema or you break frozen v1 and every published activity.
- **Skeptical host:** If slash-add still requires an Activity and a publish gate, they may still open Tally for a one-off RSVP — accept that; win recurring sessions.
