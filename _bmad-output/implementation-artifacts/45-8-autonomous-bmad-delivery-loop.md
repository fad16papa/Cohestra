---
id: 45.8
key: 45-8-autonomous-bmad-delivery-loop
title: Autonomous BMAD delivery loop
status: ready-for-dev
epic: 45
created: 2026-10-15
---

# Story 45.8: Autonomous BMAD delivery loop

## Story

As a **platform operator**,
I want **the Cohestra autonomous development policy written down and followed**,
so that **agents do not stop after ordinary fixable failures**.

## Acceptance Criteria

1. **Given** the documented loop
   **When** an agent starts work
   **Then** it follows sprint-status → next ready story → create/validate → test design/ATDD → implement → build/test → exact-HEAD review → fix → re-review → merge when policy allows → automatic UAT deploy → automatic UAT acceptance → investigate → repair → redeploy/retest → trace → close → next

2. **Given** a test failure, type error, container health regression, expected migration issue, browser regression, failed assertion, fixable MAJOR review finding, deploy-script defect, or UAT application defect
   **When** it occurs
   **Then** the loop continues and repairs it
   **And** it does not ask the owner to SSH

3. **Given** a real owner gate
   **When** it occurs
   **Then** the agent stops and names the gate (secret NAME, policy decision, production, live money, DNS/cert ownership, destructive data, or ambiguous product decision)

4. **Given** `autonomous-merge-policy.md`
   **When** this story ships
   **Then** the policy is still a proposal until the owner approves it
   **And** production cutover remains owner-authorized
