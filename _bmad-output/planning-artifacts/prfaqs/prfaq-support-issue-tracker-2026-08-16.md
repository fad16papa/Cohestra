---
title: "PRFAQ: Cohestra Support Issue Tracker"
status: draft
created: 2026-08-16
updated: 2026-08-16
stage: verdict
inputs:
  - _bmad-output/brainstorming/brainstorm-operator-support-touchpoints-2026-08-16/.memlog.md
  - _bmad-output/forge/support-contact-form-2026-08-16/.memlog.md
---

# Cohestra operators now get a support ID they can quote — and Creativorare can find the same issue in the platform console

## Club operators report problems from Settings, with screenshots, and hear back with a tracking ID from noreply@creativorare.com

**Manila, 16 August 2026** — Cohestra today announced operator support that lives inside the workspace. When something breaks or is unclear, operators no longer hunt for an email address or paste context from memory.

Today, operators who get stuck either give up or send a vague message to a marketing inbox. Creativorare cannot tell which workspace, which plan, or which screenshot belongs to which conversation. Follow-up is guesswork.

With this change, an operator writes the issue in Settings, attaches screenshots, and receives a confirmation from **noreply@creativorare.com** with a **support issue ID**. Creativorare receives the same ID at **techsolutions@creativorare.com** and works it in the **platform admin issue tracker**, with a report of open volume.

> "If they cannot quote an ID, we do not have a support process — we have a mailbox."
> — Product, Cohestra

### How It Works

An operator opens **Settings → Help & support**, describes the problem, and attaches up to three screenshots. Cohestra saves an issue, shows the ID on screen, emails tech support, and emails the operator a confirmation from noreply. Platform admins open **Platform → Support**, find that ID, update status, and use the **support report** to see how many issues are still open.

> "I sent the screenshot from my phone and got SUP20260816000003 in my inbox. When they replied, we were talking about the same thing."
> — Ana, workshop operator (composite)

### Getting Started

Signed-in operators: Settings → Help & support. Platform admins: `/platform/support` after platform login. No new account type.

---

## Customer FAQ

### Q: Will you actually reply, or is this a black hole with a fancy ID?

A: The ID exists so both sides can match the conversation. v1 promise is **best-effort email reply** to the operator address on the account, quoting the ID. We do **not** promise live chat or a timed SLA in v1. `[ASSUMPTION]` Copy: 1–2 business days for Core/Pro; Enterprise called out separately later.

### Q: Why not just email techsolutions@ myself?

A: You can, but we will not know your workspace slug, plan, or signed-in user unless you type them. The form captures that. Screenshots from the app are more reliable than mailto on mobile.

### Q: Who sees my screenshots?

A: Creativorare platform admins and the techsolutions inbox. Screenshots are **not** public campaign assets. Do not attach guest phone numbers unless needed to reproduce the bug.

### Q: Can my event guests contact Cohestra this way?

A: No. Guests contact the club. This path is for **operators** only.

### Q: Where do I find my ID later?

A: Confirmation email, the success screen after send, and `[ASSUMPTION]` a short “Recent requests” list on the same Settings card.

---

## Internal FAQ

### Q: Is this a better workflow than mailto?

A: **Yes**, because it produces a durable, globally unique ID, dual notification, and a platform-admin record. Mailto alone fails the “hit the correct issue per user” requirement.

### Q: Do we need Zendesk?

A: Not for v1 volume. Native tracker + Gmail on techsolutions@ is enough if the ID is in the subject line. Revisit if open issues exceed what one inbox can triage.

### Q: What if SendGrid confirmation fails after the issue is saved?

A: The issue still exists. Outbox retries confirmation. Platform admin can still work the ID. Operator sees the ID on screen even if email is delayed.

### Q: Can platform reports reuse tenant ReportsController?

A: No. Tenant reports are tenant-filtered. Support volume is **platform-scoped** (`PlatformAdminOnly`).

### Q: From address vs Reply-To?

A: Operator confirmation **From:** `noreply@creativorare.com`. Tech email **From:** verified SendGrid sender (same noreply), **Reply-To:** operator email, **To:** `techsolutions@creativorare.com`. Subject includes `[IssueNumber]`.

---

## The Verdict

**Forged:** Operator-only intake, global issue ID, dual SendGrid, platform tracker + report.

**Needs heat:** Exact SLA copy by plan; whether operators get an in-app history list (recommended yes, small).

**Crack:** Treating this as “just a contact form” without persistence would fail the user’s stated requirement (tracker ID + platform admin report).
