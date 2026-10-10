# Checkpoint preview — Light-only application appearance

Date: 2026-10-10
Workflow: bmad-checkpoint-preview
Model: Cursor Grok 4.6

| Question | Expected | Evidence |
|---|---|---|
| Can a user switch Cohestra into dark mode? | NO | ThemeToggle deleted; no Settings Appearance; no selector |
| Can OS dark mode switch Cohestra into dark mode? | NO | themeInitScript ignores prefers-color-scheme; Playwright emulateMedia dark |
| Can an old saved dark preference switch Cohestra into dark mode? | NO | storage keys ignored; profile unused for skin |
| Is Settings → Appearance removed? | YES | nav + section gone; `/settings/appearance` → profile |
| Are tenant branding and Brand Accent preserved? | YES | BrandAccentSection + light contrast tests |
| Are Form Studio design options preserved? | YES | design tab / composition files unchanged in purpose |
| Does Platform Overview now render as a coherent light application? | YES | --plat-* aliases light tokens; live screenshots under prefers-dark |

Live visual confirmation (prefers-color-scheme: dark + old dark storage):

- Platform Overview 1440/390: light paper, white cards, ink header — not the charcoal/washed-gray failure
- Dashboard 1440/390: light shell, no appearance control
- Settings: Your account + Help & support; Appearance absent; Brand accent remains
- Tenant/platform login: light, no toggle
- Public registration: light PublicFormLayout, no toggle
- Tenant website: light SitePageRenderer, no toggle, no empty header slot

Verdict: CHECKPOINT PASS. Exact-head CI still required. STOP before merge.
