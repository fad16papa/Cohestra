---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-10-15-epic-45-autonomous-delivery.md
  - _bmad-output/implementation-artifacts/investigations/epic-45-autonomous-delivery-investigation.md
  - _bmad-output/planning-artifacts/architecture/architecture-cohestra-epic-45-2026-10-15/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/epics-cohestra-enterprise.md
  - _bmad-output/implementation-artifacts/19-3-recaptcha-production-enablement.md
  - _bmad-output/implementation-artifacts/19-5-operator-core-flows-launch-signoff.md
  - .github/workflows/deploy.yml
  - docs/deploy/github-actions-cd.md
project_name: cohestra
initiative: Autonomous Delivery & UAT Acceptance System
outputNote: Dedicated file — does not replace Platform 0 epics.md or Enterprise epics-cohestra-enterprise.md
epicsApproved: 2026-10-15
storiesCompleted: 2026-10-15
validationStatus: passed
storyCounts:
  epic45: 8
updated: 2026-10-15
---

# cohestra — Epic Breakdown (Autonomous Delivery & UAT Acceptance)

## Overview

Canonical **Epic 45** for making Cohestra development and UAT validation autonomous after one-time secret/account bootstrap.

**Brownfield.** Reuse `deploy/remote-deploy.sh`, `uat-smoke.sh`, isolation/classify/preflight scripts, and existing CI. Do not give Cursor SSH. Do not automate production cutover. Do not disable real UAT reCAPTCHA. Do not solve live Google challenges.

After 45.1–45.6, resume Story 19.3 through the pipeline, then 19.5.

## Requirements Inventory

### Functional Requirements

FR-45-1: GitHub Environment `uat` is the only place UAT deploy secrets live. Workflow concurrency is `deploy-uat`.
FR-45-2: Deploy runs only after successful CI on accepted `main` SHA (or explicit workflow_dispatch of that path) and calls `deploy/remote-deploy.sh`.
FR-45-3: Missing required UAT secrets fail closed with `MISSING_SECRET=<NAME>` and no secret values.
FR-45-4: On-host acceptance probe emits sanitized JSON covering SHA, compose health, /ready, HTTPS, CRM health, isolation, seed flags, recaptcha flags, bypass absence, Paddle classification, outbox/migration health where applicable.
FR-45-5: Main CI success automatically deploys UAT, runs host proof + public smoke, and uploads artifacts.
FR-45-6: Playwright UAT suite targets public UAT URLs at 1440×900 and 390×844 (768×1024 optional) for anonymous and authenticated flows.
FR-45-7: Dedicated automation tenants and a dedicated OTP mailbox retrieve signup OTPs without personal credentials.
FR-45-8: Dual-layer recaptcha — Layer A real UAT config/widget/negatives; Layer B official Google v2 test keys on an isolated stack only.
FR-45-9: Each UAT story can produce `acceptance-summary.json` plus detailed artifacts. Missing evidence is FAIL.
FR-45-10: Autonomous BMAD loop continues through fixable failures and stops only at real owner gates.
FR-45-11: Shared-host guards, lead-generation-crm, and live-Paddle refuse remain mandatory.
FR-45-12: Production/live cutover is not implemented by this epic.

### NonFunctional Requirements

NFR-45-1 (Security): Never print secrets; never archive production/customer data; never bypass tenant isolation; never disable UAT recaptcha or security headers.
NFR-45-2 (Reliability): Fail closed; deploy concurrency does not cancel an in-flight UAT deploy.
NFR-45-3 (Evidence): Artifacts are authoritative; no fake PASS.
NFR-45-4 (Least privilege): Dedicated deploy key and automation accounts; Cursor holds no droplet key.
NFR-45-5 (Abuse): No CAPTCHA-solving services; no recaptcha test keys on live UAT/production.
NFR-45-6 (Independence): Epic 19 production NO-GO remains. Epic 45 green is not production GO.

### Additional Requirements

- Reuse existing deploy/smoke/isolation/classify/preflight scripts.
- `workflow_run` must use `github.event.workflow_run.head_sha`.
- Pass `DROPLET_DEPLOY_PATH` via appleboy `envs`, not script interpolation.
- Grok 4.6 owns architecture/security/CI/CD/review. Composer 2.5 light tasks only. Auto disabled.
- One-time owner bootstrap matrix lists names only.

### UX Design Requirements

UX-45-1: No new operator product chrome. Acceptance viewports 1440×900 and 390×844.
UX-45-2: Failure artifacts include screenshot, DOM snapshot where useful, console errors, network failures, and trace.

### FR Coverage Map

FR-45-1: 45.1
FR-45-2: 45.1, 45.3
FR-45-3: 45.1, 45.3
FR-45-4: 45.2
FR-45-5: 45.3
FR-45-6: 45.4
FR-45-7: 45.5
FR-45-8: 45.6 (corrects 19.3)
FR-45-9: 45.7
FR-45-10: 45.8
FR-45-11: 45.1–45.3
FR-45-12: all stories

## Epic List

- Epic 45: Autonomous Delivery & UAT Acceptance System (45.1–45.8)

## Epic 45: Autonomous Delivery & UAT Acceptance System

Make UAT deploy, proof, browser acceptance, and story evidence autonomous so Epic 19 can finish without a standing owner SSH loop. Production stays owner-gated.

### Story 45.1: UAT GitHub Environment + deployment control plane

As a **platform operator**,
I want **UAT deploys to run from GitHub Environment `uat` after main CI**,
So that **Cursor never needs droplet SSH and routine deploys need no owner shell**.

### Story 45.2: On-droplet autonomous acceptance probe

As a **control-plane agent**,
I want **a sanitized JSON probe on the droplet after deploy**,
So that **runtime, isolation, recaptcha flags, and Paddle class are machine-readable**.

### Story 45.3: Autonomous UAT deploy + acceptance workflow

As a **platform operator**,
I want **CI → deploy-uat → proof → probe → public smoke → artifacts** to run automatically,
So that **fixable deploy regressions are visible in Actions without owner commands**.

### Story 45.4: Autonomous browser acceptance harness

As a **control-plane agent**,
I want **Playwright against public UAT URLs on desktop and mobile viewports**,
So that **ordinary visual/functional regression does not need manual screenshots**.

### Story 45.5: Autonomous authenticated session + OTP mailbox

As a **control-plane agent**,
I want **a dedicated UAT mailbox that retrieves signup OTPs**,
So that **authenticated onboarding can complete without a personal inbox**.

### Story 45.6: reCAPTCHA automation contract

As a **platform operator**,
I want **Layer A real-UAT security proof plus Layer B official test-key flow proof**,
So that **Story 19.3 can close without a human solving a live CAPTCHA and without weakening UAT**.

### Story 45.7: Story acceptance evidence contract

As a **control-plane agent**,
I want **a standard `acceptance-summary.json`**,
So that **story close uses artifacts, not owner paste**.

### Story 45.8: Autonomous BMAD delivery loop

As a **platform operator**,
I want **the Cohestra autonomous development policy codified**,
So that **agents continue through fixable failures and stop only at real owner gates**.
