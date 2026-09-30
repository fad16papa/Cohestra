# Story 38.5 implementation readiness

Generated: 2026-09-30
Workflow: `bmad-check-implementation-readiness` (story-level). Full Phase 3 facilitator (`step-01` menu halt) is not applicable mid-Epic 38; 38.1–38.4 are already on `main`.
Agent/role: Product Manager (requirements traceability)
Model: Grok 4.6
Result: **READY**

## Specs used (no duplicate whole/shard conflict for this story)

| Type | Canonical for 38.5 |
| --- | --- |
| UX / D9 | `docs/DESIGN.md` §4.1 Landmarks (D9); §4.2 Admin shell regions |
| Audit | `_bmad-output/planning-artifacts/cohestra-ux-audit.md` PX2-A11Y-001/002/003 |
| Backlog | `_bmad-output/planning-artifacts/cohestra-product-experience-2-backlog.md` §38.5 |
| IA | `_bmad-output/planning-artifacts/cohestra-information-architecture.md` D9 row |
| Inventory | `_bmad-output/planning-artifacts/cohestra-component-inventory.md` skip/main/h1 |
| Previous story | `_bmad-output/implementation-artifacts/38-4-semantic-tokens-and-accessible-text.md` (done) |
| PO contract | Story 38.5 user instruction (accepted D9 + skip `main-content`) |

## Alignment

- One shell `<main>`, one route h1, skip-to-main: **aligned** across DESIGN, audit, backlog, and PO contract.
- Skip target id: PO contract `main-content` supersedes backlog/DESIGN `#main` wording. Same landmark. Story records the accepted id.
- Settings nested routes (43.1) and page-header visual primitive (39.4) stay out of scope. Semantic heading **element** changes are in scope.
- Embedded preview: same renderer + semantic context flag. No second engine.
- Epic 35–37 locks: public standalone main/h1 retained; admin route-enter stays pathname-only on the single main.
- 38.6 overlays, 40.3 tables, 42.3 listbox, 43.5 FAB: explicitly out of scope.

## Gaps closed by this story file

LIVE code still matches the audit (no skip; Settings second main; chrome h1). That is implementation, not a spec gap.

## Blockers

None. Story 38.4 closed at `abc613cb` / tracker `1b5cc6b3`. Deploy classification C is carried forward and does not block 38.5.

## Decision

**READY** for `bmad-dev-story`.
