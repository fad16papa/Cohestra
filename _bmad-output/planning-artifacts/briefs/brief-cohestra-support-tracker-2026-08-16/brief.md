---
title: Cohestra operator support issue tracker
status: draft
created: 2026-08-16
updated: 2026-08-16
---

# Product Brief: Operator Support Issue Tracker

## Executive Summary

Operators who get stuck in Cohestra have no reliable way to reach Creativorare. Marketing `mailto:` links are easy to miss, carry no workspace context, and cannot attach screenshots from the app. This brief defines an **in-app support intake** that creates a **tracked issue**, emails **Creativorare tech support**, and emails the operator a **confirmation with a support ID**.

Platform admins then work those issues in a **Cohestra platform console tracker** with a **volume report**, so Creativorare can match the ID in email to the right tenant and operator.

This is a better support workflow than mailto **if and only if** every inbound request gets a durable ID, a confirmation the operator can quote, and a platform-admin inbox. Email-only without a tracker would still lose issues.

## The Problem

- Signed-in operators cannot find a support path inside the workspace.
- `hello@cohestra.app` on the marketing footer is the wrong inbox and the wrong audience.
- Screenshots live on the operator's phone; mailto on mobile is unreliable.
- Creativorare cannot prove which tenant, plan, or operator a vague email belongs to.
- There is no platform-admin list of open issues, so follow-up is inbox archaeology.

## The Solution

1. Operator opens **Settings → Help & support**, writes a subject and description, attaches screenshots.
2. Cohestra creates a **Support issue** with a human-readable ID (`SUP…`).
3. SendGrid sends the issue to **techsolutions@creativorare.com** (subject includes the ID; Reply-To is the operator).
4. SendGrid sends a **confirmation from noreply@creativorare.com** to the operator with the same ID.
5. Platform admins see the issue in **Platform → Support** and a **support report** (open volume, by status, by tenant).

## What Makes This Different

Not a Zendesk clone. It is **Cohestra-native**: tenant, plan, and operator identity are captured at submit time. The unfair advantage is context, not a ticket UI. Execution speed vs. bolting on Intercom.

## Who This Serves

- **Primary:** Tenant operators (Admin and Member) who need help with the product.
- **Primary (ops):** Creativorare platform admins who triage `techsolutions@`.
- **Not served (v1):** Registration guests, tenant public-site visitors, anonymous marketing leads. `[ASSUMPTION]` Public `/contact` stays out of v1.

## Success Criteria

- Operator can submit from Settings and immediately see the issue ID on screen.
- Operator receives confirmation from `noreply@creativorare.com` containing that ID.
- `techsolutions@creativorare.com` receives the issue with ID, tenant slug, and screenshots.
- Platform admin can open the same ID in `/platform/support` without searching Gmail.
- Platform support report shows open/closed counts for the selected period.

## Scope

**In (v1):** Intake form, issue ID, dual SendGrid, private screenshot attachments, platform list/detail, status changes, support volume report, docs pointer.

**Out (v1):** In-app reply thread, SLA timers, public contact page, Intercom/Zendesk, operator-visible full history beyond recent requests, guest-facing Cohestra support.

## Vision

Support stays a thin native loop: operator submits → Creativorare works the ID → operator quotes the ID in follow-up email. If volume grows, add in-app replies and SLA copy by plan — not a second product.
