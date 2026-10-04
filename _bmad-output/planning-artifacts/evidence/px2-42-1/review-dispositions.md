# Story 42.1 four-layer review — PO pre-merge

Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor, adversarial-general.  
First pass target: `32d1ea1a` vs `c3e57bbc`.  
Patch HEAD under review after fixes.

## First-pass findings on `32d1ea1a`

| ID | Sources | Severity | Finding | Disposition |
| --- | --- | --- | --- | --- |
| F1 | BH+AA+AG | MAJOR / AC10 | Isolation was B-JWT-on-A-host only | **Patched**: `CoreTenantB_LegitimateHostOperations_DoNotMutateCoreTenantA_Site` |
| F2 | BH+AA+AG | BLOCKER / AC8 | Full-screen pointer-blocking tour overlay | **Patched**: overlay and 9999px dimmer removed; coachmark `role="region"` |
| F3 | EH+AG | MAJOR | Tour preview step targeted unmounted preview | **Patched**: preview step requests Preview workspace |
| F4 | EH+AG | MAJOR | Tenant switch left stale draft/notice | **Patched**: slug reset + load generation guard |
| F5 | EH | MAJOR | Shell fetch failure hung in loading | **Patched**: `shell-error` + Try again |
| F6 | AG | MAJOR | Preference key collisions | **Patched**: lowercase + `encodeURIComponent` |
| F7 | BH | MINOR | 500 vs UpgradePanel untested | **Patched**: unit cases |
| F8 | AA | MAJOR / AC9 | Dark screenshot used `emulateMedia` only | **Patched**: `html.dark` + operator theme key |
| F9 | EH+AG | MINOR | Sticky notice after edit | **Patched**: notice clears on draft change |
| F10 | EH | MINOR | Escape completed tour over AlertDialog | **Patched**: ignore Escape while 38.6 dialog is open |
| F11 | AG | MINOR | Revert confirm not destructive variant | **Patched**: `variant="destructive"` |
| F12 | EH | MINOR | Publish dialog closable while in-flight | **Patched**: same lock as revert |
| F13 | EH | MINOR | Live-URL throw reported as publish failure | **Patched**: success first, URL resolve isolated |
| R-5 | AA | MINOR | 390 Phone/Desktop/Fullscreen remain `h-7` | **Deferred**: not Edit/Preview/Save/Publish/Revert; 42.3 owns section handles |
| R-visited | AG | MINOR | `visited` also suppresses tour | **Deferred**: pre-existing checklist contract; now tenant-scoped |
| R-billing | AG | MINOR | Generic 403 copy for `billing_on_hold` | **Dismissed**: fail-closed, never UpgradePanel |
| R-helper | AG | NIT | Dead `shouldSkipWebsiteAdminFetch` | **Deferred**: unused; page gates on `access.kind` |

## Repeat rule

All four layers must re-run on the patched exact HEAD before merge.
