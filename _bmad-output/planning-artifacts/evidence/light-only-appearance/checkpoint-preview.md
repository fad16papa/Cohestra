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

Verdict: PASS pending exact-head CI and live visual confirmation on this HEAD.
