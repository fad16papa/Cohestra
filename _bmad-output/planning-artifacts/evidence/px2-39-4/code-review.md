# Story 39.4 independent review (PO correction)

Reviewers: Blind Hunter, Edge Case Hunter, Acceptance Auditor, Adversarial Review.  
Model: Grok 4.6. Scope: 44×44 select contract, bounding-box proofs, Form Studio boundary, Axe contrast.

## Disposition: no unresolved BLOCKER or MAJOR

### Blind Hunter

| Finding | Severity | Disposition |
| --- | --- | --- |
| Select lacked `min-w-11` | MAJOR | Fixed. Slot now `[&_select]:min-h-11 [&_select]:min-w-11` |
| Tests asserted wrapper class / button height only | MAJOR | Fixed. Bounding boxes for link, button, select |
| Axe disabled `color-contrast` | MAJOR | Fixed. Contrast enabled; disabled controls excluded per WCAG 1.4.3 / 38.4 |
| Duplicate Form Studio h1 assertion | MINOR | Fixed. Preview path + one h1 + Form builder h2 + no nested main/h1 |

### Edge Case Hunter

| Finding | Severity | Disposition |
| --- | --- | --- |
| Client row links can be `hidden` on list chrome | MINOR | Navigate via href instead of clicking a hidden row |
| 38.4 tokens waited on `h1.font-heading` | MINOR | Settings wait uses role heading `Settings` |
| Clients `role=row` axe | NIT | Classified pre-existing 40.3 / 43.5; not suppressed as contrast |

### Acceptance Auditor

PO correction ACs hold: 44×44 on link/button/select; Clients Export CSV 128×44; client-profile WhatsApp/select at 1440/390/768; no overflow at 390/767/768; Form Studio boundary; Axe contrast not disabled.

### Adversarial

No route/permission/action/breakpoint change. No Story 39.5. Measurements written to `action-measurements.json`.
