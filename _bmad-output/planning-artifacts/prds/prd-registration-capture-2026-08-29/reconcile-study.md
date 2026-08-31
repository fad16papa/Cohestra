# Input Reconciliation — Tally study brief + slices

Against: `prd.md` + `addendum.md` (Registration Capture, 2026-08-29).  
Extract, not ingest. Gaps are only those that would change a UX, architecture, or epic cut.

---

## Input 1 — Product brief

**Source:** `_bmad-output/planning-artifacts/briefs/brief-cohestra-tally-forms-2026-08-27/brief.md`  
**Name:** Registration capture that writes a person (product brief)

### What transferred

| Brief claim | Where it landed |
|---|---|
| Job is event → person → follow-up; feeling is the leak (admin field list vs Tally `/` + publish) | Vision §1; thesis sentence |
| Not “build Tally inside Cohestra”; steal hidden, event-shaped show/hide, optional steps, embeds | Features 4.1–4.10; Non-Goals §5 |
| Do not steal logic IDE, 20 field types, Stripe-in-form | Non-Goals; SM-RC-C1/C2 |
| Francis / Saturday tennis / `?ref=` / plus-one / Notion paste / Sheet dump | UJ-RC-1–5; Why Now §10 |
| One Form per Activity; slash-insert existing + textarea/date/hidden; UTMs on Registration | Glossary; FR-RC-1–4, FR-RC-8, FR-RC-14 |
| 3–5 Recipes; optional identity → details → consent | FR-RC-10, FR-RC-11 (Phase 2) |
| Later: activity Embed + website Contact → Client | FR-RC-12, FR-RC-13 (Phase 3) |
| Public submit, Publish Gate, phone/email required, CRM extract stay | FR-RC-14; SM-RC-3 |
| Primary Core/Pro (Tally-on-Instagram); secondary Basic (Google Forms); Participant QR/one-thumb | Target User §2.1–2.2 |
| Success: author in Cohestra without tally.so; `ref`/UTM persist; Publish Gate holds; no logic canvas in v1 | SM-RC-1–3; SM-RC-C2 |
| Embed-when-shipped beats Tally embed on tenant sites | SM-RC-4 (Phase 3) |
| Slice A/B/C in; NPS/matrix/ranking, nested `/logic`, checkout, custom CSS, Sheets-as-CRM, DnD out | §5–6; addendum rejected alternatives |
| Tally = document→rows; Cohestra = Registration→person | Vision thesis |

Scope cut A→B→C and the “surveys stay on Tally / Saturday does not” line are intact.

### Qualitative ideas the FR structure dropped

These are in Vision / Target User prose, then vanish once the contract becomes FR-RC-*.

- **Wrong feeling vs right job.** The brief’s whole point is *feeling*: Cohestra already does the job; the Form tab feels like IT. FRs specify a slash palette and a type list. They do not say the Form tab must stop reading as an admin field list (no “document you type into,” no ten-minute blank-page publish). A story can ship FR-RC-8 and still feel like IT.
- **Tally-smooth / Cohestra-strict.** The pairing — smooth to author, strict about identity — is the product voice. FRs encode the strict half (Publish Gate, Hidden never extracts, Client dedup). The smooth half is a palette, not a feel.
- **“Opens Tally in ten minutes.”** Speed-of-authoring is the competitive clock. No SM or FR is a time-to-first-publish or “without leaving the Form tab” bar.
- **Sheet dump → delay the buy.** Hosts paste Tally rows into Sheets and postpone Cohestra until the second event hurts. Why Now restates the leak; no metric watches “first-event capture in-product” or “Tally+Sheet still the guest list.”
- **One-thumb Participant, not a Typeform interview.** Named for the secondary user. No public-Form FR/NFR holds QR-at-the-door (thumb reach, single page default is Phase 2 only). Phase 2 steps can violate this without failing FR-RC-11.
- **“We will not out-Notion Tally.”** Positioning, not a requirement. Fine as Vision; easy for Phase 3 Embed/Contact stories to chase Tally-complete.

### Gaps that matter (brief)

1. **UTM/`ref` on reports.** Brief success: “Hidden `ref` / UTM appear on registration **and reports**.” PRD SM-RC-2 / FR-RC-2 stop at admin Registration detail. No report, filter, or campaign-breakdown requirement. Attribution can be true on a row and invisible where hosts actually look.
2. **Form tab still allowed to feel like IT.** Slash-add is specified; “Tally-familiar to author” / “not an admin field list” is not testable. UX can pass FR-RC-8 and miss the brief.
3. **No success bar for the buy-moment leak.** “Delay buying until the second event hurts” / guest list lives in a Sheet — not in SM-RC-*. SM-RC-1 is a support-ticket proxy, not first-event-in-Cohestra.
4. **Participant one-thumb unprotected.** Brief is explicit. PRD journeys mention QR; FRs do not bind public density, default single-page (except Phase 2 toggle-off), or “do not become an interview.”

---

## Input 2 — Slices elaborated

**Source:** `_bmad-output/planning-artifacts/cohestra-vs-tally-forms-2026-08-27/slices-elaborated.md`  
**Name:** Registration Capture — slices A–F elaborated

### What transferred

**Frame.** Slice = shippable cut of one epic, writes a Client, explicit out-list, demoable “done when.” Epic 25 branding stays a non-goal. A→B→C ship order; D/E/F later. All in §0, §6, epic mapping §17, addendum.

**Saturday tennis spine.** Host-wants table → UJ-RC-1–5. Slice feelings compressed into Vision + SM-RC-1.

**Slice A → MVP FRs**

| Slice item | PRD / addendum |
|---|---|
| A1 Hidden + query; skip Publish Gate + extractor; max 200; strip HTML; unknown keys ignored; preview chip | FR-RC-1, FR-RC-2 |
| A2 `textarea`; extract like `text`; max 2000 | FR-RC-3 |
| A3 `date` ISO; no math/ranges/disable-Sundays; no Client DOB | FR-RC-4 |
| A4 `{{full_name}}` / `{{email}}` / `{{phone}}` / `{{field:id}}`; missing → empty or “there”; hidden not on public success | FR-RC-5; OQ 3 |
| A5 `closedMessage` + optional Close-at; reason chip; capacity still wins; server eval | FR-RC-6, FR-RC-7 |
| A6 `/` + palette; arrows/Enter/Esc; dropdown fallback; no columns / prose-as-field / public WYSIWYG | FR-RC-8 |
| A7 Outbox `RegistrationOperatorNotify`; subject/body; toggle; Slack/mute/digest out | FR-RC-9; OQ 2 |
| A8 bot friction if keys | §6.2 + OQ 1; non-blocking |
| A contract: `version` 1, additive types, meta keys | Glossary; addendum example; NFR-RC-1 |
| A acceptance 1–8 (round-trip, `?ref=`, piping, closed copy, slash, notify, validators, Publish Gate) | FR consequences + §6.1 tests |

**Slice B → Phase 2**

| Slice item | PRD / addendum |
|---|---|
| `visibleWhen` equals/notEquals; 4 presets + custom; server re-validate; hidden not required | FR-RC-10 |
| No nested AND/OR, calculate, jump graph, regex, contains | FR-RC-10 out; SM-RC-C2 |
| Optional steps Identity/Details/Consent; Next/Back; one submit; off = today | FR-RC-11 |
| Not Typeform one-question default | Non-Goals; FR-RC-11 |
| Auto-steps if field count ≥ 10 | Explicitly **not** taken — toggle only (OQ 4, §9) |

**Slice C → Phase 3**

| Slice item | PRD / addendum |
|---|---|
| Chrome-light `/embed/register/{slug}`; iframe; same submit; parent query → Hidden; `postMessage` height | FR-RC-12 |
| Allow-list origins over `frame-ancestors *` | FR-RC-12 locked; addendum Embed CSP |
| Contact section fixed fields; Client + `website_inquiry`; no Activity; Core/Pro; optional A7 reuse | FR-RC-13 |
| No admin embed, no site logic IDE, no multi-form library | FR-RC-13 out; Non-Goals |

**D / E / F.** Not v1. Addendum summaries + pointer back to this file. E-off locked (three options preserved as rejected/deferred). F outbound-only; no inbound webhooks. D = platform epic wearing a field type. Ship order D (after storage) → F (if a tenant asks) → E last.

**Sequencing / risk.** Do not start C before A; B after schema bump; C1 security-highest — §6.2, Risk §14, NFR-RC-7.

**Implementation touch list** (files, validators, CSP) → addendum, correctly out of PRD body.

### Qualitative ideas the FR structure dropped

- **Per-slice host feeling.** “I don’t need Tally for Saturday.” / “Guest name only shows when they say yes.” / “I paste Cohestra on Notion, not Tally.” SM-RC-1 is a ticket proxy; FRs are mechanisms. The demo sentence at the end of the slice file (“build, `?ref=`, guest, embed — every path writes a person”) is the epic’s emotional done-when and is not an acceptance block.
- **A one-liner: modern Form tab, public page stays a form not a wizard.** FR-RC-8 is admin-only; nothing says the public page must look unchanged when Hidden Fields exist (slice A1 public UX: “Form looks unchanged”). Easy to over-chrome preview or public for attribution.
- **A2 public feel.** “`<textarea>` with the same mobile `min-h` language as other controls” — density/voice, not an FR.
- **A6 muscle memory.** Palette contents transferred; “Tally muscle memory” / “old `<select>` is not the primary path” is a consequence line, not a feel requirement (no empty-row `/` as the *document* gesture).
- **C1 Share kit voice.** “Updates automatically when you edit the form,” height guidance, preview-in-kit — trust copy for hosts who today paste Tally because they don’t trust our embed to stay current.
- **C2 “just a contact form on our homepage.”** The job is casual intake. FR-RC-13 is a Client write. The host-facing *section* (heading, intro, button, thank-you) is the feeling; it is not in the FR.
- **E as a warning, not a feature.** Slice E’s tone is “this changes what a Client is / easiest way to pollute the CRM.” Addendum locks E-off; the PRD body does not carry that fear into Phase 2 step design (Identity-then-Next is the moment E-lead would fire).

### Gaps that matter (slices)

1. **Close-at clock vs activity timezone (A5).** Slices: Close-at in “activity timezone / UTC stored.” PRD FR-RC-7: “Clock is server time only.” Hosts author Saturday 10:00 in the Activity zone; UTC-only will close at the wrong local hour. Not in Open Questions.
2. **Step assignment is unspecified (B2 → FR-RC-11).** Slices: auto-bucket by type + drag fields between step columns *inside the list editor*. FR-RC-11 is a toggle that “groups Fields.” No FR for heuristics, reorder-across-steps, or editable Identity/Details/Consent labels. Phase 2 UX/architecture will invent this.
3. **Contact section is a Client write, not a host-authored block (C2 → FR-RC-13).** Slices require heading, intro, button label, success message (fixed fields, not a Form tab). FR-RC-13 specifies field set + upsert + timeline. A story can ship a bare widget and pass the FR while missing the homepage job.
4. **Attribution surfaces stop at the Registration row (A1).** Slices v1: “at least show on registration detail **/** client answer history”; reports filter later. PRD: Registration detail only. Client history and any report/filter are absent — same hole as brief gap 1, called out here because the slice file made “client answer history” a v1 floor.
5. **Piping “sensitive” is only implied (A4).** Slices: optional sensitive flag; Hidden default not piped to public; OK in admin. FR-RC-5: Hidden not on public success. No flag for a non-hidden Field (medical notes, guest phone) and no rule for confirmation-email vs public screen vs admin. PII can pipe into a public thank-you without failing the FR.

**Not gaps (checked, transferred or correctly deferred):** D/E/F depth (addendum + pointer); embed `*` vs allow-list (locked B); E-off; schema stay-on-`1`; A8 non-blocking; popup-vs-iframe (OQ 5); notify recipient (OQ 2); circular Recipes (PRD added); file/webhook/draft out of v1.

---

## Cross-input

Both inputs agree the PRD got the spine: A=MVP, B=Phase 2, C=Phase 3, D/E/F later, identity wedge, no Tally clone.

Shared qualitative loss: **host feeling** (Form tab no longer IT; I don’t open tally.so for Saturday) became Vision + a support-ticket metric.

Shared contract hole: **where attribution is visible** (reports / client history), not whether `?ref=` persists.

Largest slice-only holes for downstream: **Close-at timezone**, **how steps are assigned**, **Contact copy controls**, **piping sensitivity**.
