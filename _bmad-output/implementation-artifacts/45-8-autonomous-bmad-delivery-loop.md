---
id: 45.8
key: 45-8-autonomous-bmad-delivery-loop
title: Autonomous BMAD delivery loop
status: done
epic: 45
created: 2026-10-15
---

# Story 45.8: Autonomous BMAD delivery loop

## Story

As a **platform operator**,
I want **the Cohestra autonomous development policy written down and followed**,
so that **agents do not stop after ordinary fixable failures**.

## Implementation

- `_bmad-output/planning-artifacts/autonomous-delivery-loop.md` — active loop
- Merge policy remains **APPROVED**; production remains owner-gated
- `deploy/validate-autonomous-loop.sh` — contract in CI

The loop is already being executed (45.1–45.7). This story freezes the contract.
