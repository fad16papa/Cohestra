# Addendum — Registration Capture

Not PRD-body material: mechanisms, rejected alternatives, later slices, schema examples. Decisions that *are* product locks live in `prd.md` and `.memlog.md`.

---

## Rejected alternatives

| Option | Why killed |
|---|---|
| Clone Tally (20+ types, logic IDE, custom CSS) | Lose to a free document editor; not our wedge |
| Webhook-only “import from Tally” as the strategy | Keeps Tally as source of truth |
| Reopen Epic 25 for embed/logic as branding | Studio is theme; Capture is a new epic |
| DnD Form canvas | UX-DR32 / UX-DR24 |
| Registrant Stripe/Paddle checkout in this epic | Ticketing, not capture |
| Sheets/Notion as guest list | The problem we sell against |
| LocalStorage-only save-and-resume | Weak; if drafts ever ship, write a Client with an explicit product decision |
| Typeform one-question default | Wrong for QR-at-the-door |
| `form_schema` version bump that migrates every Activity | Prefer `version: 1` + expanded type enum |
| Tally fair-use / uncap registrations | Admin: keep 250 / 500 / 5,000; compete on templates |
| Form canvas “design freedom” | UX-DR32; freedom = compose + save template |

---

## Options considered (locked in PRD as assumptions)

### Close-at
- Stored as UTC instant; Operator picker in Activity timezone. Empty = no datetime close.
- Precedence: capacity full → paused → Close-at → Activity ended → platform default.

### Embed CSP
- **A.** `frame-ancestors *` for Core/Pro — fastest Tally parity, worst clickjacking.
- **B.** Tenant `allowedEmbedOrigins[]` — slightly slower Operator UX, correct default.
- **Locked:** B (`prd.md` FR-RC-12).

### Draft-as-Client (Slice E)
- **E-off** — no server Client until submit.
- **E-session** — browser holds Answers; no Client.
- **E-lead** — Incomplete Client after Identity step.
- **Locked:** E-off until a later product decision. E-lead needs lawful basis, auto-delete, capacity exclusion, and UI that does not mix Incomplete with “coming Saturday.”

### Schema version label
- Stay `version: 1` vs publish `1.1`.
- **Locked:** stay `1`; document additive types as contract v1.1 in `docs/contracts/activity-form-schema-v1.md` (or a sibling addendum in that file).

---

## Additive `form_schema` example (MVP)

```json
{
  "version": 1,
  "meta": {
    "introMarkdown": "Saturday tennis — bring water.",
    "closedMessage": "Waitlist opens Monday on WhatsApp.",
    "registrationClosesAt": "2026-09-01T10:00:00Z"
  },
  "fields": [
    { "id": "full_name", "type": "text", "label": "Full name", "required": true },
    { "id": "phone", "type": "phone", "label": "Mobile", "required": true, "phoneCountry": "SG" },
    { "id": "notes", "type": "textarea", "label": "Skill / notes", "required": false },
    { "id": "session_date", "type": "date", "label": "Preferred date", "required": false },
    { "id": "ref", "type": "hidden", "label": "Campaign ref", "required": false, "defaultValue": null }
  ]
}
```

Phase 2 additions (not MVP):

```json
{
  "id": "guest_name",
  "type": "text",
  "label": "Guest name",
  "required": true,
  "visibleWhen": { "fieldId": "bringing_guest", "equals": "yes" }
}
```

---

## Implementation touch list (architecture, not requirements)

MVP likely touches (do not treat as a task list in the PRD):

- `src/Domain/Activities/FormFieldTypes.cs`
- `src/Infrastructure/Activities/FormSchemaValidator.cs`
- `src/Infrastructure/Activities/PublishGateValidator.cs`
- `src/Infrastructure/Registrations/RegistrationAnswerValidator.cs`
- `src/Infrastructure/Registrations/ClientProfileExtractor.cs`
- `src/Infrastructure/Registrations/RegistrationConfirmationEmailBuilder.cs` (piping)
- New Outbox type `RegistrationOperatorNotify`
- `docs/contracts/activity-form-schema-v1.md`
- `web/lib/form-schema-utils.ts`
- `web/components` Form tab editor + `registration-form.tsx` + success + unavailable screens

Phase 3 additionally: `web/content-security-policy.ts`, nginx, Share kit, website section type.

---

## Later / maybe (D / E / F) — not epic v1

Full product depth: `slices-elaborated.md` (slices D–F). Summary:

**D File:** `type: file`, signed upload, MIME/size, virus scan, GDPR delete. Platform epic wearing a Field type. No DAM.

**E Draft:** Changes what a Client is. Default off. Session-only Answers are the safe way to help Phase 2 bounce.

**F HMAC webhook:** Outbound `registration.created`, retries, delivery log, SSRF guard. Build when a paying tenant asks for Zapier-out. A7 email covers most hosts. No inbound webhooks.

---

## Landscape note (Discovery research, 2026-08-29)

Tally’s free plan still includes unlimited forms/submissions (fair use), Hidden Fields, answer piping, embed, and conditional logic. Pro (~$24–29/mo) adds brand removal, custom domain, partial submissions, custom CSS. That is why “I’ll just use Tally” has no price friction. Cohestra cannot win on free-form features; it wins when the event job writes a Client.

---

## Relationship to other PRDs

| PRD | Relationship |
|---|---|
| Registration Experience Studio | Brand/theme. Non-goals (embed, logic, steps, DnD) stay for Studio. Capture reopens a **narrow** slice as a new epic. |
| Registration Touchpoints | Email hero/resolver. Capture may pipe tokens into the same email; do not restyle the template or fork the resolver. |
| Website builder | Phase 3 Contact is a new section type, not a branding epic. |
| Lead-generation CRM (base) | FR-2 Form, FR-3 public URL, FR-4 submit + Client. Capture extends, does not replace. |
