# Epic 35 retrospective — Modern Form Experience System

**Epic:** 35 (closed)  
**Merge:** PR #323 @ `5ad437a`

## What worked

1. **Schema-first experience model** — Layout, flow, style, and brand as composable dimensions on `registrationTheme` kept stories incremental without forking form definitions.
2. **Single renderer spine** — All public and preview surfaces route through `PublicRegistrationOpen` + shared validation/submission; avoided the classic “preview engine vs production engine” drift.
3. **Story-level BMAD loop** — Forcing live browser matrix + entitlement proof in 35.7 caught contract-only responsive debt from earlier stories before merge.
4. **Plan gates in two layers** — Studio UI locks plus server normalization/rejection (`RegistrationExperiencePlanGate`, activity update integration tests) prevented silent entitlement bypass.
5. **Isolated integration tenants** — Basic/Core plan tests on a fresh default tenant failed read-only mode; provisioning dedicated tenants stabilized CI without weakening assertions.

## What was hard

1. **Preview stale state** — Unsaved Design draft vs Form tab Preview required explicit draft plumbing (`designDraftTheme`, preview key) and e2e proof; easy to regress with hidden duplicate preview trees.
2. **Responsive evidence gap** — CSS/unit tests did not substitute for Playwright on Docker stack; Form Studio e2e needed label-card clicks, visible preview surface scoping, and preview CTA semantics.
3. **Conversational flow** — Shared form state with step indexing and keyboard/Enter rules needed tight coupling to one validation model; regressions show up as UX bugs, not compile errors.
4. **Carried review debt** — 35.5/35.6 formal checkpoint/adversarial debt had to be cleared explicitly in 35.7, not assumed from green unit tests.

## Reusable practices

- Add **CI Docker Playwright** for any epic claiming “responsive” or “Form Studio operator path” acceptance.
- When testing **Basic plan limits**, never downgrade a **seed-heavy default tenant**; use platform-provisioned isolated tenants.
- For **sr-only** control patterns, e2e should click **visible labels**, not hidden radios.
- Keep **merge gate** separate from feature design: Bugbot + adversarial doc + green matrix on HEAD.

## Action items (optional, non-blocking)

- Schedule a focused **screen-reader smoke** on Conversational + Form Studio when SR tooling is available in CI or UAT.
- Document **preview viewport toggle** behavior for split layout in operator help (mobile vs desktop preview chrome).
