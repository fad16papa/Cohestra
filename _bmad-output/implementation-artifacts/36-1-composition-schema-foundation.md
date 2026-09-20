# Story 36.1 — Composition schema foundation

**Epic:** 36  
**Status:** review  
**Depends on:** Epic 36 planning artifacts (merged)

## User story

As a platform developer, I need an evolved form schema with a composition layer so operators can eventually arrange blocks without breaking existing registrations.

## Scope

- TypeScript + C# schema types for `FormCompositionNode` and `ActivityFormSchema.version` 2
- `normalizeFormSchema`: v1 → synthetic composition; orphan ref detection
- API save/load preserves unknown keys
- Unit tests round-trip legacy fixtures
- **No** builder UI yet

## Acceptance

- [x] Legacy v1 schemas normalize to equivalent linear composition (`FormSchemaCompositionNormalizer`, `getFormSchemaEffectiveComposition`)
- [x] Validation/submission still uses `fields[]` only
- [x] Unit tests: save/load mapping v2 composition (`FormSchemaCompositionTests`)
- [ ] bmad-code-review: no duplicate submission path (pending review)

## Out of scope

- Renderer, palette, design tokens
