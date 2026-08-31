# Glossary

Downstream must use these terms exactly.

- **Activity** — Schedulable community event. Has one **Form**.
- **Form** — The Activity’s `form_schema` (JSONB): ordered Fields.
- **form_schema** — Frozen v1 JSON contract. This work adds types/keys additively; `version` stays `1`.
- **Field** — One `form_schema.fields[]` object. **Field id** is the stable key in Answers and CRM extract.
- **Hidden Field** — `type: hidden`. Not shown to the Participant. Value from query key matching Field id, or operator default.
- **Answer** — Submitted value keyed by Field id on `registrations.answers`. Immutable after submit.
- **Publish Gate** — Cannot publish unless the Form has at least one required Phone or Email Field.
- **Client** — Deduped person (phone/email). A Registration upserts a Client.
- **Registration** — One Participant submit against one Activity.
- **Operator** — Authenticated tenant admin.
- **Participant** — Unauthenticated person on the public Form.
- **Piping token** — `{{full_name}}`, `{{email}}`, `{{phone}}`, `{{field:<id>}}`.
- **Closed message** — Operator copy when the Form is unavailable.
- **Close-at** — Optional datetime after which public GET/submit reject (server-evaluated).
- **Recipe** — Named `visibleWhen` preset or custom equals/notEquals. Not a logic IDE.
- **Embed** — Chrome-light public Form for one Activity, framed on a foreign origin.
- **Contact section** — Website builder section that creates a Client (no Registration).
- **Website inquiry** — Timeline event on a Client created from Contact.
- **Resolved registration theme** — `RegistrationThemeResolver` output. Stored in `registration_theme`, not `form_schema`.
- **Outbox** — Existing async email pipeline (SendGrid).
