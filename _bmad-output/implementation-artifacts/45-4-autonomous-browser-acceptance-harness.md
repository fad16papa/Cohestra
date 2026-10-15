---
id: 45.4
key: 45-4-autonomous-browser-acceptance-harness
title: Autonomous browser acceptance harness
status: done
epic: 45
created: 2026-10-15
---

# Story 45.4: Autonomous browser acceptance harness

Status: done — merged PR #453 at `74958f1a`. Live Deploy UAT `38753266777` ran UAT browser acceptance after SSH deploy of the same SHA.

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

## Live acceptance (run 38753266777)

| Field | Value |
| --- | --- |
| TARGET / DEPLOYED / API GIT SHA | `74958f1ad4695ea8358b57ed6dc4b0be8f3ba9de` |
| Browser job | success |
| Playwright | expected=8, skipped=2, unexpected=0 |
| Anonymous | `/`, `/signup`, `/ready` on 1440×900 and 390×844 |
| Authenticated | skipped — dedicated `UAT_AUTO_BASIC_*` not configured (45.5) |
| Base URL | `UAT_PUBLIC_BASE_URL` (not hardcoded) |

Artifact: `uat-playwright-evidence` / `web/test-results/uat-playwright.json`.
