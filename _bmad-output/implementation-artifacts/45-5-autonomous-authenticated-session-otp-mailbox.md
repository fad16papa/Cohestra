---
id: 45.5
key: 45-5-autonomous-authenticated-session-otp-mailbox
title: Autonomous authenticated session + OTP mailbox
status: ready-for-dev
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
