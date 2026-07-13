# Addendum: Landing Component Library — Technical Design

Companion to `prd.md`. JSON shapes, registry API, and implementation notes.

## 1. Section registry (web)

```
web/lib/site-sections/
  registry.ts          — SectionDefinition map
  types.ts             — shared prop types
  limits.ts            — MAX_SECTIONS, MAX_LIST_ITEMS

web/components/website/sections/
  hero/                — move from website-section-fields
  carousel/
  testimonials/
  faq/
  ...

web/components/marketing/sections/
  (mirror public render components)
```

Each definition:

```ts
type SectionDefinition = {
  type: string;
  label: string;
  createDefault: (ctx) => SiteSection;
  Editor: ComponentType<SectionEditorProps>;
  publishGate?: (section) => PublishGateIssue[];
};
```

Renderer map in `site-page-renderer.tsx` delegates to registry — remove monolithic switch over time.

## 2. JSON props schemas (additive, schemaVersion 1)

### carousel

```json
{
  "title": "Featured",
  "autoplay": false,
  "variant": "default",
  "slides": [
    {
      "imageAssetId": "uuid",
      "headline": "Summer social",
      "description": "Join us Saturday",
      "cta": { "label": "Register", "target": "activity:summer-social" }
    }
  ]
}
```

### testimonials

```json
{
  "title": "What members say",
  "variant": "default",
  "items": [
    {
      "quote": "Best community events in town.",
      "name": "Alex Tan",
      "role": "Member since 2024",
      "avatarAssetId": "uuid"
    }
  ]
}
```

### faq

```json
{
  "title": "Questions",
  "items": [
    { "question": "Do I need an account?", "answer": "No — register per event." }
  ]
}
```

### stats

```json
{
  "items": [{ "value": "400+", "label": "Registrations" }]
}
```

### ctaBand

```json
{
  "headline": "Ready to join?",
  "description": "Browse upcoming events.",
  "primaryCta": { "label": "See events", "target": "scroll-upcoming" },
  "variant": "accent"
}
```

## 3. CTA target enum (visitor-safe)

| Target | Allowed in builder | Rendered publicly |
|--------|-------------------|-------------------|
| `scroll-upcoming` | Yes | Yes |
| `activity:{slug}` | Yes (published only) | Yes |
| `https://...` | Yes (validated URL) | Yes |
| `/login`, `/register` | **No** | **No** (strip if legacy data) |

## 4. Backend changes

- **Minimal for Epic 10** — sections live in existing `DraftSections` / `PublishedSections` JSON; no new tables.
- Optional: server-side publish gate validates new section types in `SitePublishGateValidator`.
- PUT draft continues to accept full document; optional max section count validation on server (400 if > 12).

## 5. Phase A (Story 9.9) — no schema change

- `site-page-renderer.tsx`: strip operator CTAs; render `heroImageAssetId`
- Seed presets: remove default `secondaryCta` → `/login`
- Builder CTA picker: remove operator targets
- Test: `SiteUpcomingActivitiesResolverTests` already covers draft/archived exclusion

## 6. Preset migration

When presets gain optional disabled sections:

- `ApplyPresetToDraft` merges by type id or replaces layout per preset rules
- Existing operator drafts untouched until they apply preset

## 7. Deferred from party discussion

- Drag-and-drop section reorder
- Logo/partner strip section
- YouTube embed section
- Multi-tab draft conflict detection
