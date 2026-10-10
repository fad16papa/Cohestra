# Trace — PlatformAdmin light-only appearance

Date: 2026-10-10
HEAD: rebased onto `1872baa6`; see PR #431 current SHA
Spec: `_bmad-output/planning-artifacts/specs/spec-light-only-appearance/SPEC.md`

| AC | Test / evidence | Result |
|---|---|---|
| A Platform + OS light → light | ThemeScript + e2e console | PASS |
| B Platform + OS dark → light | Playwright emulateMedia dark | PASS |
| C Platform + stored operator dark → light | seeded `cohestra-theme-operator=dark` | PASS |
| D Platform + stored system → light | ThemeScript platform branch ignores system | PASS |
| E Platform login + OS dark → light | `platform-login-*-prefers-dark.png` | PASS |
| F Tenant dashboard selected dark → dark | `tenant-dashboard-1440-dark.png` | PASS |
| G Tenant dashboard selected light → light | `tenant-dashboard-1440-light.png` | PASS |
| H Tenant dashboard system + OS dark → dark | e2e F–J | PASS |
| I Settings → Appearance exists | `settings-appearance-1440.png` | PASS |
| J Tenant admin ThemeToggle exists | e2e F–J | PASS |
| K Public registration ThemeToggle preserved | `public-registration-1440-dark.png` | PASS |
| L Tenant website theme preserved | `tenant-website-1440.png` | PASS |
| Route transition dark → Platform light → dark | e2e F–J; no PATCH light | PASS |
| Platform Overview owner regression | `platform-overview-*-prefers-dark.png` | PASS |
| 44.9 Version actual/missing/error stay light | `platform-*-version-*-prefers-dark.png` | PASS |
| 44.9 long SHA no 390 overflow | version-actual-390 e2e | PASS |

Gate: PASS. STOP before merge.
