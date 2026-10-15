---
id: 45.4
key: 45-4-autonomous-browser-acceptance-harness
title: Autonomous browser acceptance harness
status: ready-for-dev
epic: 45
created: 2026-10-15
---

# Story 45.4: Autonomous browser acceptance harness

## Story

As a **control-plane agent**,
I want **Playwright against public UAT URLs**,
so that **ordinary regression does not need manual screenshots**.

## Acceptance Criteria

1. **Given** the UAT Playwright project
   **When** it runs in Actions against Environment `uat`
   **Then** it uses public UAT URLs
   **And** it covers 1440×900 and 390×844 (768×1024 optional)
   **And** it supports anonymous and authenticated flows via dedicated `uat-auto-basic` / `uat-auto-pro` secrets

2. **Given** a failure
   **When** artifacts upload
   **Then** screenshot, useful DOM snapshot, console errors, network failures, and trace are present

3. **Given** real UAT
   **When** the suite runs
   **Then** production/dev seed shortcuts stay off
   **And** the owner personal login is not used
