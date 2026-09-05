---
epic: 34
story: 3
status: done
baseline_commit: 6e6387cb3a97773cef60fe6a4ebf89da406fb55c
---

# Story 34.3: Optional AI synthesis with fallback

Status: done

## Story

As a **Tenant Admin or Member**,
I want **concise synthesized wording over the same facts**,
So that **the brief reads as a morning note without inventing numbers**.

## DONE requires the Mandatory Code Review Loop

IMPLEMENT → BUILD → TEST → `bmad-code-review` (repeat on new HEAD) → PRODUCT/UX ACCEPTANCE → CLOSE.

## Acceptance Criteria

1. **Given** synthesis is disabled or `ApiKey` is missing  
   **Then** `GET /api/v1/admin/intelligence/brief` still returns the deterministic brief (`mode=deterministic`)

2. **Given** a synthesizer returns wording  
   **Then** insight ids, kinds, priorities, evidence, and action hrefs are unchanged  
   **And** new numbers not present in the fact insight are rejected  
   **And** `mode` becomes `synthesized` only after the guard passes

3. **Given** the provider throws, times out, or returns invalid JSON  
   **Then** the operator still receives the deterministic brief

4. **Given** no insights (insufficient data)  
   **Then** the synthesizer is not called

## Tasks / Subtasks

- [x] Options + composer wrapping deterministic facts
- [x] Synthesis guard (identity + number allow-list)
- [x] Disabled synthesizer when unconfigured
- [x] Optional OpenAI-compatible HTTP synthesizer
- [x] Tests: fallback, reject invented numbers, reject extra insights

## Do NOT implement

- Chat / Ask Anything
- Autonomous mutations
- Calling a provider in CI

## Dev Agent Record

### Completion Notes List

- Default config is synthesis off and empty API key — CI and local stay deterministic.
- Guard is the product truth: the model may only rewrite wording for existing insight ids.
- Provider failures and invented numbers fall back to the fact brief.

### File List

- `src/Application/Intelligence/IntelligenceOptions.cs`
- `src/Application/Intelligence/IIntelligenceSynthesizer.cs`
- `src/Application/Intelligence/IntelligenceSynthesisGuard.cs`
- `src/Infrastructure/Intelligence/IntelligenceBriefComposer.cs`
- `src/Infrastructure/Intelligence/DisabledIntelligenceSynthesizer.cs`
- `src/Infrastructure/Intelligence/OpenAiCompatibleIntelligenceSynthesizer.cs`
- `src/Infrastructure.Tests/Intelligence/IntelligenceSynthesisGuardTests.cs`
- `src/Infrastructure.Tests/Intelligence/IntelligenceBriefComposerTests.cs`
- `src/Infrastructure/DependencyInjection.cs`
- `src/Api/appsettings.json`
- `.env.example`

## Change Log

- 2026-09-05: Optional synthesis with deterministic fallback and number guard.
