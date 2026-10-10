# Documentation 2.0 screenshot polish — BMAD review

Reviewed vs baseline `9810de42`. Grok 4.6 exclusive.

## Verdict

No unresolved BLOCKER or MAJOR. Draft PR #436 can take this polish HEAD. Do not merge without owner approval.

## Findings

| ID | Severity | Status | Finding |
|---|---|---|---|
| SP-1 | MAJOR | Fixed | Form Studio 05 lacked activity/Build chrome — now two genuine shots |
| SP-2 | MAJOR | Fixed | Website 14 showed Templates + tour — now Sections + Split, tour dismissed |
| SP-3 | MAJOR | Fixed | Campaigns 15 was empty + SendGrid-dominated — now consented segment + composer |
| SP-4 | MINOR | Fixed | Preview 07 and mobile 10 reframed to show form fields / Join activity |
| SP-5 | MINOR | Open | Isolated workspaces still have a real SendGrid checklist above compose; documented, not painted out |
| SP-6 | NIT | Open | Calendar FAB remains in some workspace shots because it is real product chrome |

## Acceptance

- 19 allowlisted genuine PNGs; 13 retained, 5 replaced, 1 added
- Capture script resolves fixtures via API and fails when required UI is missing
- Unit, tsc, Playwright docs-2 passed locally
