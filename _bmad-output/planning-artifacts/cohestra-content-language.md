---
title: Cohestra Product Experience 2.0 — content language
phase: 1
status: draft-for-po-review
created: 2026-09-22
updated: 2026-09-22
canonical_visual: docs/DESIGN.md
evidence: _bmad-output/planning-artifacts/cohestra-ux-audit.md
---

# Cohestra content language

Living glossary and voice guide for Product Experience 2.0. Visual and interaction rules live in `docs/DESIGN.md`. This file owns **words**.

Phase 0.1 recorded two vocabularies (PX2-IA-001). D1–D4 resolve the room names. This guide encodes those names plus error, entitlement, and status copy.

Do not implement copy changes from this Phase 1 PR.

---

## 1. Voice

Cohestra speaks like a calm host who also runs the books.

| Do | Don’t |
|----|-------|
| Specific: “Follow up with James Rivera.” | Vague: “You have items requiring attention.” |
| Human: “You’re registered.” | Corporate: “Your submission has been received.” |
| Honest: “Billing isn’t configured in this environment.” | Swallowed: silent 503 in the console. |
| Plan-named: “Campaigns require Pro.” | Dead-end: “Upgrade to continue.” with no plan. |
| Second person for actions | “The user shall…” |

Personality (from DESIGN.md): intelligent, professional, human, trustworthy, operationally efficient. Not playful-startup, not enterprise-legal, not “AI copilot” theater.

**Register / bootstrap** must not say “One workspace, one operator.” Team and TenantMember exist (PX2-IA-006).

---

## 2. Canonical room names (D1–D3)

| Canonical | Cinema today | Console today | Rule |
|-----------|--------------|---------------|------|
| Dashboard | — | Dashboard | Desktop label. Mobile label **Home**. |
| Clients | Clients | Clients | Unchanged. |
| Activities | Activities | Activities | Unchanged. Form Studio lives here. |
| Follow-up | Follow-up | Dashboard queue + clients chip | **Primary room.** Widgets say “Needs follow-up” and link to the room. |
| Analytics | Analytics | Reports | Room name **Analytics**. “Reports” = export / saved-period capability. |
| Cohestra AI | Cohestra AI | Needs attention | Room name **Cohestra AI**. “Needs attention” = dashboard section only. |
| Website | Website Studio | Website / Website Builder | Nav **Website**. Page title **Website Studio**. Path `/dashboard/website`. |
| Campaigns | — | Campaigns | Unchanged. |

**Not rooms:** Opportunity, Reports, Needs attention, Form Studio, Onboarding, Communities, Categories, Settings, Team, Billing.

Mobile More sheet labels use the same canonical names (Website, not Website Builder).

---

## 3. Glossary

| Term | Meaning | Avoid as synonym |
|------|---------|------------------|
| Activity | A dated gathering people can register for | Event (room name) |
| Client | A person in the tenant relationship graph | Lead (as room), Contact (as room) |
| Lead status | New / Contacted / Active / Inactive on a client | Pipeline stage names from other CRMs |
| Follow-up | The work of returning to a person | Outreach (room name) |
| Opportunity | A follow-up **category/state** for people worth a next commercial or hosting conversation | A separate app area |
| Registration | A person’s signup on an activity | Submission, ticket (unless later sold) |
| Community | A grouping of activities | Club (unless tenant-branded) |
| Website Studio | Editor for the public home | Website Builder (toolbar leftover) |
| Form Studio | Activity Form tab composition editor | Form builder (ok in passing, not chrome) |
| Analytics | The room for performance questions | Reports (room) |
| Report | A period/export inside Analytics | The nav label |
| Cohestra AI | Intelligence room | Copilot, assistant, bot |
| Needs attention | Dashboard section summarizing AI + operational alerts | The AI room name |
| Campaign | Permissioned outbound message | Blast |
| Plan | Basic / Core / Pro / Enterprise | Tier (ok in legal), SKU |
| TenantAdmin | Workspace owner/admin | Owner (unless billing owner is meant) |
| TenantMember | Invited operator without admin settings | User, staff (as role name) |
| PlatformAdmin | Cohestra staff | Superadmin in tenant UI |
| Suspended | TenantStatus — workspace paused by platform | On hold |
| On hold | BillingStatus.OnHold — billing hold | Suspended, paused workspace |
| Upgrade | Paid-module discovery | Unlock (alone), “Go Pro” without a plan |

---

## 4. Opportunity as a follow-up category (D2)

Opportunity is **not** a primary destination. It is a filter/state inside Follow-up.

Proposed shipped categories (PO may refine — see backlog unresolved decisions):

| Category | Operator meaning |
|----------|------------------|
| Overdue | Follow-up date in the past |
| Due | Follow-up date today / in the current window |
| New | Registered or created; no outreach yet |
| Opportunity | Operator- or rule-marked: worth a next conversation (cinema triage) |
| Done / scheduled | Has a future follow-up date and recent outreach |

Do not invent an `/opportunities` route in Epics 38–43.

---

## 5. Entitlement and permission copy (D4)

**Lock (discoverable module)**

- Title: “{Module} requires {Plan}.”
- Body: one sentence of value. Price cards or “Start {Plan} trial” when the viewer can checkout.
- Member: “Ask a tenant admin to start {Plan}.” No checkout button.

**Hide (structurally unavailable)**

- No nav item. Deep link: “This isn’t available on {Plan}” or redirect + denied primitive.
- Basic tenant-URL control: omit, do not show a disabled tease.

**In-canvas gate**

- `title` + accessible text: “Two-column rows require Core or Pro.”
- Do not silently disable without a name.

**API**

- Prefer `403` + `plan_locked` with the same human detail the UI shows.
- A known plan lock must never return `500` (PX2-ENT-004).

---

## 6. Status dials (PX2-ENT-003 / PX2-ENT-005)

| Condition | Public door | Admin |
|-----------|-------------|-------|
| Tenant **Suspended** | “Workspace paused.” Name the organization. “This is not ordinary billing.” **Never** “on hold.” | Login may be blocked. If visible, same “paused / suspended” language. |
| Billing **OnHold** | Public door may still render (access evaluator). | Banner: “Billing is on hold.” Read-only / registration-off as coded. **Never** “workspace paused.” |
| Past due | — | “Payment is past due.” |
| Trialing | — | “Trial — {n} days left” (existing banner grammar). |
| Archived | not-found | not-found |

---

## 7. Error-message pattern

Template: **What happened. What it means. What to do.**

| Situation | Example |
|-----------|---------|
| Field validation | “Enter a Singapore mobile number.” (stay on the field) |
| Page load failed | “We couldn’t load clients. Your list wasn’t changed. Try again.” |
| Environment billing | “Billing sync isn’t available in this environment. Paddle isn’t configured. You can keep working; plan status may be stale.” — named state, not a raw 503 |
| Plan lock as 403 | “Website Studio requires Core.” |
| Permission | “Only tenant admins can manage Team.” |
| Offline | “You’re offline. We’ll retry when the connection returns.” |
| Not found | “This page isn’t in {tenant}. Open Dashboard or search.” |
| Crash | “Something broke on this screen. Reload. If it repeats, contact support.” |
| Destructive confirm | “Archive Harbourline Board Game Night? Registrations stay; the public form closes.” |

Do not:

- Expose stack traces in product voice.
- Say “Unexpected error” for a known plan gate.
- Use “on hold” for Suspended.

---

## 8. AI copy (Cohestra AI)

- Lead with the next action: “3 people are overdue — open Follow-up.”
- Evidence: “Based on follow-up dates, not a prediction.”
- Uncertainty: “Not enough activity this week to summarize.”
- Never: “As an AI language model,” emoji storms, or fake confidence.

Dashboard section heading: **Needs attention**.  
Room heading (`h1`): **Cohestra AI**.

---

## 9. Empty, success, and onboarding

| State | Shape |
|-------|-------|
| Empty list | “No {noun} yet.” + why it matters + one action (“Create an activity”). |
| Empty filter | “No clients match these filters.” + Clear filters. |
| Success toast | Short verb: “Website published.” “Campaign sent.” |
| Registration success | Keep Epic 35 success screen; do not restyle as admin empty-state. |
| Onboarding | Checklist language already shipped; align room names (first follow-up → Follow-up room). |

---

## 10. Platform copy

Platform stays sparse and operational: tenant name, plan, status, billing status. Use the same Suspended vs On hold words. No cinema metaphors. No impersonation language.

---

## 11. Sources

- D1–D4, D13 — `docs/DESIGN.md` §2–3, §20
- PX2-IA-001, PX2-IA-002, PX2-IA-003, PX2-IA-006, PX2-ENT-003, PX2-ENT-004, PX2-ENT-005
- `web/lib/marketing/product-slides.tsx` vs `web/lib/admin-nav.ts` (shipped drift)
- `docs/user-manual/cohestra-operator-manual.md` (June 2026 — stale “one operator”; update when copy stories land)
