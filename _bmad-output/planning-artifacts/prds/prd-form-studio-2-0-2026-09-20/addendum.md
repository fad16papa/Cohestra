# PRD addendum — Form Studio 2.0

## Competitive benchmark (quality only)

| Capability | Tally / Typeform / Fillout (reference) | Cohestra Form Studio 2.0 |
|------------|----------------------------------------|---------------------------|
| Visual block list | Yes | Phase 1 |
| Domain-aware activity header | No | Differentiator |
| CRM + registration pipeline | Partial | Native |
| Conversational flow | Yes | Pro (Epic 35) |
| Logic | Yes | Phase 2 |

## NFR summary

- **Performance:** Avoid mounting full Preview on every keystroke; debounce preview key updates (existing pattern).
- **Accessibility:** Builder keyboard reorder; public WCAG contrast floor on all token presets.
- **Security:** No operator-supplied script; sanitize rich text content blocks (same pipeline as intro markdown).

## Enterprise PRD cross-links

- Tenant website URL: Basic absent — FR-FS2-26 aligns with enterprise FR-12 / registration touchpoints.
- Seat/plan gates: reuse `RegistrationExperiencePlanGate` patterns for new block types.
