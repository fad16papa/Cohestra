---
id: 45.3
key: 45-3-autonomous-uat-deploy-acceptance-workflow
title: Autonomous UAT deploy + acceptance workflow
status: in-progress — repo-side on main; live run blocked on Environment uat secrets
epic: 45
created: 2026-10-15
---

# Story 45.3: Autonomous UAT deploy + acceptance workflow

## Story

As a **platform operator**,
I want **CI → deploy-uat → proof → probe → public smoke → artifacts** automatically,
so that **no owner shell is required for routine UAT deploys**.

## Acceptance Criteria

1. **Given** main CI success
   **When** Deploy UAT runs
   **Then** the pipeline is deploy → post-deploy SHA proof → acceptance probe → public smoke → evidence artifact

2. **Given** a code/infrastructure regression
   **When** the workflow fails
   **Then** Grok investigates from logs/artifacts and repairs in-repo defects without owner SSH

3. **Given** a missing protected secret
   **When** the workflow fails
   **Then** the log contains `MISSING_SECRET=<NAME>` only
   **And** that is the owner gate
