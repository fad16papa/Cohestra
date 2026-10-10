# ATDD — PlatformAdmin light-only appearance

Workflow: bmad-testarch-atdd (Murat / TEA)
Date: 2026-10-10
Model: Cursor Grok 4.6
Supersedes: global light-only ATDD written earlier the same day

| ID | Acceptance | Evidence |
|---|---|---|
| PLAT | PlatformAdmin always light | ThemeScript + forcedTheme + Playwright |
| OS | OS dark cannot darken Platform | emulateMedia dark |
| STORAGE | Stored operator/public dark cannot darken Platform | addInitScript + storage assert |
| PREF | Visiting Platform does not persist light | no appearance PATCH; operator key unchanged |
| TENANT | Tenant Light/Dark/System still resolve | dashboard + login e2e |
| TOGGLE | Tenant ThemeToggle present; Platform login hidden | screenshots |
| SETTINGS | Settings → Appearance present | `/settings/appearance` |
| PUBLIC | Registration + website theme preserved | ThemeToggle e2e |
| BRAND | Accent still has light/dark branches | brand-accent tests |
| FORM | Form Studio design untouched | source contract |
| A11Y | Platform light + tenant light/dark no serious/critical Axe | Playwright |
