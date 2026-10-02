# Story 39.2 implementation readiness

Date: 2026-10-02  
Baseline: `main` `96e3e87a` (Story 39.1 ACCEPTED/CLOSED).  
BMAD catalog: 6.9.0 implementation cycle — `bmad-create-story` → readiness → `bmad-dev-story` → `bmad-code-review`.

## Alignment

| Source | Status |
| --- | --- |
| Backlog 39.2 | Tabs Home / Clients / Activities / Follow-up / More; Website under More; FAB overlap |
| DESIGN.md D3 / §3.2 / §3.3 | Same order; Home inactive on Website; Follow-up primary |
| 38.6 | More is already `Sheet`; reuse, do not restyle |
| 39.1 | Desktop rail frozen at `md+` |

## 39.2 / 39.3 boundary (explicit)

**This story does not implement entitlement visibility.**

| Behavior | Owner |
| --- | --- |
| Tab order, Home vs Website selected, Follow-up tab, More destinations, 44px, FAB overlap | **39.2** |
| Lock glyphs, plan labels (“Website, Core plan”), hide structurally unavailable items, new member-ask-admin chrome | **39.3** |
| Existing UpgradePanel at destinations, existing footer Billing visibility, existing Campaigns/Website presence in nav | **Keep as coded** |

DESIGN.md §3.2 “More-sheet items follow D4” is deferred to 39.3. 39.2 lists the rooms; it does not change who can see them.

## Open PO decision

None. Calendar FAB will be **hidden below 768** and a Calendar control will live in More so operators can still open the popout. Desktop FAB stays.

## Ready to implement

Yes. Story 39.1 files are not reopened.
