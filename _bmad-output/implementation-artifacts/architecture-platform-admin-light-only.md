# Architecture — PlatformAdmin light-only

Date: 2026-10-10
Workflow: bmad-architecture (Winston)
Model: Cursor Grok 4.6
Supersedes: `architecture-light-only.md`

## Decision

Keep the existing Cohestra theme tree. PlatformAdmin is a route-level light override, not a second theme system and not a saved preference.

## Shape

```
ThemeProvider
  normal Light / Dark / System resolution
  + forcedTheme="light" when isPlatformLightOnlyPath(pathname)

ThemeScript (first paint)
  if Platform route → apply light and return
  else → existing storage / system resolution
```

`isPlatformLightOnlyPath` is the only shared route helper (`/platform` and `/platform/**`).

The inline ThemeScript duplicates that check because it must run before hydration. Unit tests keep the helper and script aligned.

## Must not

- Write `themePreference = light` when entering Platform
- Overwrite `cohestra-theme-operator`
- Destroy `cohestra-theme-public-session`
- Globally set `html { color-scheme: light }`
- Globally prohibit `html.dark`
- Remove next-themes, ThemeToggle, Settings Appearance, or `.dark` tokens

## Platform tokens

`--plat-*` aliases to global light `--ink` / `--paper` remain valid because Platform routes are guaranteed to resolve light tokens.
