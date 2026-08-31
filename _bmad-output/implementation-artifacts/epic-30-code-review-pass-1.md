# Epic 30 Code Review — Pass 1 (2026-08-31)

**Branch:** `cursor/save-tenant-form-templates-d861` (tip of Epic 30 stack)  
**Diff:** `main...cursor/save-tenant-form-templates-d861` — 188 files, ~25k insertions  
**Scope:** Stories **30.1–30.12** (Registration Capture wave 1 + tenant form templates)

## Layer results

| Layer | Result |
|-------|--------|
| **Acceptance Auditor** | All ACs satisfied (30.1–30.12) |
| **Edge Case Hunter** | `[]` |
| **Blind Hunter** | 0 patch · 5 epic-level defer · 1 dismissed |

**Verdict: Clean epic review** — no new blocking patches beyond per-story passes (30.11–30.12 through Pass 4).

---

## Acceptance summary

| Stories | Theme | Status |
|---------|-------|--------|
| 30.1 | Hidden field + query passthrough | ✅ |
| 30.2 | Long text + date | ✅ |
| 30.3 | Wave 1 toolbox (8 types) | ✅ |
| 30.4 | Slash-add palette | ✅ |
| 30.5 | Scale + emergency (Core+) | ✅ |
| 30.6 | Piping thank-you + confirmation | ✅ |
| 30.7 | Closed message | ✅ |
| 30.8 | Close-at datetime | ✅ |
| 30.9 | Operator email on registration | ✅ |
| 30.10 | Capture invariants regression locks | ✅ |
| 30.11 | Save/apply tenant form templates | ✅ |
| 30.12 | Template slots by plan | ✅ |

**30.10 invariants verified:** publish gate unchanged; reg caps 250/500/5000; answers immutable; `registration_theme` not in `form_schema`; client dedup untouched.

**Tests (branch tip):** 773 .NET unit + 125 Vitest reported passing; integration tests authored (Postgres/Redis).

---

## Dismissed

- **Plan-limit concurrent race exposes billing copy** — `PublicRegistrationsController` returns `PublicRegistrationMessages.PlanLimitReachedDetail` for `plan_registration_limit`, not the inline `TenantPlanLimitValidator` message from `RegistrationService` (`PublicRegistrationsController.cs:121–128`).

---

## Epic-level deferrals (cross-story)

- [x] [Review][Defer] **Stale-tab Close-at submit uses platform copy, not operator `closedMessage`** — GET unavailable path renders 30.7 copy; inline `registration_closed_at` submit alert uses API generic detail (`registration-form.tsx`). Edge case; 30.8 AC focuses on unavailable screen precedence.

- [x] [Review][Defer] **Saved template apply can carry past `registrationClosesAt`** — 30.11 snapshots full meta; 30.8 allows past close-at on save. Apply does not warn; operator may publish blocked form. Product footgun, not AC violation.

- [x] [Review][Defer] **`CaptureInvariantsTests` does not lock submit availability precedence** — Evaluator has unit tests; 30.10 suite does not regression-bind full → paused → close-at → ended chain across GET vs POST.

- [x] [Review][Defer] **Duplicated `EnsureFormSchemaPlanAllowedAsync` in Activity vs FormTemplate services** — Drift risk on future type gates; both paths tested separately today.

- [x] [Review][Defer] **GET availability flags assembled separately from submit evaluator** — Precedence matches today; no shared function between `ActivityService` and `RegistrationAvailabilityEvaluator`.

---

## Per-story review status (prior passes)

Stories 30.1–30.10: individual clean or patched passes documented in story files.  
**30.11–30.12:** Pass 4 complete (case-insensitive unique names, HTTP `plan_locked` + upgrade copy, save dialog at-cap guard).

---

## Out of scope / backlog

- **Story 30.13** — community default design pin + Pro duplicate — still `backlog` in sprint-status; not in this diff review.

---

## Recommended next steps

1. Merge Epic 30 PR stack when CI green ([PR #264](https://github.com/fad16papa/Cohestra/pull/264) tip).
2. Run integration suite on CI Postgres/Redis (`HiddenField`, `CloseAt`, `FormTemplatePlanLimit`, capture invariants).
3. Optional: Epic 30 retrospective (`bmad-retrospective`) before starting 30.13.
4. Operator UAT: slash palette, close-at + closed message, saved templates + slot meter.
