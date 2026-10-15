---
id: 45.6
key: 45-6-recaptcha-automation-contract
title: reCAPTCHA automation contract
status: ready-for-dev
epic: 45
created: 2026-10-15
---

# Story 45.6: reCAPTCHA automation contract

## Story

As a **platform operator**,
I want **Layer A real-UAT security proof plus Layer B official test-key flow proof**,
so that **19.3 can close without a human live CAPTCHA solve and without weakening UAT**.

## Acceptance Criteria

1. **Given** real `uat.cohestra.app`
   **When** Layer A runs
   **Then** server/web recaptcha enabled, secret/site key configured, bypass tokens absent, Google script loads, widget/iframe renders, no domain-key error, CSP permits required resources, empty token rejected, invalid token rejected
   **And** the real human challenge is not solved
   **And** no CAPTCHA-solving service is used

2. **Given** official Google reCAPTCHA v2 test keys
   **When** Layer B runs
   **Then** it is an isolated CI/automation environment
   **And** it never writes test keys into live UAT or production
   **And** valid test CAPTCHA → signup → OTP → verify → auth handoff → onboarding is automated

3. **Given** Story 19.3
   **When** this contract is adopted
   **Then** a manual human CAPTCHA solve is not required for machine acceptance
   **And** this is recorded as stronger evidence, not a security reduction
