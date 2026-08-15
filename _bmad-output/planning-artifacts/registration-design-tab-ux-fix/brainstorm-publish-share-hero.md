# Brainstorm intent — Publish gate + share preview hero

**Date:** 2026-08-15

## Problems

1. Operators could **Publish** while Form or Design tabs had unsaved drafts — live page would not match what they configured.
2. **Share kit link preview** showed "Add a hero image" even when Design tab hero override was saved — preview used `activity.heroImageUrl` (branding) not resolved registration theme hero.

## Converged fixes

| Issue | Fix |
|-------|-----|
| Unsaved form/design | Lift `isDirty` from Form + Design tabs → block Publish on Overview with explicit messages |
| Share preview hero | `resolveRegistrationHeroImageUrl()` uses `resolvedRegistrationTheme.heroImageUrl` chain (matches public page + OG) |

## Deferred

- Server-side unsaved draft detection (impossible — drafts are client-only)
- Warn on Share kit when design saved but activity was published before save (refresh after save handles)
