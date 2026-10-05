# Epic 42 retrospective — Creation Studios

**Epic:** 42 (CLOSED)  
**Stories:** 42.1 Website Studio chrome and placement · 42.2 Form Studio responsive composition · 42.3 Form Studio touch and builder controls · 42.4 Preview and publishing continuity  
**Adjacent protected slice:** registration-responsive-tenant-website (#388)  
**42.4 merge:** PR #391 @ `855bdfc4`  
**Final implementation HEAD:** `2088bb9e`  
**Epic 43:** NOT STARTED

## Assembled product

Website Studio and Form Studio now share a Creation Studio mental model without becoming the same UI:

BUILD (edit current draft) → PREVIEW (visitor view of that draft) → PUBLISH (make saved draft public) → SUCCESS (persistent, not toast-only) → CONTINUE or REVERT (return to published/saved truth).

42.1 locked Website chrome, 1280 split, Preview unmount, publish dialog, revert.  
42.2 locked Form D7 compositions (≥1280 three-pane, 1024–1279 two-pane, &lt;1024 stacked).  
42.3 locked 44×44 handles, pointer/touch, keyboard Move up/down.  
#388 locked `@container` public/preview registration and Basic-absent / Core-Pro-optional website connection.  
42.4 closed remaining continuity: compact Templates + jump to composition, named Registration preview, Revert unsaved, Preview overlay close.

## Cross-story acceptance

| Gate | Result |
| ---- | ------ |
| Website Studio | PASS (42.1 + 42.4 regression) |
| Form Studio | PASS |
| Responsive | PASS (42.2 D7 + #388 containers) |
| Touch | PASS (42.3) |
| Keyboard | PASS (42.3 Move up/down) |
| Preview | PASS (draft Preview, named regions, unmount) |
| Publish | PASS (Website dialog; Form Overview status + Published badge + Live copy) |
| Revert | PASS (Website live snapshot; Form unsaved discard) |
| Public renderer parity | PASS (`PublicRegistrationOpen` / `SitePageRenderer`) |
| Registration responsiveness | PASS (#388) |
| Plan entitlements | PASS (Basic website absent; Core/Pro optional; 42.3 plan locks) |
| Accessibility | PASS for 42.4 delta (named preview; 42.2 listbox a11y pre-existing) |
| Motion | PASS (Epic 37 keepMounted / tokens) |
| Test isolation | PASS (38.3 owned fixtures) |
| CI | PASS on 42.4 PR #391 |

No unresolved BLOCKER / MAJOR on the 42.4 merge HEAD.

## What worked

1. **Delta audit before 42.4** — original backlog was stale; most Preview/publish work was already in 42.1–42.3/#388.
2. **One public renderer** — never a FormStudioPreviewRendererV2.
3. **Parent draft + unmount Preview** — AD-8 survived all four stories.
4. **Protected regression suites** — 42.n specs plus #388 website-connection kept later stories honest.

## What was hard

1. **Tracker YAML vs product PRs** — 42.3 was not mergeable after #388 solely because of sprint-status.
2. **Keep-mounted Build overlays** — inspector sheet from hidden Build blocked Preview at narrow widths; 42.4 closed portals when Preview is active.
3. **Design tab also keep-mounts preview chrome** — Form unmount tests must target `#form-studio-preview-panel`, not every registration preview node.

## Action items

- Owner decides next product priority. Do **not** auto-start Epic 43 (Settings / system areas).
- Optional later: Form composition listbox/`li` axe (pre-existing, not 42.4).
- Operator UAT on Docker/UAT of the assembled studios (Operator, open).

## Next

Epic 43 remains NOT STARTED. No 43.1–43.5 files or tracker keys from this close.
