---
id: 45.2
key: 45-2-on-droplet-autonomous-acceptance-probe
title: On-droplet autonomous acceptance probe
status: ready-for-dev
epic: 45
created: 2026-10-15
---

# Story 45.2: On-droplet autonomous acceptance probe

## Story

As a **control-plane agent**,
I want **a sanitized JSON probe on the droplet after deploy**,
so that **runtime proof is an artifact, not owner paste**.

## Acceptance Criteria

1. **Given** `deploy/uat-acceptance.sh` (or equivalent) on the deployed tree
   **When** it runs after a successful compose up
   **Then** it writes `uat-acceptance.json` with SHA, API GIT_SHA, compose health, Postgres/Redis/web/nginx, `/ready`, HTTPS, shared CRM health, port isolation, seed flags, recaptcha flags, forbidden bypass tokens, Paddle classification, tenant/provider alignment, outbox health, and migration status where applicable
   **And** values are booleans, classifications, or safe suffixes only

2. **Given** the probe
   **When** logs or JSON are inspected
   **Then** passwords, API keys, private keys, webhook secrets, tokens, and full sensitive provider identifiers are absent

3. **Given** GitHub Actions after 45.3
   **When** the probe finishes
   **Then** `uat-acceptance.json` is uploaded as an artifact
