---
status: spec + implementation
consultants: Sally (UX), Victor (strategy)
---

# Operator brand accent — Settings

## Sally (UX) — guardrails

**Problem:** Full theme editors break contrast, status scannability, and layout rhythm.

**Recommendation: Accent tier only**

| Customizable (accent tier) | Locked (semantic tier) |
|---------------------------|------------------------|
| Primary actions, links, focus rings | Lead status badges (new/contacted/active/inactive) |
| Sidebar active indicator | Destructive / error states |
| Dashboard metric highlights, avatars | WhatsApp green |
| Toast left accent border | Typography, spacing (Spacious layout), radius |
| Chart palette slot 1 (derived) | Public registration (activity `accentColor` stays separate) |

**Settings UX**

1. **Curated presets first** — Forest (default), Ocean, Violet, Rose, Amber
2. **Custom hex second** — validated `#RRGGBB`, live mini-preview (button + toast + icon tile)
3. **Reset to default** — clears saved accent; restores DESIGN.md forest tokens
4. **Separate from light/dark** — appearance card stays mode-only; brand accent is its own card

**Preview panel** shows exactly what changes so operators do not fear “breaking the app.”

## Victor (strategy) — why this wins

- **Team handoff:** “Our green” without rebuilding a design system — syncs via operator profile (same pattern as `themePreference`).
- **Differentiation without chaos:** Presets cover 80%; custom hex covers agency white-label moments.
- **UAT proof:** Status colors stay fixed → Victor’s “scannable at a glance” proof point holds.
- **Future path:** Org-level brand preset can reuse the same accent tier later; do not expose raw CSS variables now.

## Technical scope

- `ApplicationUser.BrandAccentColor` (nullable hex)
- Extend `PATCH /api/v1/admin/me/appearance` + `GET /api/v1/admin/me`
- Frontend derives `--primary`, `--primary-foreground`, `--accent`, `--ring`, sidebar/chart accents from one hex; adjusts for `.dark`
- Apply via `BrandAccentProvider` on admin shell + toast container (not global public pages)
