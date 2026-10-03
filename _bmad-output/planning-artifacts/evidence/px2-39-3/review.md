# Story 39.3 BMAD review

Reviewed PO-correction HEAD `f13fcd82`, then patched billing null-plan handling.

## Layers (`f13fcd82`)

| Layer | Verdict |
| --- | --- |
| Blind Hunter | One in-scope MAJOR: null plan could invent a Pro checkout SKU |
| Edge Case Hunter | Destination Campaigns lock on null/unknown — existing destination contract |
| Acceptance Auditor | PO nav/parser contract satisfied |
| Adversarial general | Destination/taxonomy items; most deferred or dismissed |

## Triage

**Patch (applied after `f13fcd82`)**

- Null/unrecognized `shellPlan` must not load paid billing or invent a Pro checkout URL. `InAppBillingPanel` now requires `recognizedTenantPlan`.

**Defer (pre-existing / out of 39.3 chrome)**

- Website/Campaigns destination pages still infer from raw `shell.plan` (38.2 / existing). Nav pending; destinations stay conservative or server-gated. Do not unlock.
- `RequireProPlan` also wraps email templates; `feature=campaigns` names the Pro campaigns family.
- Form Studio / clients `shell?.plan ?? "Basic"` fallbacks remain out of scope.
- Command palette lock chrome (38.6 overlay).

**Dismiss**

- Website admin fetch on null plan is server-authoritative (required, not an unlock).
- Case-sensitive plan tokens match the server’s PascalCase contract.
- Boundary tests covering Website/Campaigns only — that is the PO matrix.

## Close for this loop

No unresolved in-scope BLOCKER/MAJOR after the billing guard. Story stays **in-progress** for product-owner pre-merge review. Do not merge. Story 39.4 was not started.
