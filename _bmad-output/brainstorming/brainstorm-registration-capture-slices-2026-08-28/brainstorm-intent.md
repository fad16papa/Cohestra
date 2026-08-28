# Intent: Registration Capture slices (for `bmad-prd`)

**Session:** brainstorm-registration-capture-slices-2026-08-28  
**Canonical detail:** `_bmad-output/planning-artifacts/cohestra-vs-tally-forms-2026-08-27/slices-elaborated.md`

## Chosen direction

One epic: **Registration Capture**. Steal Tally **event-signup UX**. Do not clone a form builder.

Ship **A → B → C**. Keep **D / E / F** out of v1.

## Slice map (PRD epics / stories)

| Slice | In | Out |
|---|---|---|
| **A** Native depth | `hidden`+UTM query, `textarea`, `date`, thank-you/email `{{tokens}}`, closed copy + close-at, slash-add Form tab (no DnD), operator new-reg email; optional Turnstile | logic, steps, embed, contact, file, drafts, webhooks |
| **B** Recipes + steps | `visibleWhen` equals/notEquals/isChecked only; optional Identity→Details→Consent; server re-validates visibility | formula language, nested AND/OR IDE, Typeform default |
| **C** Distribution | Activity embed route + CSP allow-list; website `contact_form` → Client (no Activity) | admin embed, form marketplace, logic on website sections |
| **D** File (later) | Bounded `file` type, signed upload, scan, GDPR delete | DAM, video, public unauthenticated blobs |
| **E** Draft (maybe never) | Only if product picks E-lead; else session-only or off | LocalStorage as CRM; drafts counting toward capacity |
| **F** HMAC webhook (later) | Outbound `registration.created` + retry log + SSRF guard | Inbound webhooks; Slack native |

## Invariants (do not bargain)

- One form per activity. Field `id` is the CRM key.
- Submit still upserts a **deduped Client**. Publish still requires required phone **or** email.
- `form_schema` v1 stays; additive types/keys only (v1.1).
- UX-DR32: no drag-and-drop canvas. Slash/type insert is allowed.
- Epic 25 website branding non-goals stay; C2 is a new section type, not a branding epic.
- Paddle is tenant billing. No Stripe-in-form.

## Next skill

`bmad-prd` create (or update) **Registration Capture**, stories sliced as A1–A7 first.
