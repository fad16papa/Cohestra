# Epic 36 retrospective — Form Studio 2.0 Visual Form Builder

**Epic:** 36 (close pending post-merge CI on Story 36.7)  
**Stories:** 36.1–36.7  
**Source PRs:** #325–#332 (36.1–36.7)

## What worked

1. **Dual-layer schema** — `fields[]` stayed the validation/submission source of truth; `composition[]` added visual order without a second response model.
2. **One renderer spine** — Build draft → `RegistrationPublicPreviewShell` → `PublicRegistrationOpen` → `RegistrationForm` → `RegistrationCompositionRenderer` prevented Preview/public forks across seven stories.
3. **Incremental leaf → structure → design → preview → domain** — 36.1–36.6 locked the tree before 36.7 bound live Activity/Community data.
4. **Domain blocks as references** — `kind: "domain"` + `domainType` resolves current public-safe Activity state; no copied title/capacity/location in FormSchema.
5. **Server-authoritative entitlements** — Columns, premium tokens, and domain blocks share `FormSchemaPlanGate` / token gates; UI lock is not the only control.
6. **Story-level BMAD loop** — Live Playwright + isolated Basic tenants caught Preview remount, contentType, and plan-bypass issues before merge.

## What was hard

1. **Preview remount vs viewport state** — Draft remount keys must sit on the public tree, not the shell (36.6). Easy to wipe Desktop/Tablet/Mobile when fixing freshness.
2. **Client/server composition vocabulary** — `contentType` vs `type` produced 400s; domain uses `domain` only.
3. **Plan-limit e2e on the seed tenant** — Default tenant can enter `read_only_over_limit`; isolated tenants remain required for create/publish matrices.
4. **Duplicate Activity context** — Shells already show title/schedule/capacity; domain blocks are complementary and can repeat if operators add them. Product chose operator control over auto-dedup.

## Product outcome

An operator can now, without JSON or engineering knowledge:

- add fields and content
- organize sections and two-column rows
- bind live Activity/Community/capacity blocks
- style Modern/Minimal + bounded tokens
- Preview Desktop / Tablet / Mobile
- publish a responsive public form on the same renderer

## Tally-class honesty

Achieved: visual composition, content, responsive structure, bounded design control, live Preview, Cohestra domain differentiation.

Not claimed / deferred (PRD phases 2–4): declarative logic builder, first-class multi-step pages, templates library, reusable blocks, AI creation.

## Action items

- Keep isolated Basic/Core tenants for plan-gate integration and publish e2e (Dev, open).
- Operator UAT: compose a non-default form with domain blocks on Docker/UAT (Operator, open).
- Optional later: UX for shell vs in-form Activity details duplication (Product, open).

## Next

No Epic 36.8. Phase 2+ lives in the Form Studio 2.0 PRD roadmap, not this epic.
