---
baseline_commit: 793a2cd
---

# Story 6.5: Campaign Consent and Delivery Hardening

Status: done

## Story

As an operator,
I want campaign send to reflect consent accurately and surface delivery issues,
So that I can send campaigns confidently and diagnose SendGrid problems.

## Acceptance Criteria

1. **AC-6.5.1 — Consent on legacy form templates**
   - **Given** tennis/pickleball templates without consent fields
   - **When** clients register via those forms
   - **Then** consent can be captured going forward; legacy email clients backfilled where appropriate

2. **AC-6.5.2 — Send button clarity**
   - **Given** no emailable consented recipients
   - **When** I compose a campaign
   - **Then** send is disabled with explicit reason text

3. **AC-6.5.3 — SendGrid errors**
   - **Given** SendGrid rejects a send
   - **When** the API returns an error
   - **Then** the operator sees a parsed, actionable message

## Dev Agent Record

### Completion Notes

- `form-templates.ts`: consent fields on tennis/pickleball templates
- Migration `20260621143636_BackfillLegacyEmailConsent`
- `campaign-compose-page.tsx`: send block reason helper
- `SendGridEmailSender.cs`: improved error detail parsing
