# Checkpoint preview — PlatformAdmin light-only

Date: 2026-10-10
Workflow: bmad-checkpoint-preview
Model: Cursor Grok 4.6
PR: #431
Supersedes: `evidence/light-only-appearance/checkpoint-preview.md`

| Question | Expected | Actual | Evidence |
|---|---|---|---|
| Is PlatformAdmin always light? | YES | YES | ThemeScript + `forcedTheme="light"`; Overview/ops/support/login screenshots |
| Can OS dark mode make PlatformAdmin dark? | NO | NO | Playwright `emulateMedia({ colorScheme: "dark" })` + light root |
| Can a stored tenant dark preference make PlatformAdmin dark? | NO | NO | `cohestra-theme-operator=dark` still yields Platform light |
| Does visiting PlatformAdmin erase the tenant's selected theme? | NO | NO | Return to dashboard stays dark; no PATCH `themePreference=light` |
| Can tenant/admin users still select Light/Dark/System? | YES | YES | Admin ThemeToggle + Settings radios |
| Does Settings → Appearance still exist for tenant/admin? | YES | YES | `/settings/appearance` screenshot |
| Do public registration and tenant websites retain existing theme behavior? | YES | YES | Registration dark + ThemeToggle; website ThemeToggle |
| Is the owner-reported Platform Overview dark UI fixed? | YES | YES | 1440/390 Overview: light paper, white cards, ink header — no charcoal shell |

Verdict: CHECKPOINT PASS. Exact-head CI still required. STOP before merge.
