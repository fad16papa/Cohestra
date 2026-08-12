# Forged idea: Registration Experience Studio

**Status:** HARDENED (survived forge)  
**User seed:** Let operators design registration page look/feel based on activity **and** community.

## Load-bearing concept

**"Community Brand Kit + Activity Override + Registration Theme Presets"** — not a free-form page builder.

Operators set identity once per **Community** (logo, accent, default hero, optional default form template). Each **Activity** inherits by default and can override hero/accent/layout preset. Public registration renders from a small **RegistrationTheme** contract separate from `form_schema`.

## Why this shape wins

| Alternative | Verdict |
|-------------|---------|
| Full drag-and-drop page designer | **Killed** — duplicates website builder; 6-month scope trap |
| Activity-only branding (status quo+) | **Weak** — ignores how operators organize (communities) |
| Community-only, no activity override | **Killed** — single multi-activity communities need per-event hero |
| Import website builder sections onto reg page | **Defer P2** — powerful but coupling risk |

## Cracks found & resolutions

1. **Crack:** "Design" means fonts/CSS to users but a11y/NFR-12 forbids chaos.  
   **Lock:** Presets + tokens only; accent/hero/logo free; typography stays Geist with 3 density modes max.

2. **Crack:** Community catalog today is a string label, not a brand entity.  
   **Lock:** Extend Community model lightly; migration backfill optional logo null.

3. **Crack:** Preview lies if admin preview ≠ production.  
   **Lock:** Same React tree as public (`variant="preview"` already exists) + shareable preview token.

4. **Crack:** Basic plan operators may expect Pro-level design.  
   **Lock:** Presets on all plans; custom logo upload on Core+; Pro gets extra layouts + gallery.

## MVP scope (v1)

- 4 theme presets: **Classic**, **Card**, **Immersive Hero**, **Compact**
- Community: optional `logoAssetId`, `accentColor`, `defaultHeroAssetId`
- Activity: inherit or override; pick preset
- Admin: **Design** tab on activity (or extend Branding panel) with live mobile/desktop preview
- Public: render preset; WCAG AA contrast check on accent pick (client warn + server reject worst cases)

## Out of v1

Custom fonts, CSS injection, embed iframe, conditional logic, multi-step wizard.

## Success metrics

- ↑ registration completion rate (same activity, before/after theme)
- ↓ time-to-publish (operator sets community kit once, clones activities faster)
- Qualitative: operators say "looks like our club" without asking for Webflow
