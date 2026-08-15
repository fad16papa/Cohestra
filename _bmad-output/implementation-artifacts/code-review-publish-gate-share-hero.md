# Code Review: Publish gate + share preview hero

**Branch:** `cursor/publish-gate-share-hero-4da3`  
**Date:** 2026-08-15

## Verdict

**Approve — merge.**

## Layer summary

| Layer | Result |
|-------|--------|
| Blind Hunter | No security/logic regressions in diff |
| Edge Case Hunter | Client-only publish gate — acceptable; server publishes saved DB state |
| Acceptance Auditor | Both user requests addressed |

## Findings

### dismiss — Server cannot enforce unsaved client drafts

Publish API still uses persisted form/theme. Client gate is the correct layer; operators who bypass UI cannot get unsaved drafts published anyway.

### dismiss — Share kit after save without refresh

`onActivityUpdated` refreshes activity including `resolvedRegistrationTheme` — share kit recomputes preview. No extra work needed.

## Tests

`web/lib/share-kit-utils.test.ts` — 2 passed (resolved hero precedence)
