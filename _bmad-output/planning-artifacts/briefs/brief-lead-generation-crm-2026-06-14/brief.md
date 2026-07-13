---
title: Activity Lead Engine & Client Growth Platform
status: draft
created: 2026-06-14
updated: 2026-06-14
type: retrospective
sources:
  - Creativorare Business Proposal (Lead_Generation_CRM_Business_Proposal.pdf)
  - market-lead-generation-crm-saas-research-2026-06-14.md
  - prd-lead-generation-crm-2026-06-14/prd.md
---

# Product Brief: Activity Lead Engine & Client Growth Platform

*Working title — confirm with client. Replaces generic "Lead Generation CRM" positioning.*

## Executive Summary

Community and activity-led businesses already generate leads — tennis clinics, pickleball sessions, board game nights — but each event runs on its own Google Form. Contact details land in scattered spreadsheets. Follow-ups happen one-by-one on WhatsApp. Duplicates go unnoticed. No one can answer which activity actually grows the pipeline.

This product replaces that fragmented stack with a single **Activity Lead Engine**: every activity gets a branded registration page and QR code; every submission flows into one **Master Client List** with full activity and referral context; operators follow up with structure; and reports show which communities convert.

The first delivery is a **custom build for one operator** (Marco) and his existing activity communities — TGH Tennis Club, Ikigai Pickleball, Ikigai Board Game Night — over an **8-week MVP**. Market research validates strong problem-solution fit. The moat is not "better forms"; it is **continuity from activity to pipeline** — deduplicated clients, attribution on every registration, and follow-up coverage operators can measure.

**Why now:** The client is already running three lead engines. Every new activity added without consolidation deepens the data fragmentation. Consolidating before expansion establishes a baseline for follow-up coverage and activity ROI.

## The Problem

**Who feels it:** A business operator running multiple community activities (Marco archetype) — not enterprise sales teams, not self-serve SaaS buyers.

**The pain, specifically:**
- Separate Google Forms per activity; no unified client view
- Manual export, copy-paste, and spreadsheet pivoting for weekly reports
- One-by-one WhatsApp/email outreach with no shared history on the client record
- Duplicate and inactive leads hidden across forms
- No reliable answer to: *Which activity drove our best members?*

**Cost of status quo:** Admin time (estimated 5–10 hours/week in comparable setups), delayed follow-ups, data entry errors, and decisions made without attribution — not because Google Forms fails at capture, but because **nothing connects capture to growth**.

## The Solution

A responsive **web application** with two surfaces:

1. **Public registration** — mobile-friendly pages and QR codes per activity; no account required for participants.
2. **Operator dashboard** — authenticated admin for activity setup, client management, follow-up, and reporting.

**Core loop (MVP must ship this chain end-to-end):**

Activity setup → public registration / QR → master client list (with dedup) → structured follow-up (email + WhatsApp click-to-message) → weekly/monthly reports with export.

Every activity becomes a measurable lead-generation engine. No lost context after registration.

## What Makes This Different

| vs. Google Forms + spreadsheets | vs. horizontal CRM (HubSpot, Zoho) |
|----------------------------------|-------------------------------------|
| Remembers **people in context** across activities, not isolated submissions | Purpose-built for **activity-led communities**, not generic sales pipelines |
| Dedup at ingestion; referral source travels with every registration | No 6-month configuration project to replicate three existing form templates |
| Operator actions from client profile (history visible, WhatsApp deep link) | Over-featured and over-priced for a single operator with 3–5 activities |

**Honest moat:** Execution speed on this client's exact workflow, plus the **Activity Engine** abstraction — not proprietary AI or network effects at launch.

**Positioning line:** *"You're already generating leads. You just can't see them."* Alternative battle cry from strategy review: *"From activity to pipeline — automatically."*

## Who This Serves

**Primary — Business operator (admin)**
- Launches new activity registration in minutes without a custom form build each time
- Sees live registration counts and activity performance without manual consolidation
- Maintains one client record per person across tennis, pickleball, and board game activities
- Follows up personally while keeping history and status organized
- Proves which communities drive growth for planning

**Secondary — Activity participant (lead)**
- Registers quickly from phone scan or shared link
- Provides activity-relevant information once; no account creation
- Receives timely follow-ups without re-entering contact details

**Explicit non-users (v1):** Multi-tenant SaaS customers, enterprise sales reps, participant self-service portals.

`[ASSUMPTION: Primary growth goal is mixed retention + acquisition — confirm whether Marco optimizes for existing member depth or net-new pipeline.]`

## Success Criteria

**User success**
- Operator publishes a new activity with form and QR in under 15 minutes
- Weekly activity report produced in under 5 minutes (vs. manual baseline captured in Week 1 discovery)
- ≥70% of new clients receive at least one logged follow-up within 30 days

**System success**
- 100% of successful form submissions create registration + client link within 60 seconds
- Duplicate rate below 5% after dedup rules tuned
- Public registration page interactive within 2s on mobile 4G

**Business success**
- Client signs off MVP at Week 8 with the core loop demonstrably working
- `[ASSUMPTION]` Creativorare can reuse Activity Engine patterns for a second community client without schema rebuild

**Do not optimize:** Raw registration volume without follow-up coverage; campaign blast frequency over consent.

## Scope

**In (8-week MVP)**
- Admin auth and dashboard with core metrics
- Activity Engine: create activities, configure forms, QR codes, public pages
- Launch templates for TGH Tennis, Ikigai Pickleball, Ikigai Board Game Night
- Master Client List: profiles, deduplication, relationship view (registration-based)
- Reports: weekly/monthly views, filters, CSV export
- Email: `[ASSUMPTION]` manual campaign compose + per-client history; transactional registration confirmation — not automated drip sequences
- WhatsApp click-to-message from client profile + manual follow-up status

**Out (Phase 2 unless pulled forward)**
- WhatsApp Business API and approved templates
- Automated email sequences and lead scoring
- Attendance check-in / "activities attended"
- RBAC, custom report builder, advanced analytics

**Boundary calls needing Week 1 sign-off:** Manual duplicate-merge UI (party-mode consensus: promote from "flag only" to required MVP). Relationship view shows registrations, not attendance, until Phase 2.

## Vision

**12 months:** Marco runs all activities on one platform. Monthly reviews use exported reports to decide which communities to scale. Phase 2 automation (WhatsApp API, sequences, attendance) triggers when follow-up volume justifies it.

**2–3 years (if productized):** Creativorare offers the Activity Lead Engine to similar community operators — fitness studios, rec leagues, hobby clubs — as a configurable vertical platform. First client paid for the build; subsequent clients pay for license + configuration. `[ASSUMPTION: Requires explicit Creativorare productization decision and architectural discipline from Day 1 — generic data model, no client-specific core logic.]`

**What this is not:** A horizontal CRM SaaS launch competing on G2 ratings. A one-off that hard-codes Marco's tennis level field as a database column.
