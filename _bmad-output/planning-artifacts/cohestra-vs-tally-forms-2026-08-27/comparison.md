# Cohestra vs Tally.so — forms

## Pros and cons

### Cohestra

**Pros**

- Submit becomes a **Client + Registration**, not a spreadsheet row. Phone/email dedup, merge suspects, timeline, reports, campaigns.
- Event object is real: activity, community, capacity, publish gates, QR/share kit, confirmation email.
- Multi-tenant isolation, plan gates, Singapore-first phone, consent as a first-class field.
- Public page already has brand presets (Classic/Card/Immersive/Compact) and community inherit.
- Schema uses stable field `id`s — better CRM mapping than Tally labels.

**Cons**

- Feels like an **admin list of fields**, not a document you type. Operators who just used Tally bounce.
- Field catalog is thin (no long text, date, file, hidden, payment).
- No show/hide (“bringing a guest?”), no multi-step, no embed on an existing club site.
- No hidden UTMs — attribution dies at the QR.
- No operator ping on new lead; no drop-off / partial as a client.
- Website builder cannot capture a lead without an activity.
- Ticketing/payments at submit do not exist (Paddle is tenant billing only).

### Tally.so

**Pros**

- Fastest path from “I need a form” to a public URL. `/` insert, Notion muscle memory.
- Logic, calculations, Stripe, uploads, webhooks, embeds — **free**.
- Hidden fields + query params = campaign attribution without a CRM.
- Embeds on Notion/Webflow/WordPress so the form lives where the audience already is.
- Unlimited submissions (until fair use) vs Typeform’s response tax.

**Cons**

- No person graph. Dedup is IP / localStorage / a field — bypassable. Email verify is **Business**.
- “Limit submissions” is not inventory. Concurrent signups race.
- Partials (Pro) do not hit integrations — abandoned leads stay in Tally’s inbox.
- Payments are one-off Stripe Checkout, not tickets, refunds, waitlist, or tax IDs.
- Not multi-tenant. Sharing Pro across clubs violates fair use.
- Logic trees get messy; no visual branch canvas.
- Leaving Tally means rebuilding forms; file URLs in Sheets are tokenized and leaky if the Sheet is shared.

## Head-to-head (the form job only)

| Capability | Cohestra | Tally |
|---|---|---|
| Time to first public form | Minutes, but tied to an Activity + publish gates | Seconds, blank doc |
| Editor | Structured list + type dropdown | Slash/type document |
| Field types | ~8 | 20+ |
| Conditional logic | None | Free, unlimited |
| Multi-page | No | Free |
| Hidden / UTM | No | Free |
| Embed | No | Free (popup/standard/full) |
| Payments | Tenant Paddle only | Stripe in-form (one-off) |
| CRM / dedup | Native | Sheets/Notion/Zapier |
| Event capacity | Real counts | Close-on-N |
| Confirmation | Email outbox | Optional Pro emails |
| Analytics | Registration counts | Drop-off = Pro |
| Price for capture | Bundled in Core/Pro | $0–$29 for most clubs |

**Neither wins the whole market.** Tally wins **blank-page capture**. Cohestra wins **the second event**.
