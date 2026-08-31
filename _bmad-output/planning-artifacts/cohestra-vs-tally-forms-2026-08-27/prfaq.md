---
title: "PRFAQ: Cohestra registration capture"
status: draft
created: 2026-08-27
updated: 2026-08-27
stage: verdict
inputs:
  - _bmad-output/planning-artifacts/cohestra-vs-tally-forms-2026-08-27/recon-current-state.md
  - _bmad-output/planning-artifacts/cohestra-vs-tally-forms-2026-08-27/comparison.md
  - _bmad-output/planning-artifacts/cohestra-vs-tally-forms-2026-08-27/feasibility.md
---

# Cohestra forms now feel like the event, not like IT

## Hosts build Saturday’s signup as fast as Tally — and every name becomes a person they can actually follow up

**Singapore, 27 August 2026** — Cohestra is tightening the one surface hosts compare to Tally.so: the activity registration form. The problem was never “we need twenty question types.” It was that a host could brand a beautiful event page and still lose the guest list to a spreadsheet because authoring the form felt slower than opening a free Tally doc.

Hosts already live in a stack of Tally → Sheets → Zapier. It is pretty and cheap until the same member registers twelve times. Cohestra already solved that second-event mess. It had not earned the first form.

That changes: slash-insert fields, hidden campaign links, a handful of event-shaped show/hides, and (next) an embed that still writes a Client. Tally remains excellent for surveys. Saturday’s session should not leave Cohestra.

> “If they still need Tally to find out who’s coming, we don’t have a form problem — we have a product-entry problem.”
> — Product, Cohestra

### How It Works

A host opens an activity → Form. They type `/` and add Email, Phone, a date, a guest question. They copy a WhatsApp link with `?ref=wa`. A plus-one field appears only if someone says they’re bringing a guest. Submit still requires a phone or email, still dedups, still lands on the client timeline. Later they paste an embed on the club site — same form, same people.

> “I stopped keeping a Tally for tennis. The QR is Cohestra, and I can message last month’s group without hunting a Sheet.”
> — Francis, community host

### Getting Started

Existing activities keep their schemas. New field types are optional. Publish gates do not relax. Hosts on Core/Pro see slash-add and hidden fields first; embed follows.

---

## Customer FAQ

### Q: Are you turning Cohestra into Tally?

A: No. Tally is a blank document that emits rows. Cohestra is an event that emits a person. We are copying **speed to publish** and **attribution**, not a logic IDE or a survey catalog.

### Q: I already have a Tally. Why move?

A: Keep Tally for NPS and job applications. Move **event signup** so capacity, QR, confirmation, and next-event campaigns share one client. Importing a Tally JSON is not v1; rebuilding 8–12 fields in slash-add should be faster than maintaining Zapier.

### Q: Will my public form become a ten-page Typeform?

A: Default stays one page (QR at the door). Optional steps are identity → details → consent, not one question per screen.

### Q: Can I take payments for tickets?

A: Not in this work. Paddle bills the **workspace**. Registrant checkout is a ticketing epic, not a Tally clone.

### Q: Can I embed this on Notion / our existing site?

A: That is Slice C. Until then, share kit + registration URL. Embed is the highest-leverage Tally replacement and the highest XSS/CSP risk — it ships after hidden fields and recipes.

### Q: Do you store card numbers if I used Tally+Stripe before?

A: Cohestra never stores full cards. Tenant billing is Paddle. Do not paste Stripe payment blocks into registration v1.

---

## Internal FAQ

### Q: Epic 25 said conditional logic and embed are non-goals. Are we reversing?

A: We are **not** reopening Registration Experience Studio. That epic was brand/theme. This is a **new** Registration Capture epic. Studio non-goals stay for CSS/DnD/checkout. We allow a **narrow** `visibleWhen` recipe and a later embed of **one activity**, not a form OS.

### Q: `form_schema` v1 is frozen. How do we add types?

A: Additive v1.1: new `type` values and optional keys (`visibleWhen`, hidden defaults). Unknown types still reject. Existing activities unchanged.

### Q: Why not just webhook Tally into Cohestra?

A: Possible as a stopgap. It trains hosts to keep Tally as source of truth and fights dedup (Tally IDs ≠ our field ids). Build native capture; optional Tally import later.

### Q: What is the load-bearing risk?

A: Show/hide that becomes a general IF/THEN builder. If Slice B needs nested AND/OR, stop. Recipes only.

### Q: Effort?

A: Slice A is localized: FormFieldEditor, FormSchemaValidator, RegistrationForm, answer storage already JSONB. Embed and drafts are the expensive slices.

---

## The Verdict

**Steel:** Do not clone Tally. Steal capture UX for the event job. Hidden fields and slash-add are obvious wins.  
**Needs heat:** Embed (security) and `visibleWhen` (scope creep).  
**Crack:** Treating “forms” as a second product. If we add NPS and matrices, we lose the wedge.

**Next:** `bmad-prd` create intent **Registration Capture**; `bmad-spec` for `form_schema` v1.1; UX only for Form tab slash-insert (no canvas).
