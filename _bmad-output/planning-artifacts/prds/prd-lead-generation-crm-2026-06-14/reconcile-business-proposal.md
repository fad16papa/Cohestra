# Input Reconciliation — Cohestra Business Proposal

**Source:** `/Users/francisdecena/Downloads/Lead_Generation_CRM_Business_Proposal.pdf` (Creativorare, 12 pages)

## Extracted requirements

### Vision & problem
- Client has active lead engines via separate Google Forms; manual consolidation, follow-ups, and reporting.
- Goal: one measurable client-growth system from QR scan → master list → follow-up → reports.

### Core workflow (5 steps)
1. Create Activity (club, event, campaign, schedule, purpose)
2. Build Form (required/optional fields, consent, referral source, custom questions)
3. Share QR (public registration link + QR per activity)
4. Capture Leads (master list, linked to source activity)
5. Follow Up (status tracking, campaigns, reports)

### Core capabilities (MVP)
- Real-time dashboard (registrations, new leads, active clients, campaigns, activity performance)
- Lead & client master records (profile, source activity, referral, status, notes, duplicate check)
- Activity Engine (activities, forms, QR, registration links)
- Reports (weekly/monthly, filters, export)
- Email campaigns (templates, history per client)
- WhatsApp MVP: click-to-message from profile; track manual follow-up status

### Existing lead engines to support
1. **The Golden Hour Club / TGH Tennis** — name, contact, Instagram, nationality, profession, tennis level, clinic interest, referral source
2. **Ikigai Dink & Drive (Pickleball / Sunday 7AM)** — name, profession, contact, first-timer, playing level, invited by, referral source
3. **Ikigai Board Game Night** — full name, phone, profession, residency, community consent, Facebook/Instagram, registration source

### Client profile fields
- Master: name, contact, email/social, profession, nationality, residency, consent, communication preference, lead status, notes, referral/invited-by, duplicate check
- Activity-specific answers preserved per registration
- Relationship view: activities registered/attended, communities, follow-up history, campaigns received, active/inactive

### MVP vs Phase 2
**MVP must-have:** dashboard, master list, activity engine, QR/public pages, 3 existing form patterns, basic reports/export, email campaign foundation, WhatsApp click-to-message.

**Phase 2:** automated email sequences, WhatsApp Business API, advanced referral tracking, lead scoring, attendance check-in, advanced analytics, role-based admin, custom report builder.

### Delivery roadmap (proposal)
8 weeks: discovery → core build → QR/forms → reports/campaigns → QA/launch.

## Gaps vs PRD structure (qualitative)
- **Audience:** Proposal is client-specific (communities/activities); PRD should name operator persona and participant persona explicitly.
- **Auth/RBAC:** Phase 2 mentions role-based admin; MVP assumes single admin — needs assumption.
- **Tech stack:** Proposal deliberately avoids technology; belongs in addendum not PRD.
- **Consent/compliance:** Consent fields mentioned but GDPR/local privacy rules not specified.
- **Attendance:** Listed Phase 2; relationship view mentions "attended" — MVP may be registration-only.
- **Email provider:** Not named; campaign "foundation" scope ambiguous.
- **Duplicate detection rules:** "by contact details" — exact matching logic undefined.
- **Export formats:** "export-ready" — CSV/PDF not specified.

## Disposition
All business workflow requirements → PRD §4 Features and §6 MVP Scope. Technical ambiguity → addendum + Open Questions + Assumptions.
