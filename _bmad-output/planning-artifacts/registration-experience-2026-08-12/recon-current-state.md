# Deep recon: Activity & registration experience (2026-08-12)

## What exists today

### Public registration surface
| Capability | Status | Where |
|------------|--------|-------|
| Per-activity hero image | Shipped | `Activity.HeroImageUrl`, `ActivityHero` |
| Per-activity accent color | Shipped | `Activity.AccentColor` → CSS `--primary` on registration page |
| Community label (text) | Shipped | Shown in hero, not styled separately |
| Dynamic form schema | Shipped | JSON `form_schema` — text, phone, email, select, checkbox, consent, referral |
| Launch templates (3) | Shipped | Tennis, Pickleball, Board Game — draft-only apply |
| Admin form preview | Shipped | Read-only preview on Form tab |
| Mobile-first layout | Shipped | `PublicFormLayout`, min-h-12 controls |
| Light/dark/system theme | Shipped | Public footer theme toggle (platform tokens) |
| Success screen + reg number | Shipped | `RegistrationSuccessScreen` |
| Plan-gated unavailable states | Shipped | Cap, paused, not found |
| Share kit / OG | Shipped | Uses activity hero for social preview |

### Operator tooling
| Capability | Status | Gap |
|------------|--------|-----|
| Branding panel | Hero + accent only | No layout, typography, or community inheritance |
| Website builder (Core/Pro) | Full site sections | **Separate** from registration page — no shared "design system" |
| Tenant brand accent | Settings → operator UI chrome | Does **not** flow to public registration |
| Communities catalog | Name only for filter/label | **No** community logo, color, or template |

### UX / product constraints (documented)
- Original DESIGN.md: *"Per-activity public pages may override accent color and hero image only — typography and spacing stay on platform tokens."*
- Enterprise UX (Midnight Atelier): premium craft on marketing/admin; registration inherits platform spine unless explicitly extended.

## Gap matrix (your idea vs reality)

| User desire | Current | Gap severity |
|-------------|---------|--------------|
| "Design look and feel per activity" | Hero + 1 accent | **Medium** — needs presets, layout, copy blocks |
| "…based on community" | Label string only | **High** — no community brand entity |
| Live WYSIWYG registration designer | Admin preview only | **High** — no public-side design mode |
| Match website builder aesthetic | Two silos | **High** — inconsistent operator mental model |
| Template library by sport/program | 3 hardcoded seeds | **Medium** — extensible template marketplace |
| Registration embed / iframe | Not present | **Medium** — community sites, newsletters |
| Post-submit experience branding | Minimal | **Low-Medium** — confirmation email uses tenant email branding |

## Competitor / pattern reference (market)
- **Typeform / Tally**: form-as-design-object (themes, cover, fonts, thank-you screen)
- **Eventbrite / Luma**: event hero + organizer brand + ticket UX
- **Notion forms**: minimal branding, fast deploy
- **Cohestra wedge**: CRM + follow-up + community catalog — design should serve **conversion + operator trust**, not become a mini Webflow

## Technical anchors for any build
- `PublicRegistrationOpen` — single branding injection point (`accentColor` CSS var)
- `ActivityBrandingPanel` — admin UX for hero/accent
- `form_schema` v1 — field contract stable; **theme should be separate JSON** (`registration_theme` or extend schema `meta`)
- Communities table — add optional `BrandAccent`, `LogoAssetId`, `RegistrationPresetId` without breaking catalog validation
