# Traceability — Light-only application appearance

Date: 2026-10-10
Workflow: bmad-testarch-trace
Model: Cursor Grok 4.6

| Spec ID | Implementation | Unit / source | Playwright |
|---|---|---|---|
| MODE light-only | ThemeScript + html color-scheme | theme-light-only.test.ts | light-only-appearance.spec.ts |
| OS dark ignored | themeInitScript has no matchMedia | theme-light-only.test.ts | emulateMedia colorScheme dark |
| Old storage ignored | script does not read storage | theme-light-only.test.ts | addInitScript dark keys |
| Profile dark ignored | no ThemePreferenceSync | brand-accent + layout | live dashboard/settings |
| ThemeToggle absent | deleted + consumers cleaned | theme-light-only.test.ts | assertNoThemeControls |
| Settings Appearance absent | sections + redirect | settings-routes.test.ts | settings-nested + light-only |
| Brand accent preserved | buildBrandAccentStyle light-only | brand-accent.test.ts | Settings Brand accent link |
| Form Studio preserved | design tab files remain | theme-light-only.test.ts | existing 42.x specs |
| Platform light tokens | --plat-* aliases --ink/--paper | theme-light-only.test.ts | platform overview live |
| A11y | no html.dark; light contrast pairs | semantic-text-tokens.test.ts | Axe on platform overview |

Quality gate: PASS for the light-only kernel on HEAD after review-loop fix.
