# Architecture — Form Experience System

## Spine

- **One domain:** registrations, clients, activities unchanged.
- **One schema:** `form_schema` for fields; **registration theme JSON** for brand + experience.
- **One renderer root:** `PublicRegistrationOpen` → composes `RegistrationExperienceShell` (new) + existing `RegistrationForm` / success / hero.

## Configuration model

```text
RegistrationTheme (existing column)
├── preset (legacy, retained)
├── inheritCommunityBrand, accentColor, heroImageUrl
└── experience (optional)
    ├── layout: centered | split | poster | …
    ├── style: modern | minimal | …
    ├── flow: single-page | sections | step-by-step | conversational
    └── heroDisplay: cover | contain | full-bleed | …
```

**Resolved experience:** `RegistrationExperienceResolver.Resolve(theme)` applies defaults from `preset` when `experience` null.

## Plan enforcement

`RegistrationExperiencePlanGate.Normalize(theme, plan)` strips or downgrades disallowed layout/flow before persist. Basic: centered + single-page only; Core+: split/poster; Pro: conversational flow.

## Public API

Extend `PublicActivityResponse` / web `PublicActivity` with optional resolved experience fields when Story 34.2+ consumes them. Activity counts already on public payload.

## Preview

`RegistrationPublicPreviewShell` continues to mount `PublicRegistrationOpen` with `variant="preview"`.

## Testing

- Unit: defaults, preset migration, plan normalize
- Component: layout shells (Vitest + RTL where present)
- E2E: extend `registration-responsive.spec.ts` per layout
