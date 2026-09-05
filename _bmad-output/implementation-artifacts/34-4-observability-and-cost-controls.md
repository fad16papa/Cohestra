---
epic: 34
story: 4
status: done
baseline_commit: 6e6387cb3a97773cef60fe6a4ebf89da406fb55c
---

# Story 34.4: Observability and cost controls

Status: done

## Story

As a **platform**,
I want **safe logs, timings, and token/cost caps on synthesis**,
So that **intelligence is operable in production**.

## Acceptance Criteria

1. Brief composition logs mode, insight count, and whether synthesis was attempted — never client names, emails, or phones.
2. Synthesis timeout and max output tokens are configured (`Intelligence__TimeoutSeconds`, `Intelligence__MaxOutputTokens`).
3. Synthesis is off by default so production has zero token spend until an owner enables it.
4. Provider failures are warning-level and still return a truthful brief.

## Tasks / Subtasks

- [x] Safe composer logs
- [x] Timeout + max token clamps
- [x] Default-off synthesis
- [x] Failure warning without PII

## Dev Agent Record

Implemented on the 34.3 composer/options. No additional provider calls.

## File List

- `src/Infrastructure/Intelligence/IntelligenceBriefComposer.cs`
- `src/Application/Intelligence/IntelligenceOptions.cs`
- `src/Api/appsettings.json`
- `.env.example`
