# Epic 2 Retrospective — Activity Lead Engines

**Date:** 2026-06-20  
**Epic:** 2 — Activity setup, forms, publish workflow, and public registration shell  
**Status:** Complete (stories 2.1–2.11)

## Epic summary

Epic 2 delivered the operator path from creating an activity through publishing a form, generating QR/link assets, and serving a credible public registration page with a stub submit handshake — backed by Redis caching for public reads.

### Stories shipped

| Story | Outcome |
|-------|---------|
| 2.1–2.3 | Activity CRUD, list/wizard UI, form schema contract |
| 2.4–2.5 | Form field editor, preview, template seeds |
| 2.6–2.7 | Publish/archive status machine + publish-gate validation |
| 2.8 | Server-side QR PNG + QrPanel on QR & Link tab |
| 2.9 | Public registration shell (ActivityHero + form + unavailable states) |
| 2.10 | Stub `POST /api/v1/public/registrations` + OpenAPI contract |
| 2.11 | Redis cache for published public activity lookups |

## What went well

- **End-to-end QR journey** — Operator can publish → copy link / download QR → participant lands on SSR registration page → stub 202 submit.
- **Contract-first handoff to Epic 3** — `activity-form-schema-v1.md` and `public-registration-v1.md` freeze the API surface for real ingestion.
- **Review loops caught real issues** — Tab draft preservation (2.4), publish-gate UX (2.7), public fetch error handling (2.9), write-through cache (2.11).
- **Server-side QR** — Theme-independent PNG generation avoids admin dark-mode bleed into print assets.

## What we learned

- **Story overlap is OK when scoped** — 2.9 shipped minimal stub endpoint; 2.10 formalized the contract. Document the split in story notes.
- **Cache needs write-through, not just invalidate** — Publish/update races were closed by `SyncPublicActivityCacheAsync` after review.
- **OpenAPI XML comments ≠ operation docs** — Use `[EndpointSummary]` / `[EndpointDescription]` for discoverability.
- **Formal review backlog** — 2.8 reached `review` but closed at epic boundary without a dedicated review pass; acceptable for MVP but track explicitly.

## Deferred carry-forward

From code reviews and deferred-work.md (Epic 2–relevant):

- Stub registration accepts unvalidated `answers` → **Epic 3.1**
- No TTL on public activity cache keys → optional hardening
- No automated API/integration tests for publish gate, cache, stub → test matrix story
- Duplicate `fetchPublicActivityBySlug` in `activities-api.ts` vs `public-registration-api.ts` → cleanup
- Published activities can save schema that fails publish gate → post-publish edit policy TBD

## Epic 3 preparation

**Ready:**

- Frozen registration POST contract and form schema docs
- Public page shell, unavailable states, Redis-backed public GET
- Publish gate aligned on server and client

**Epic 3 should tackle first:**

1. **3.1** — Real registration ingestion (persist Registration + Client)
2. **3.2** — Rate limiting + idempotency on public POST
3. **3.3** — Dedup (ATDD red phase per epic plan)
4. **3.4** — Harden public `RegistrationForm` (may overlap with 2.9 shell — reconcile)

**Dependencies verified:** PostgreSQL, Redis, Docker Compose, JWT admin API, public anonymous endpoints.

## Action items

| Item | Owner | Target |
|------|-------|--------|
| Run optional `bmad-code-review on 2.8` if audit trail needed | Team | Before Epic 3 kickoff |
| Remove duplicate public activity fetch helper in web | Dev | Epic 3 cleanup |
| Add integration tests for stub POST + cache hit | Dev | Epic 3 / QA story |

## Sign-off

Epic 2 acceptance: **Activity Lead Engine MVP path is complete** — operators can publish capture-ready activities; participants can scan QR, view registration shell, and submit to stub endpoint.
