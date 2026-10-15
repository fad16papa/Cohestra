---
id: 45.6
key: 45-6-recaptcha-automation-contract
title: reCAPTCHA automation contract
status: in-progress
epic: 45
created: 2026-10-15
---

# Story 45.6: reCAPTCHA automation contract

## Story

As a **platform operator**,
I want **Layer A real-UAT security proof plus Layer B official test-key flow proof**,
so that **19.3 can close without a human live CAPTCHA solve and without weakening UAT**.

## Implementation

- Layer A: `web/e2e-uat/recaptcha-layer-a.spec.ts` — widget/script when live keys exist; never solves the challenge; skips until UAT keys are enabled (19.3)
- Layer B: isolated `RecaptchaLayerBIntegrationTests` using official Google v2 test keys only
- Official test keys must not appear in `docker-compose.uat.yml` or `.env.uat.example`
- Bypass tokens stay absent on UAT compose

## Tasks / Subtasks

- [x] Task 1: Layer A Playwright (no live solve)
- [x] Task 2: Isolated Layer B official-key signup
- [x] Task 3: Isolation validator
- [ ] Task 4: Exact-HEAD review + CI
