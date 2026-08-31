# PRD Quality Review — Registration Capture

Calibrated to: **SaaS product increment** (brownfield, chain-top into UX / architecture / stories), **Fast-path create** from a completed Tally.so study (2026-08-27/28). Not a new-product PRD. Not a coaching-path discovery draft. Judged on whether Slice A can be green-lit and extracted without inventing product law.

## Overall verdict

This is a decision-ready increment contract: the thesis (“Tally emits rows; Cohestra emits a person”), the kill list, and the A→B→C cut are honest and usable. MVP FRs are mostly testable and correctly refuse to become a form product. What is at risk is not strategy — it is a handful of MVP bounds an engineer would still have to invent (Close-at clock/timezone and unavailable precedence; piping of Hidden Field values into confirmation email; Closed message format) plus success metrics that validate the right bet but are not operationally measurable.

## Decision-readiness — strong

A decision-maker can green-light Slice A from this document. Trade-offs are stated as decisions, not “balanced considerations.” §1 names the wedge and what is given up (“We will not out-Notion Tally”). §5 and the addendum **Rejected alternatives** table kill the objections a skeptic would raise (clone Tally, webhook-import as strategy, reopen Epic 25, DnD canvas, registrant checkout, Sheets as SoR, Typeform-as-default, `form_schema` version-bump migration). Embed CSP option B vs `frame-ancestors *` is locked in the addendum and cited from FR-RC-12. Draft-as-Client is locked **E-off** with a lawful-basis reason, not a shrug.

§8 Open Questions are actually open and correctly marked non-blocking for MVP. Q3 (piping fallback) is the only one that is half-decided (“pick one in implementation”) — that is Fast-path honesty, not a rhetorical question with a hidden answer. Monetization in §15 is an `[ASSUMPTION]` (not a new SKU; defends Core/Pro), which is the right altitude for an increment.

No `[NOTE FOR PM]` callouts appear. For Fast-path that is acceptable: real tensions landed in Open Questions, Non-Goals, and the addendum lock table rather than as decorative PM stickers.

### Findings

- **[medium] Phase 3 Contact consent is a privacy decision still wearing an assumption** (§8 Q6, FR-RC-13) — “consent checkbox included if marketing follow-up is implied” is the one open item that could change the Contact contract (field set, lawful basis, LeadStatus). It does not block MVP, but it is not a mechanical leftover. *Fix:* Promote Q6 to a locked yes/no (consent Field on / off, and whether it gates marketing) before Phase 3 stories are cut — or add a `[NOTE FOR PM]` that Contact does not ship until this is answered.

## Substance over theater — strong

Nothing here is furniture. The Vision in §1 cannot be swapped into another SaaS forms PRD: it is specifically Tally’s blank page vs Cohestra’s second-event Client graph, and it names the leak (`?ref=whatsapp`, long note, closed copy). Jobs in §2.1 are roles that drive FRs (Core/Pro authoring speed, Basic’s one Activity, Participant one-thumb Form, Platform additive schema). Francis and Maya are not persona theater — they appear in UJ-RC-1–5 and map onto FR-RC-1–13.

NFRs in §11 are product-specific (additive `form_schema`, `registration_theme` stays off schema, TenantId isolation, O(fields) query parse, Outbox + SendGrid, Phase 3 CSP allow-list). There is no “must be scalable / secure / reliable” boilerplate. Counter-metrics SM-RC-C1–C3 exist specifically to stop innovation theater (more Field types, deeper Recipe nesting, Zapier-as-capture).

§10 Why Now and §15 Platform/Monetization are short on purpose. That is increment-correct, not missing strategy theater.

### Findings

*(none — dimension holds without padding)*

## Strategic coherence — strong

The thesis in §1 is load-bearing and the feature list serves it, not a backlog-with-headings. MVP (§6.1 / FR-RC-1–9) is the Saturday-tennis leak: attribution, notes, date, piping, closed copy, slash-add, operator notify. That is a **problem-solving** MVP. Phase 2 (Recipes + optional steps) and Phase 3 (Embed + Contact) are the Tally-parity features the study flagged as highest value *and* highest risk — sequenced after the leak is closed, not “easy first.” FR-RC-12 explicitly: “Highest Tally-replacement feature and highest XSS/CSP risk. Do not start before MVP.”

Success metrics validate the thesis: SM-RC-1 is “I still need Tally for Saturday” → 0; SM-RC-2 is `?ref=` surviving into Answers; SM-RC-C1–C3 name the failure modes of winning the wrong game. SM-RC-3 is an invariant guard (Publish Gate), which is correct for a brownfield increment.

The only stretch is FR-RC-13 Contact (Client, no Activity). §4.10 frames it as closing “I only wanted a contact form,” which is a Tally job adjacent to — not identical to — “who’s coming Saturday.” Gating it to Phase 3 and refusing a fake Activity keeps the thesis intact.

### Findings

- **[medium] SM-RC-1 (and SM-RC-4) validate the bet but are not operational** (§7) — “support / ‘I still need Tally for Saturday’ tickets → 0” has no baseline, window, or instrumentation. SM-RC-4 (“use Cohestra Embed more than an external Tally embed”) has no way to observe Tally embeds. For a Fast-path increment a qualitative primary is acceptable; as written, a PM cannot report the metric. *Fix:* Give SM-RC-1 a method (e.g. tag churn/support reasons; count public Forms published with Hidden Field + textarea in 30 days after ship) and mark SM-RC-4 as a research/interview check until embed telemetry exists. Keep SM-RC-2 as the hard acceptance metric.

## Done-ness clarity — adequate

MVP FRs are unusually concrete for Fast-path: each of FR-RC-1–9 has testable consequences (schema accept/reject, Publish Gate skip, `answers.ref = "wa"`, max lengths 200/2000, `YYYY-MM-DD`, Outbox type name, subject shape, no notify on draft save). FR-RC-14 pins brownfield invariants to named validators. That is why this is not *thin*.

The gaps are the ones story authors will invent:

**Close-at (FR-RC-7) is the weakest MVP spec.** Consequences cover “after Close-at, GET unavailable and submit rejected,” “server time only,” and “capacity-full still occurs.” They do not specify timezone (activity tz vs stored UTC — the addendum example is `2026-09-01T10:00:00Z`; the study said “activity timezone / UTC stored”), what happens if Close-at is in the past at save/publish, whether the operator can clear it, or the full unavailable precedence stack (capacity full vs Close-at vs paused vs Activity ended). For a Singapore-default product this is not a mechanical leftover — Friday-night Close-at at the wrong offset is a wrong product.

**Piping (FR-RC-5)** forbids Hidden Field values on the public success screen but is silent on the confirmation email (Participant-visible). The study allowed hidden in admin, not on the public screen. Email is a third surface. Fallback empty-vs-“there” is deferred (Q3) with “one rule, tested” — acceptable Fast-path deferral.

**Closed message (FR-RC-6)** has no max length or markdown-vs-plain rule (study: markdown-lite / plain, ~2000). §16 says sanitize for XSS — necessary, not sufficient for “done.”

**Phase 2 FR-RC-11** says the toggle “groups Fields into Identity / Details / Consent” without assignment rules (auto-by-type vs operator-assign vs schema `meta.pages`). A story cannot implement the toggle from this PRD alone. Acceptable only because it is post-MVP; still a hole for `bmad-create-epics-and-stories` if Phase 2 is cut from this file as-is.

No “handles X gracefully” / “user-friendly” sludge. NFR-RC-5’s O(fields) and NFR-RC-3’s WCAG 2.2 AA (via enterprise NFR-12) are bounds, not adjectives.

### Findings

- **[high] Close-at clock, timezone, and unavailable precedence are unspecified** (FR-RC-7, §4.4, UJ-RC-3) — “Clock is server time only” does not tell UX or API whether the Operator picker is activity-local, tenant-local, or UTC, nor which closed reason wins when several apply. *Fix:* Lock (1) storage as UTC instant, display in Activity timezone; (2) precedence: capacity full → paused → Close-at → Activity ended → platform default; (3) empty Close-at = no datetime close. Put the lock in FR-RC-7 consequences.

- **[medium] Hidden Field piping into confirmation email is undefined** (FR-RC-5, §3 Piping token) — Public success is forbidden; admin Registration detail (FR-RC-2) shows the value. Confirmation email is sent to the Participant. *Fix:* One consequence: Hidden Field values are never substituted into Participant-visible surfaces (success screen **and** confirmation email). Admin/operator notify may include them.

- **[medium] Closed message has no format or length bound** (FR-RC-6) — XSS sanitize in §16 is not an authoring contract. *Fix:* Add max length (2000) and “plain text or markdown-lite, no images” to FR-RC-6 (aligns NFR-RC-3 “not image-only”).

- **[medium] Phase 2 step grouping has no assignment rule** (FR-RC-11) — “Split into steps” is testable as chrome on/off; “groups Fields into Identity / Details / Consent” is not. *Fix:* Before Phase 2 stories, specify auto-bucket by Field type (email/phone/name → Identity; consent → Consent; else Details) **or** explicit `step` on each Field. Do not leave both open.

## Scope honesty — strong

Omissions do real work. §5 Non-Goals is a kill list, not a template section. §6.2 and per-FR **Out of Scope** lines keep Recipes, steps, Embed, Contact, file, drafts, HMAC webhooks, Slack, Zapier-out, and Tally import from leaking into MVP. D/E/F live in the addendum with “not epic v1.” `[ASSUMPTION]` tags sit on the inferences Fast-path had to make (FR-RC-9 default on, FR-RC-11 toggle-only, FR-RC-12 allow-list, FR-RC-13 Core/Pro + endpoint). §8 states none of the open questions block MVP.

Open-items density (6 questions, ~8 indexed assumptions, 0 `[NOTE FOR PM]`) is healthy for Fast-path stakes — not a green-light blocker.

Two soft edges, neither silent de-scope:

### Findings

- **[low] Bot friction is in, out, and optional at once** (§6.2, §8 Q1, §9 A8) — “non-blocking; ship with MVP if keys are cheap, else after” lets a story sneak in or vanish without a product decision. *Fix:* Treat A8 as explicitly **not in Slice A stories** unless keys are already in the environment; keep Q1 as the revisit trigger (“when public spam appears”).

- **[low] Contact → operator email is “optional reuse of FR-RC-9”** (FR-RC-13) — in or out is not scoped. *Fix:* One line: Phase 3 Contact does / does not enqueue `RegistrationOperatorNotify` (or a sibling `WebsiteInquiryOperatorNotify`).

## Downstream usability — adequate

This PRD is chain-top (`bmad-ux`, `bmad-spec`, `bmad-create-epics-and-stories` are named in §17). Extractability is mostly clean: Glossary §3 is the vocabulary contract; FR-RC-1–14, UJ-RC-1–5, SM-RC-1–4 + C1–C3 are contiguous and namespaced against Touchpoints FR-1–4 and Studio FR-RES-*. Each UJ has a named protagonist (Francis / Maya) and Phase 2/3 tags on UJ-RC-4/5 so new journeys are not confused with shipped ones. §13 and the addendum touch list give architecture a brownfield starting set without turning the PRD into a task list. Schema examples in the addendum match FR-RC-1–7 keys (`closedMessage`, `registrationClosesAt`, `hidden` / `textarea` / `date`).

What keeps this from *strong* is roundtrip and a couple of cite/synonym leaks that will show up when another skill source-extracts.

### Findings

- **[medium] Assumptions Index is not a true roundtrip** (§9 vs inline `[ASSUMPTION]`) — Index includes Fast-path mode, MVP=A, `version` stays 1, Slice A on every Form-tab plan, E-off, and “notify To: tenant admin” that never appear as inline tags. Inline tags (FR-RC-9, 11, 12, 13, §6.2 bot friction) are only a subset. Downstream will miss plan-availability and E-off if they grep tags only. *Fix:* Either tag those five inline where they are decided (§6, §15, FR-RC-9, addendum E) or mark index-only rows as “locked in memlog / addendum, not an open inference.”

- **[low] Glossary cites “FR-2 immutability”** (§3 Answer) — Document Purpose maps base-CRM **FR-2** to “one Form per Activity” and **FR-4** to public submit + Client dedup. Immutability is not FR-2. *Fix:* Cite the correct base FR (or drop the ID and say “Answer immutability, existing”).

## Shape fit — strong

The shape matches a brownfield SaaS increment with meaningful UX, not an internal-only capability spec and not a consumer greenfield. Vision + Features is the right Fast-path entry; UJs are load-bearing (Operator authoring + unauthenticated Participant + closed state) with personas inline, no standalone persona section. Adapt-in clusters that this increment actually carries are present: Data Governance (§16), Integration (§13), Risk (§14), Constraints/Privacy (§12), Platform/Monetization (§15). Mechanism, rejected alternatives, and file paths are correctly in `addendum.md`.

It is not over-formalized: five UJs for three phases, Phase 2/3 marked, no traceability matrix. It is not under-formalized: a Form-tab + public `/register/{slug}` change that steals Tally muscle memory needs Francis/Maya, and it has them. Brownfield references (Studio theme split, Touchpoints resolver, Publish Gate, UX-DR32/DR24/DR20) distinguish “do not reopen” from “narrow reopen as a new epic.”

§0 Document Purpose states audience and ID namespacing up front — the right cover sheet for a sibling-PRD increment.

### Findings

*(none — shape matches the product and the working mode)*

## Mechanical notes

- **Glossary drift (minor):** Palette says “Referral” (§4.5 / FR-RC-8); glossary type enum is `referral_source`. “Closed message” / “closed copy” / “unavailable state” are used interchangeably; the Glossary term is **Closed message**. “Website inquiry” vs addendum `website_inquiry` timeline event — same object, different casing.
- **ID continuity:** FR-RC-1–14, UJ-RC-1–5, SM-RC-1–4, SM-RC-C1–C3 — no gaps or duplicates. Cross-refs to Touchpoints FR-1 and Studio FR-RES-2.1 resolve as stated. Base-CRM “FR-2 immutability” is the one broken cite (see Downstream finding).
- **Assumptions Index roundtrip:** Incomplete — see Downstream finding. Memlog locks (C1 allow-list, C2 no Activity, E-off, A7 default on) match the PRD even where tags are missing.
- **UJ protagonists:** UJ-RC-1, 3, 4, 5 = Francis; UJ-RC-2 = Maya. Context is inline. UJ-RC-4/5 correctly labeled Phase 2/3.
- **Required sections for increment + Fast-path:** Essential spine present (Vision, users/UJs, Glossary, Features/FRs, Non-Goals, MVP, Success Metrics + counters, Open Questions, Assumptions, NFRs). Adapt-in concerns that apply (privacy, brownfield integration, embed security, plan gates) are covered. No missing section a reviewer would demand for this shape.
- **Addendum hygiene:** Mechanism and schema examples are out of the PRD body. Implementation touch list is explicitly “not a task list.” Good.
