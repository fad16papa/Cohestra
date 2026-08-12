---
title: Registration Experience Studio — addendum
status: final
created: 2026-08-12
updated: 2026-08-12
---

# Addendum — Registration Experience Studio

## Rejected alternatives (from forge)

| Alternative | Verdict |
|-------------|---------|
| Full drag-and-drop page designer | Killed — duplicates website builder; multi-month scope trap |
| Activity-only branding (status quo+) | Weak — ignores community-first operator mental model |
| Community-only, no activity override | Killed — multi-activity communities need per-event hero |
| Import website builder sections onto reg page | Defer P2 — coupling risk |

## Technical decisions

### RegistrationTheme contract (Story 25.2+)

```json
{
  "preset": "classic" | "card" | "immersive" | "compact",
  "inheritCommunityBrand": true,
  "accentColor": "#0b6b63",
  "heroImageUrl": "/api/v1/public/campaign-assets/{guid}"
}
```

Resolved at read time: community kit fields fill null activity overrides when `inheritCommunityBrand` is true.

### Community brand fields (Story 25.1)

| Field | Type | Notes |
|-------|------|-------|
| `logoAssetId` | string (UUID) nullable | Campaign asset; Core+ only |
| `accentColor` | `#RRGGBB` nullable | Same validator as activity |
| `defaultHeroImageUrl` | string nullable | URL or campaign-asset path |

### Preset behavior sketch

- **Classic:** Current `PublicRegistrationOpen` — hero stack + form below.
- **Card:** Form on elevated card over `{colors.paper-warm}` tint; reduced hero height.
- **Immersive Hero:** Tall hero (min 40vh), form scrolls over gradient fade to paper.
- **Compact:** Minimal hero strip; form-first for waitlist / last-minute events.

Typography remains `{typography.body}` / Geist stack — no custom font picker in v1.

### Cascade order (resolved theme)

1. Activity override (when inherit off or field explicitly set)
2. Community brand kit
3. Activity legacy `heroImageUrl` / `accentColor` (until migrated)
4. Platform lagoon default

Tenant Settings operator accent does **not** cascade to public registration in v1.
