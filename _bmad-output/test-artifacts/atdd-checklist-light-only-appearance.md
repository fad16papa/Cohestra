# ATDD — Light-only application appearance

Workflow: bmad-testarch-atdd (Murat / TEA)
Date: 2026-10-10
Model: Cursor Grok 4.6

| ID | Acceptance | Evidence |
|---|---|---|
| MODE | Application is always light | ThemeScript + html color-scheme + source tests |
| OS | prefers-color-scheme dark ignored | unit + Playwright emulateMedia |
| STORAGE | Old dark keys ignored | unit + Playwright addInitScript |
| PROFILE | themePreference dark ignored | BrandAccent no longer reads it for skin |
| TOGGLE | ThemeToggle absent | source + Playwright |
| SETTINGS | Appearance absent; old route redirects | routes + Playwright |
| BRAND | Accent preserved, light contrast | brand-accent tests |
| FORM | Form Studio design untouched | source contract |
| A11Y | No html.dark; Axe no serious/critical | Playwright |
