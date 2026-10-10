# Documentation 2.0 — BMAD code review (HEAD after test repair)

Reviewed: current docs-2 working tree vs baseline `e6f6a9b1`.
Model: Grok 4.6 exclusive. Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor.

## Verdict

No unresolved BLOCKER or MAJOR. Ready for owner review of draft PR #436. Do not merge without owner approval.

## Findings

| ID | Severity | Status | Finding |
|---|---|---|---|
| CR-1 | MAJOR | Fixed | Form Preview capture was still Build form; recaptured after `role=tab` Preview |
| CR-2 | MAJOR | Fixed | Website Studio capture still showed the tour; recaptured after Skip tour |
| CR-3 | MAJOR | Fixed | Form Studio plan copy said templates need Core+; Basic has 1 saved-template slot |
| CR-4 | MAJOR | Fixed | Docs body used `text-stone` (disabled token, 3:1). Switched to `text-text-muted` |
| CR-5 | MINOR | Open | Axe excludes shared marketing header/footer; those still use `text-stone` |
| CR-6 | MINOR | Open | Form Build shot is the composition canvas only (no activity chrome) |
| CR-7 | MINOR | Open | Campaign compose shot includes the real SendGrid delivery warning |
| CR-8 | NIT | Open | Capture script pins Marina activity id (overridable via `DOCS_SHOT_ACTIVITY_ID`) |

## Acceptance check

- 11 chapter groups present; every legacy `/docs#` id kept including `#reports`
- No Platform Admin, Cinema, or free-form chatbot claim
- Form Preview documented as never writing a public registration
- 18 allowlisted genuine PNGs on disk
- Lightbox: Escape, focus restore, Tab trap, allowlisted src only
- Unit 6/6, tsc, Next build, Playwright 2/2 at 1440/1024/768/390 + Axe on article/aside
