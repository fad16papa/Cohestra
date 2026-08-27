---
title: Deep recon — Cohestra forms vs Tally.so
status: complete
created: 2026-08-27
updated: 2026-08-27
note: bmad-deep-recon is not an installed skill; this recon uses product surfaces, form_schema v1, Epic 25 PRD, and current Tally.so docs.
---

# Deep recon

**Tally*** in this study is **[Tally.so](https://tally.so/)** (Tally Forms, Ghent). Not TallyPrime accounting. Operators in SEA who say “Tally” sometimes mean the ERP — ignore that collision here.

## Cohestra today (forms)

Cohestra has **one real form product**: per-activity registration (`form_schema` JSONB). It is not a form builder. It is a **lead-capture pipe** into a client graph.

| Surface | What it is |
|---|---|
| Activity → Form tab | Structured field list (not a canvas). Types: text, phone, email, select, checkbox, consent, referral_source, section_header. Max 50 fields. |
| Activity → Design tab | Layout presets, hero, accent, community brand inherit. Separate from fields. |
| Public `/register/{slug}` | Single-page mobile form. Submit creates/updates **Client** + **Registration**. Dedup by phone then email. |
| Website builder | Marketing sections + upcoming activities. **No contact form.** |
| Campaigns | Outbound email to existing clients. **Not intake.** |

**Hard constraints already shipped**

- Publish requires ≥1 required phone **or** email.
- Answers are immutable after submit.
- UX spec **banned drag-and-drop form canvases** (FormFieldEditor is a list). Tally is slash/type, not DnD — that is compatible.
- Epic 25 / Registration Experience Studio **non-goals v1**: embed widget, conditional logic, multi-step wizard, paid ticket checkout, custom CSS.

Sources: `docs/contracts/activity-form-schema-v1.md`, `web/components/activities/activity-form-tab.tsx`, `_bmad-output/planning-artifacts/registration-experience-2026-08-12/recon-current-state.md`, PRD Registration Experience Studio.

## Tally.so today (forms)

Tally is a **Notion-like document that publishes as a form**. Unlimited forms/submissions on free (fair use ~50k/month). Logic, Stripe one-off payments, uploads, webhooks, Sheets/Notion/Airtable/Zapier are **free**. Pro ($29/mo) is branding, teams, partials, drop-off analytics. Business ($89/mo) is email verify + retention.

**What they are good at:** type `/` to insert, 20+ block types, show/hide + jump + calculate, hidden UTMs, embed (standard/popup/full page), HMAC webhooks.

**What they will never be:** multi-tenant event CRM, client dedup across 12 activities, capacity/waitlist, check-in, campaigns, community catalog.

Sources: [tally.so](https://tally.so/), [pricing](https://tally.so/pricing), [input blocks](https://tally.so/help/input-blocks), [logic](https://tally.so/help/conditional-form-logic), [hidden fields](https://tally.so/help/hidden-fields), [embed](https://tally.so/help/embed-your-form), [webhooks](https://tally.so/help/webhooks).

## How operators actually choose

| Job | Typical tool |
|---|---|
| Internal RSVP | Google Forms |
| Pretty public signup, maybe paid, dump to Sheets | **Tally** |
| Brand-theater survey | Typeform |
| Repeat attendees, follow-up, capacity, communities | **Cohestra’s lane** (or Luma/Eventbrite) |

**Status-quo stack Cohestra displaces:** Tally → Google Sheet → Zapier → Mailchimp. Cheap until the same person registers 12 times and nobody has a phone-deduped client.

## Strategic implication

Tally is why a host can **delay buying Cohestra**. The counter is not a better form builder. It is registration that **writes a person**, with just enough Tally-like capture UX that they never open tally.so for the **event job**.
