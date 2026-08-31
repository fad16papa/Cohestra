---
title: Registration capture that writes a person
status: draft
created: 2026-08-27
updated: 2026-08-27
purpose: Product brief after Cohestra vs Tally.so forms study
---

# Product Brief: Registration capture that writes a person

## Executive Summary

Community hosts already know how to make a form. They open Tally.so, type `/`, and publish. Cohestra’s registration form is the right **job** (event → person → follow-up) and the wrong **feeling** (admin field list). Hosts then dump Tally rows into Sheets and delay buying Cohestra until the second event hurts.

This brief is not “build Tally inside Cohestra.” It is: make activity registration **fast and Tally-familiar to author**, while every submit still writes a **deduped Client**. Steal hidden fields, a few event-shaped show/hides, optional steps, and embeds. Do not steal a logic IDE, 20 field types, or Stripe-in-form checkout.

## The Problem

Francis publishes a Saturday tennis session. He can already brand the page and require phone. He cannot pass `?ref=whatsapp`, hide “guest name” until someone says they’re bringing a plus-one, or paste the form on the club Notion page. He opens Tally in ten minutes. The guest list lives in a Sheet. Next month the same people register again with a new email. Cohestra would have caught that. He never put them in Cohestra.

Tally wins blank-page capture. Cohestra wins the second event — only if the first form was created here.

## The Solution

Keep one form per activity. Upgrade the **Form tab** to slash-insert the types we already have, plus a short list of additive types (textarea, date, hidden). Store UTMs on the registration. Offer 3–5 **recipes** for show/hide (guest, dietary, member). Optional identity → details → consent steps. Later: embed this activity’s form, and a website “contact” section that still creates a Client.

Public submit, publish gates, phone/email required, and CRM extraction stay.

## What Makes This Different

Tally is a document that emits rows. Cohestra is a registration that emits a **person** with a timeline. We will not out-Notion Tally. We will make the event job so complete that Tally is for surveys and waitlists, not for “who’s coming Saturday.”

Unfair advantage: we already have activities, communities, capacity, dedup, campaigns. Tally cannot grow those without becoming us.

## Who This Serves

**Primary:** Core/Pro operator who currently pastes a Tally link on Instagram because Cohestra’s form tab feels like IT.  
**Secondary:** Basic operator with one recurring activity who would otherwise stay on Google Forms.  
**Participant:** still a QR-to-join, one-thumb flow — not a Typeform interview.

## Success Criteria

- Operators who used Tally for **event signup** can author the same form in Cohestra without opening tally.so.
- Hidden `ref` / UTM appear on registration and reports.
- No drop in publish-gate completion (still require phone or email).
- Embed (when shipped) is used on tenant websites more than an external Tally embed.
- We do **not** ship a general logic canvas in v1 of this work.

## Scope

**In (Slice A):** hidden/UTM, textarea, date, thank-you piping, closed message, slash-add in Form tab, operator new-lead notification.  
**In (Slice B):** `visibleWhen` recipes, optional 3-step layout.  
**In (Slice C):** activity embed, website contact → Client.  
**Out:** NPS/matrix/ranking, nested `/logic`, calculated checkout, registrant Stripe, custom CSS, Sheets as CRM, DnD form canvas.

## Vision

Cohestra is the place a community’s people live. Forms are how they enter — Tally-smooth to build, Cohestra-strict about identity. Surveys can stay on Tally. Events should not.
