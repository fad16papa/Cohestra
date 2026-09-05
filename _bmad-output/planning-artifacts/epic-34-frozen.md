# Epic 34 — CLOSED / FROZEN

**Merged:** `cc21af7` — feat(intelligence): Cohestra AI MVP — operator brief (#287)  
**Date:** 2026-09-05

The operator intelligence surface is on `main`.

- Permanent Dashboard “Needs attention” brief
- Deterministic facts from real tenant data
- Optional synthesis (off by default) with number/identity guard and fallback
- Tenant isolation + cost caps + PII-free logs

Cinema remains frozen. Do not invent a second AI product.

**Next locked epic:** Epic 19 — Production Launch Sign-off.

## Deferred residuals (do not reopen unless production blockers)

- Clients URL does not persist `withoutOutreach`
- Live LLM vendor not required; enable with `Intelligence__SynthesisEnabled` + `Intelligence__ApiKey`
