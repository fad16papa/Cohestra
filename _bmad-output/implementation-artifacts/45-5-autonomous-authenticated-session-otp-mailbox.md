---
id: 45.5
key: 45-5-autonomous-authenticated-session-otp-mailbox
title: Autonomous authenticated session + OTP mailbox
status: in-progress
epic: 45
created: 2026-10-15
---

# Story 45.5: Autonomous authenticated session + OTP mailbox

## Story

As a **control-plane agent**,
I want **a dedicated UAT mailbox that retrieves signup OTPs**,
so that **authenticated onboarding does not need a personal inbox**.

## Acceptance Criteria

1. **Given** a dedicated mailbox credential on Environment `uat`
   **When** signup is triggered
   **Then** the reader waits with bounded polling, matches unique correlation/test email, submits OTP, and verifies session

2. **Given** the reader
   **When** it logs
   **Then** mailbox credentials and unrelated email bodies are absent

3. **Given** no mailbox provider is configured
   **When** 45.5 starts
   **Then** Grok proposes the minimal secure option
   **And** the owner populates names from the bootstrap matrix
   **And** personal mailbox credentials are forbidden

## Provider pick

Minimal secure option: **dedicated IMAP over TLS** using existing Environment `uat` names.

- `UAT_OTP_MAILBOX_HOST` / `USER` / `SECRET` (optional `ADDRESS`)
- No new vendor (not Mailosaur)
- No personal Gmail/Outlook
- Values never in chat

If names are unset, `--check-secrets` prints `MISSING_SECRET=<NAME>` and Playwright skips the OTP test.

## Implementation

- `deploy/uat-otp-mailbox.sh` — fail-closed names, fixture extract, IMAP poll
- `deploy/uat-otp-mailbox.test.sh`
- `web/e2e-uat/otp-mailbox.ts` + authenticated spec gated on dedicated secrets
- Deploy UAT browser job reads the existing Environment `uat` names (no new permission)

## Tasks / Subtasks

- [x] Task 1: Mailbox abstraction + fail-closed names (AC 3)
- [x] Task 2: Correlation match; ignore unrelated bodies (AC 1, 2)
- [x] Task 3: Refuse personal mailbox addresses (AC 3)
- [x] Task 4: Playwright OTP read when secrets exist; skip otherwise
- [ ] Task 5: Exact-HEAD review + CI
