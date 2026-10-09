# Epic 44 planning review — 2026-10-08

**Mode:** Cross-functional (product, UX, architecture, security, testing) on planning artifacts only.  
**Models:** Grok 4.6 exclusively. Architecture `finalize_reviewers` applied in-session (no other-model subagents).  
**Spine lint:** `lint_spine.py` ok (0 findings) after AD-12–AD-19 numbering.

## Product (John)

Owner refinements accepted: one epic; Overview route; directory home preserved; Support/Tenants untouched; Operations and Audits separate; severity without Incident; disposition additive; requeue **out**. Epic 19 stays independent. No contradiction with FR-44-17.

## UX (Sally)

IA matches 43.4 plus additive nav. DESIGN.md invents no palette. EXPERIENCE.md locks states, viewports, copy, no AdminRouteTransition. Residual: 43.4 E2E must be extended, not rewritten.

## Architecture (Winston)

Brownfield layered monolith. `/ready` frozen. KPI envelope pinned (AD-13). Disposition dual-write must not change HTTP (AD-16). Schema only when the story needs it (44.5 table, 44.8 column).

**Reviewer 1 (reality-check):** Stack versions taken from `project-context.md` / HEAD `69814fc3`, not training data. Paddle dispositions already exist as `PaddleWebhookDisposition` in `PaddleWebhookHttp.cs` — 44.5 must not fork an incompatible enum; map extra controller outcomes in the delivery row without changing processor switches.

**Reviewer 2 (adversary):** Two stories could ship incompatible KPI JSON — closed by AD-13. Two writers could treat `paddle_webhook_events` as a failure log — closed by AD-16. Overview 44.2 could fake health before 44.3 — closed by AC (`missing_instrumentation`). No remaining incompatible-pair hole that blocks planning.

## Security (Vex)

Forbidden list is testable (no routes). Safe DTO AD-15. Invalid-signature storage is bounded. Remaining risk: disk fill on signature spam — R-009 in test design, retention AC in 44.5. Diagnostic GET audit logging default-off recorded as owner decision.

## Testing (Murat)

44.1 first is correct (untested Epic 28 HTTP). P0 covers isolation, payload omission, processor regression, `/ready` freeze. CI ≠ production (NFR-44-10).

## Contradictions found and resolved

| Item | Resolution |
| ---- | ---------- |
| Proposal still said 44.0 / requeue as 44.9 | Proposal §5 rewritten to match canonical epic |
| Spine `AD-44-*` failed lint (parsed as duplicate AD-44) | Renumbered AD-12–AD-19 continuing parent AD-11 |
| FR-44-19 referenced but not defined | Story 44.4 now cites NFR-44-4 |

## Unresolved (owner, not planning blockers)

Retention windows, tenant severity default, hideLoadTest, `GIT_SHA` name, diagnostic GET audit, later requeue authorization, merge/deploy.

**Verdict:** Planning is internally consistent with owner refinements. Implementation is **not** authorized.
