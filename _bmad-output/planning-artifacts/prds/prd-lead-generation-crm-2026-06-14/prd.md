---
title: Cohestra — Product Requirements Document
status: draft
created: 2026-06-14
updated: 2026-06-14
sources:
  - Creativorare Business Proposal (Lead_Generation_CRM_Business_Proposal.pdf)
---

# PRD: Cohestra

*Working title — confirm with client.*

## 0. Document Purpose

This PRD defines the product requirements for a **Cohestra** — a centralized web platform that turns activity-based lead capture (events, clubs, campaigns) into a measurable client-growth system. It is written for product stakeholders, the delivery team (Creativorare), and downstream workflows (UX, architecture, epics).

The document is structured around a **Glossary** of domain terms, **Features** with globally numbered **Functional Requirements (FRs)**, and **User Journeys (UJs)** referenced inline. Assumptions inferred from the business proposal are tagged `[ASSUMPTION]` and indexed in §9. Technical mechanism choices live in `addendum.md`.

**Primary input:** Creativorare client proposal (`Lead_Generation_CRM_Business_Proposal.pdf`). Reconciliation extract: `reconcile-business-proposal.md`.

---

## 1. Vision

Community and activity-driven businesses capture leads through registration forms, QR codes at events, and referral-driven sign-ups — but when each activity runs on its own Google Form, lead data fragments. Operators manually copy contact details, send one-off WhatsApp or email follow-ups, and stitch together reports by hand. Duplicate and inactive leads are hard to spot, and there is no reliable view of which activities actually grow the pipeline.

The Cohestra replaces that fragmented process with a single platform: every **Activity** gets a branded registration page and **QR Code**; every submission flows into a **Master Client List** with full **Activity** and **Referral Source** context; follow-ups become structured and trackable; and **Reports** show which activities create the strongest pipeline.

The platform promise from the proposal holds for v1: **every activity becomes a measurable lead-generation engine, with no lost context after registration.**

---

## 2. Target User

### 2.1 Jobs To Be Done

**Business operator (admin)**
- Launch a new activity registration flow in minutes without requesting a custom form build each time.
- See live counts of registrations, new leads, and activity performance without manual spreadsheet work.
- Maintain one reliable **Client** record per person, even when they register for multiple activities.
- Follow up personally (email, WhatsApp) while keeping history and status organized.
- Prove which communities and activities drive growth for business planning.

**Activity participant (lead)**
- Register for an activity quickly from a phone scan or shared link.
- Provide only the information relevant to that activity, with clear consent for future communication.
- Receive timely reminders and follow-ups without re-entering contact details.

### 2.2 Non-Users (v1)

- **Multi-tenant SaaS customers** — v1 is built for a single business operator and their activity communities, not a self-serve CRM marketplace.
- **Sales reps with complex pipeline stages** — v1 focuses on activity-led capture and follow-up, not enterprise sales forecasting or deal desks.
- **End users managing their own profile** — participants do not log in; they register via public forms only.

### 2.3 Key User Journeys

- **UJ-1. Elena registers at the Sunday pickleball clinic.**
  - **Persona + context:** Elena, first-time pickleball player, hears about Ikigai Dink & Drive from a friend and scans the event QR at the venue.
  - **Entry state:** Unauthenticated; mobile browser after QR scan.
  - **Path:** Opens public registration page → completes name, profession, contact, first-timer status, playing level, invited-by, referral source → submits consent implicitly via form → sees confirmation.
  - **Climax:** Submission succeeds; Elena knows she's registered without creating an account.
  - **Resolution:** **Client** record created or updated in master list; **Registration** linked to Pickleball activity and referral source; dashboard counts increment.
  - **Edge case:** Elena registered for Board Game Night last month with the same phone — system updates existing **Client** profile and adds new **Registration** rather than creating a duplicate.

- **UJ-2. Marco sets up a new tennis clinic activity.**
  - **Persona + context:** Marco, community operator for The Golden Hour Club, launching a weekend tennis clinic.
  - **Entry state:** Authenticated admin on web dashboard.
  - **Path:** Creates **Activity** (name, category, schedule, location, status) → configures **Form** with TGH template fields (tennis level, clinic interest, referral source, etc.) → publishes → copies public link and downloads **QR Code** → shares via Instagram and print at venue.
  - **Climax:** QR and link are live; Marco can monitor incoming registrations on the dashboard without touching Google Forms.
  - **Resolution:** Activity is an active lead engine; attendee list grows in real time.

- **UJ-3. Marco reviews the week and follows up with new leads.**
  - **Persona + context:** Marco, end of week, preparing for Monday outreach.
  - **Entry state:** Authenticated admin; dashboard home.
  - **Path:** Opens dashboard → filters **Leads** by "new this week" and activity → opens a **Client** profile → reviews activity-specific answers and status → sends email campaign to selected segment OR uses WhatsApp click-to-message → marks follow-up status.
  - **Climax:** Follow-up is sent or initiated with full context visible; campaign or manual touch is logged on the **Client** record.
  - **Resolution:** Weekly report reflects follow-up coverage; inactive leads flagged for next review.

- **UJ-4. Marco exports the monthly performance report.**
  - **Persona + context:** Marco, monthly business review with community stakeholders.
  - **Entry state:** Authenticated admin; Reports section.
  - **Path:** Selects monthly date range → applies filters (activity, community, lead status, referral source) → reviews lead growth, community ranking, repeat participants, inactive clients, campaign results → exports report.
  - **Climax:** Export file downloads with data needed for planning — no manual consolidation.
  - **Resolution:** Stakeholders can decide which activities to scale next month.

---

## 3. Glossary

- **Activity** — A business-run event, club session, campaign, or community touchpoint that accepts registrations. Has schedule, location, category, status, an associated **Form**, public registration URL, and **QR Code**. All **Registrations** link to exactly one Activity.

- **Activity Engine** — The product capability that lets an operator create Activities, configure Forms, generate QR codes and public links, and monitor captured leads without rebuilding processes manually.

- **Campaign** — A structured outbound communication (email in MVP; WhatsApp in later phases) sent to a selected set of **Clients**, with message content, send time, and per-**Client** delivery history.

- **Client** — A person in the **Master Client List**, identified primarily by contact details. Holds master profile fields, **Lead Status**, notes, consent and communication preferences, and links to all **Registrations**, **Campaigns**, and follow-up history. Synonyms like "lead" or "contact" in UI copy must map to this term in requirements.

- **Community** — A business grouping for activities and lead attribution (e.g., TGH Tennis Club, Ikigai Pickleball). Operators manage a **Community catalog** (CRUD under Activities → Communities). Each Activity stores a community **label** copied from the catalog at assign time; reports, client filters, and activity filters match on that label. Not a separate tenant.

- **Category** — Activity classification (e.g., Tennis Clinic, Pickleball Session). Operators manage a **Category catalog** (CRUD under Activities → Categories). Activities store a category **label** denormalized from the catalog; activity create and list filters use catalog dropdowns.

- **Form** — The field schema and validation rules for an Activity's public registration page, including required fields, optional fields, custom questions, consent capture, and **Referral Source** options.

- **Lead Status** — Operator-defined lifecycle label on a **Client** (e.g., new, contacted, active, inactive). Drives reporting and follow-up queues.

- **Master Client List** — The authoritative database of **Clients** and their relationship history across all Activities.

- **QR Code** — Machine-readable image encoding an Activity's public registration URL, generated per Activity for print and digital distribution.

- **Referral Source** — How a registrant heard about the Activity (e.g., Instagram, friend referral, invited by, other). Captured on the **Form** and stored on the **Registration**.

- **Registration** — A single submission event where a participant completes an Activity's public **Form**. Stores activity-specific answers and links to one **Client** and one **Activity**.

- **Registration number** — Human-readable identifier assigned to each **Registration** at submit time (distinct from internal UUID). One number per client per activity. Shown to the participant on success and to operators in admin surfaces.

- **Report** — A filtered, time-bounded view of registrations, lead growth, activity performance, community metrics, follow-up status, and campaign outcomes, exportable for business review.

---

## 4. Features

### 4.1 Activity Engine

**Description:** Operators create and reuse Activities instead of one-off Google Forms. Each Activity includes setup metadata, a configurable Form, a public registration page, and a QR Code. Supports the three existing lead-engine patterns from the proposal (TGH Tennis, Ikigai Pickleball, Ikigai Board Game Night) as launch templates. Realizes UJ-1, UJ-2.

**Functional Requirements:**

#### FR-1: Create and manage Activities

An authenticated operator can create, edit, and archive an **Activity** with name, category, schedule, location, status, and business purpose. Realizes UJ-2.

**Consequences (testable):**
- Archived Activities stop accepting new **Registrations** but retain historical data.
- Activity list is searchable and filterable by status and category.
- Each Activity exposes a unique public registration URL.

#### FR-2: Configure Activity Forms

An operator can define a **Form** per **Activity** with required fields, optional fields, custom questions, consent capture, and **Referral Source** options. Realizes UJ-2.

**Consequences (testable):**
- Required fields block submission until valid.
- Form changes apply to new **Registrations** only; prior submissions retain captured answers.
- Three preset templates match the proposal's TGH Tennis, Pickleball, and Board Game Night field sets.

#### FR-3: Generate QR Code and public registration link

The system generates a **QR Code** and public URL per published **Activity**. Realizes UJ-1, UJ-2.

**Consequences (testable):**
- QR resolves to the same URL as the public link for that Activity.
- Public page loads on mobile without authentication.
- Unpublished or archived Activities return a clear unavailable state on the public URL.

#### FR-4: Capture Registrations from public Forms

A participant can submit an Activity's public **Form** without an account. Realizes UJ-1.

**Consequences (testable):**
- Successful submission creates a **Registration** linked to the **Activity**.
- Submission triggers create-or-update logic on the **Master Client List** (see FR-6).
- Participant sees an on-screen confirmation; no login is required.
- Each **Registration** receives a unique human-readable **Registration number** (`REG` + UTC date + 6-digit sequence) for check-in and support.
- The confirmation screen displays the registration number prominently.
- A second submit by the same **Client** for the same **Activity** is rejected (duplicate blocked).
- Operators see registration numbers on activity registration lists, client history, and report exports.

**Notes:** `[NOTE FOR PM]` Confirm whether partial save / resume-later is needed for long forms — proposal implies single-session completion.

---

### 4.2 Master Client List & Client Profiles

**Description:** A single **Client** record preserves master profile data, per-activity answers, referral history, **Lead Status**, and relationship movement across Activities and **Campaigns**. Duplicate detection runs on contact details. Realizes UJ-1, UJ-3.

**Functional Requirements:**

#### FR-5: Maintain master Client profile

The system stores per **Client**: name, contact number, email or social handle, profession, nationality, residency (when captured), consent and communication preference, **Lead Status**, notes, and referral/invited-by details. Realizes UJ-3.

**Consequences (testable):**
- Profile displays master fields plus activity-specific answer history.
- Operators can edit **Lead Status** and notes from the profile view.
- Inactive vs. active distinction is visible and filterable.

#### FR-6: Deduplicate Clients on registration

On each **Registration**, the system matches existing **Clients** by normalized contact details before creating a new record. Realizes UJ-1 edge case.

**Consequences (testable):**
- Matching phone number (and email when present) updates the existing **Client** rather than creating a duplicate.
- Operator can view merge-suspect pairs `[ASSUMPTION: manual merge UI is MVP-minimal — flag only, merge in Phase 2 if not in MVP]`.
- Each **Registration** remains a distinct record even when **Client** is deduplicated.

#### FR-7: Relationship view per Client

An operator can view a **Client**'s Activities registered, **Campaigns** received, follow-up history, **Referral Source** history, and active/inactive status. Realizes UJ-3.

**Consequences (testable):**
- Relationship view lists all **Registrations** chronologically with Activity name and date.
- Follow-up actions (email sent, WhatsApp initiated, status changes) append to history with timestamp.

**Notes:** "Activities attended" appears in the proposal relationship view; attendance tracking is Phase 2 (see §6). MVP relationship view covers **Registrations** only unless check-in is pulled forward.

---

### 4.3 Real-Time Dashboard

**Description:** Live operational visibility for operators — registrations, new leads, active **Clients**, **Campaigns**, and **Activity** performance without manual consolidation. Realizes UJ-3.

**Functional Requirements:**

#### FR-8: Display operational dashboard metrics

An authenticated operator sees at-a-glance counts including total leads, new leads in period, active lead engines (Activities), and follow-up coverage percentage. Realizes UJ-3.

**Consequences (testable):**
- Metrics refresh to reflect new **Registrations** without full page rebuild `[ASSUMPTION: near-real-time within 60 seconds is acceptable for MVP]`.
- Dashboard loads within 3 seconds on standard broadband.
- Empty state displays when no Activities exist yet.

#### FR-9: Activity performance on dashboard

Dashboard highlights per-**Activity** registration volume and ranking for the selected period. Realizes UJ-3, UJ-4.

**Consequences (testable):**
- Operator can see which Activities drove the most **Registrations** in the current week.
- Click-through navigates to Activity detail or filtered **Client** list.

---

### 4.4 Reports

**Description:** Weekly and monthly business views with filters and export, replacing manual spreadsheet consolidation. Realizes UJ-4.

**Functional Requirements:**

#### FR-10: Generate weekly and monthly Reports

An operator can run **Reports** for weekly and monthly periods showing activities hosted, registrations, new leads, follow-up status, activity ranking, lead growth, community ranking, repeat participants, inactive **Clients**, and **Campaign** results. Realizes UJ-4.

**Consequences (testable):**
- Weekly and monthly presets set date range automatically.
- Report data matches underlying **Registration** and **Client** records (reconcilable).

#### FR-11: Filter and export Reports

An operator can filter **Reports** by date range, **Activity**, **Community**, **Lead Status**, and **Referral Source**, and export results. Realizes UJ-4.

**Consequences (testable):**
- Export produces a downloadable file `[ASSUMPTION: CSV export satisfies MVP "export-ready" requirement]`.
- Filters combine conjunctively (AND semantics).
- Export respects applied filters.

---

### 4.5 Email Campaigns

**Description:** Structured email follow-up — announcements, reminders, promotions, welcome messages, post-event follow-up — with reusable templates and per-**Client** history. Realizes UJ-3.

**Functional Requirements:**

#### FR-12: Compose and send email Campaigns

An operator can create an email **Campaign** with subject, body, and recipient selection from **Client** segments (by **Activity**, **Lead Status**, **Community**, or manual selection). Realizes UJ-3.

**Consequences (testable):**
- Send action delivers email to all selected recipients with valid email addresses.
- Failed sends are logged with reason.
- Welcome email can be triggered manually after registration `[ASSUMPTION: automated welcome on submit is Phase 2 unless confirmed for MVP]`.

#### FR-13: Reusable email templates and Campaign history

An operator can save message templates and view **Campaign** history per **Client**. Realizes UJ-3.

**Consequences (testable):**
- Templates are selectable when composing a new **Campaign**.
- **Client** profile shows sent **Campaigns** with date and subject.

**Feature-specific NFRs:**
- Email content must not expose other recipients (BCC or individual send).

---

### 4.6 WhatsApp Follow-Up (MVP)

**Description:** Personal WhatsApp outreach assisted from the platform — click-to-message from **Client** profile using registered mobile number, with manual follow-up status tracking. Full WhatsApp Business automation is explicitly Phase 2. Realizes UJ-3.

**Functional Requirements:**

#### FR-14: WhatsApp click-to-message from Client profile

An operator can initiate WhatsApp chat from a **Client** profile using the registered mobile number (deep link / click-to-message). Realizes UJ-3.

**Consequences (testable):**
- Action opens WhatsApp (app or web) with the **Client**'s number pre-filled.
- Works on operator's mobile and desktop environments where WhatsApp is available.

#### FR-15: Track manual WhatsApp follow-up status

An operator can record WhatsApp follow-up status on the **Client** record (e.g., contacted, awaiting reply). Realizes UJ-3.

**Consequences (testable):**
- Status change appends to follow-up history with timestamp and operator note optional.
- Dashboard follow-up coverage metric includes WhatsApp-touched **Clients**.

---

### 4.7 Administration & Access

**Description:** Authenticated access for business operators to manage the platform. `[ASSUMPTION: MVP is single-tenant with one or few admin users; role-based access is Phase 2 per proposal.]`

**Functional Requirements:**

#### FR-16: Authenticate operators

Only authenticated users can access dashboard, **Client** records, **Activity** management, **Reports**, and **Campaigns**. Realizes UJ-2, UJ-3, UJ-4.

**Consequences (testable):**
- Unauthenticated requests to admin routes redirect to login.
- Session expires after configurable inactivity period `[ASSUMPTION: 24-hour session acceptable for MVP]`.

---

## 5. Non-Goals (Explicit)

- **Generic multi-tenant SaaS** — not building a platform for unrelated businesses to self-onboard in v1.
- **Full sales CRM** — no deal stages, forecasting, or CPQ in v1.
- **Automated WhatsApp Business messaging** — deferred to Phase 2; MVP is click-to-message plus manual status only.
- **Automated email drip sequences** — deferred to Phase 2.
- **Lead scoring and conversion AI** — deferred to Phase 2.
- **Attendance check-in / "activities attended" tracking** — deferred to Phase 2 unless explicitly pulled into MVP.
- **Custom report builder** — deferred to Phase 2; MVP provides preset weekly/monthly **Reports** with filters and export.
- **Participant login or self-service profile portal** — public registration only.

---

## 6. MVP Scope

### 6.1 In Scope

- Admin authentication and dashboard (FR-8, FR-9, FR-16)
- **Master Client List** with profiles, deduplication, relationship view (FR-5, FR-6, FR-7)
- **Activity Engine**: create Activities, configure Forms, QR codes, public registration pages (FR-1–FR-4)
- Launch templates for TGH Tennis, Ikigai Pickleball, Ikigai Board Game Night field sets (FR-2)
- **Reports**: weekly/monthly views, filters, CSV export (FR-10, FR-11)
- Email **Campaign** foundation: compose, send, templates, per-client history (FR-12, FR-13)
- WhatsApp click-to-message and manual follow-up status (FR-14, FR-15)

### 6.2 Out of Scope for MVP

| Item | Reason |
|------|--------|
| Automated email sequences | Phase 2 — validate manual campaigns first |
| WhatsApp Business API integration | Phase 2 — requires approved business messaging setup |
| Advanced referral tracking beyond form capture | Phase 2 |
| Lead scoring and conversion insights | Phase 2 |
| Attendance check-in | Phase 2 — proposal lists under expansion |
| Advanced analytics dashboard | Phase 2 — MVP dashboard covers core metrics |
| Role-based admin access | Phase 2 |
| Custom report builder | Phase 2 |
| Manual duplicate merge UI | `[NOTE FOR PM]` May pull into MVP if dedup flags create operator pain |

### 6.3 Shipped Post-MVP Enhancements (Epic 6, 2026-06-22)

The following capabilities shipped after MVP closure and are in production use:

- **Community catalog** — Operators CRUD communities; view leads per community; filter clients and activities by community name.
- **Category catalog** — Operators CRUD categories; activity create and list filters use catalog dropdowns.
- **Form field editor UX** — Two-panel ordered editor with scrollable properties; responsive layout.
- **Client outreach UX** — Timeline scroll bounds; WhatsApp follow-up save requires changed status or note; toast deduplication.
- **Campaign/consent hardening** — Consent on legacy form templates; backfill for legacy email clients; SendGrid error surfacing.

**Model note:** Activities store `communityLabel` and `category` as **denormalized strings** synchronized on catalog rename; catalog delete is blocked while activities reference the label. FK migration is optional Phase 2 work (see Epic 7/8 in sprint plan).

### 6.4 UAT Polish — Registration numbers & demo seed (2026-06-27)

The following capabilities shipped during UAT polish (post–Epic 7):

- **Registration numbers** — Participant-facing check-in IDs on public confirmation; admin activity registrations, client history, and report CSV export.
- **Duplicate registration guard** — One registration per client per activity; second public submit rejected.
- **Activity list registration counts** — Live totals on activity cards (not hardcoded zero).
- **Demo seed v2** — Optional full business wipe and reseed: 6 communities × 10 activities × 100 clients × 6,000 registrations (development/UAT only; `DemoDataSeed:Enabled`).
- **UX polish** — AlertDialog confirmations (unpublish, template apply, campaign send); archive/delete catalog modals; form field drag-and-drop reorder; toast and theme fixes.

### 6.5 UAT Polish — Deploy, HTTPS & operator auth (2026-06-30)

The following capabilities shipped during droplet UAT hardening (post–§6.4):

- **Docker nginx** — Single public entry point; same routing in local Compose and UAT/production Compose.
- **GitHub Actions CD** — Automated deploy to DigitalOcean droplet via SSH after CI on `main`.
- **Temporary HTTPS** — nip.io + Let's Encrypt for UAT without a client domain; cert renewal and domain-switch scripts included.
- **Operator self-service** — Register, email OTP verify, forgot/reset password; single-operator enforcement.
- **Public URL hardening** — Hero image rewrite for emails and public forms; SendGrid OTP failure surfacing; HTTP fallbacks for clipboard/idempotency until HTTPS is active.
- **Activity list** — Created date/time on activity cards.

---

## 7. Success Metrics

**Primary**

- **SM-1: Registration-to-master-list reliability** — 100% of successful public **Form** submissions create a **Registration** and **Client** link within 60 seconds. Validates FR-4, FR-6.
- **SM-2: Operator time saved on reporting** — Operator produces weekly activity report in under 5 minutes (vs. manual baseline). Validates FR-10, FR-11. `[ASSUMPTION: baseline measured in Week 1 discovery]`
- **SM-3: Follow-up coverage** — ≥70% of new **Clients** in a rolling 30-day window have at least one logged follow-up (email **Campaign** or WhatsApp status). Validates FR-12–FR-15. Proposal cited 76% as illustrative target.

**Secondary**

- **SM-4: Activity launch speed** — Operator publishes a new **Activity** with **Form** and **QR Code** in under 15 minutes without developer support. Validates FR-1–FR-3.
- **SM-5: Duplicate rate** — <5% of **Clients** flagged as probable duplicates weekly after dedup rules tuned. Validates FR-6.

**Counter-metrics (do not optimize)**

- **SM-C1: Raw registration volume alone** — Do not scale low-quality Activities that produce non-responsive **Clients**; pair growth with follow-up coverage (SM-3).
- **SM-C2: Campaign send volume** — Do not maximize blast frequency; respect consent and communication preferences on **Client** records.

---

## 8. Cross-Cutting Non-Functional Requirements

- **Performance:** Public registration page interactive within 2s on 4G mobile; admin dashboard within 3s as above.
- **Availability:** `[ASSUMPTION: 99% uptime during business hours acceptable for MVP single-client deployment]`
- **Security:** Admin routes require authentication; public forms protected against basic abuse (rate limiting, bot mitigation).
- **Privacy & consent:** Consent captured on **Forms** where required (e.g., Board Game community consent); communication preferences honored on **Campaign** recipient selection.
- **Data integrity:** **Registrations** are immutable after submit; profile corrections are audited in follow-up history.
- **Observability:** Error logging for failed email sends and registration failures; operator-visible error on failed submit.

---

## 9. Platform

- **Form factor:** Web application — responsive admin dashboard for operators; mobile-friendly public registration pages for QR journeys (UJ-1).
- **Surfaces:** Admin (authenticated web); Public registration (unauthenticated web per Activity URL).
- **Phase 2 surfaces:** WhatsApp Business integration, attendance check-in (likely mobile-friendly operator flow).

---

## 10. Why Now

The client already runs active lead engines (TGH Tennis, Ikigai Pickleball, Board Game Night) but loses measurable context once forms are submitted. Consolidating now — before adding more activities — prevents further data fragmentation and establishes a baseline for follow-up coverage and activity ROI reporting.

---

## 11. Open Questions

1. **MVP attendance:** Does relationship view require "attended" in v1, or is registration-only sufficient until Phase 2 check-in?
2. **Duplicate merge:** Is flag-only dedup enough for MVP, or do operators need one-click merge?
3. **Welcome email:** Should a welcome **Campaign** fire automatically on registration, or remain operator-triggered in MVP?
4. **Export format:** Is CSV sufficient, or do stakeholders require PDF layout for monthly reviews?
5. **Email sender domain:** Which domain and provider will send **Campaigns** (affects DNS, deliverability, and compliance)?
6. **Lead Status taxonomy:** What are the canonical statuses at launch (new, contacted, active, inactive — others)?
7. **Community model:** ~~Are communities fixed or operator-defined?~~ **Resolved (Epic 6):** Operator-defined Community catalog; activities store denormalized label.
8. **Admin users:** How many operator accounts needed at launch (single vs. small team sharing one login)?

---

## 12. Assumptions Index

- §4.1 FR-8 — Near-real-time dashboard refresh within 60 seconds is acceptable for MVP.
- §4.1 FR-3 — Public registration hosted as unauthenticated routes on the same web application.
- §4.2 FR-6 — Duplicate matching uses normalized phone and email; manual merge UI may be minimal in MVP.
- §4.2 FR-7 — "Activities attended" deferred; MVP relationship view is registration-based.
- §4.5 FR-12 — Automated welcome email on submit is Phase 2 unless Open Question 3 resolves otherwise.
- §4.7 FR-16 — Single-tenant deployment with one/few admin users; RBAC Phase 2.
- §4.7 FR-16 — 24-hour admin session lifetime acceptable.
- §3 Glossary — **Community** and **Category** use operator-managed catalogs; activities store denormalized labels (not FK in Epic 6).
- §7 SM-2 — Manual reporting baseline captured in Week 1 discovery.
- §8 — 99% uptime during business hours acceptable for MVP.
- §4.4 FR-11 — CSV export satisfies "export-ready" for MVP.
