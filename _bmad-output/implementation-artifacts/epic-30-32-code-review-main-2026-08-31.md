# Epics 30–32 Code Review — Main (2026-08-31)

**Scope:** `2465fc6..ff20162` on `main`  
**Patches applied:** branch `cursor/epic-30-32-review-patches-d861` (P1–P4)

## Patch status

- [x] **P1** Embed Close-at parity
- [x] **P2** Embed closed-message + unavailable precedence
- [x] **P3** Plan gate on publish
- [x] **P4** Community default template schema plan gate at assign

**Open:** ~~D1 (website inquiry notify toggle)~~ — resolved: website inquiry honors `EmailOnNewRegistration` (same toggle, copy updated)

---

| # | Title | Notes |
|---|-------|-------|
| W1 | Stale-tab Close-at submit uses platform copy, not operator `closedMessage` | Epic 30 pass 1 defer; GET path correct |
| W2 | Saved template apply can carry past `registrationClosesAt` | Epic 30 pass 1 defer; operator footgun |
| W3 | Hidden values merged client-side only; server trusts POST body | FR-RC-2 ideal is server query merge; client unit tests exist; integration tests use POST JSON |
| W4 | Hidden query passthrough not integration-tested via URL | Deferred in 32.2 review |
| W5 | `postMessage` resize uses targetOrigin `"*"` | Deferred in 32.2 review (v1 embed pattern) |
| W6 | Website inquiry double-submit → duplicate timeline/outbox | Deferred in 32.3 review |
| W7 | Sticky header/footer on tall stepped forms (ThemeToggle mid-scroll) | UX-DR30 polish |
| W8 | Brownfield `EmailOnNewRegistration` if `AddTenantFormTemplates` already applied | Needs `ADD COLUMN IF NOT EXISTS` follow-up migration for existing dev DBs |

---

## Dismiss

| # | Title | Reason |
|---|-------|--------|
| R1 | Migration defaults `EmailOnNewRegistration` to `true` | Matches FR-RC-9 (default on) |
| R2 | Website inquiry `ConsentGiven` not required in validator | FR-RC-13: unchecked = create without opt-in; checked = opt-in — API field is intentional |
| R3 | Plan-limit concurrent race on registration message copy | Epic 30 pass 1 dismissed |

---

## Layer notes

### Acceptance Auditor — key gaps beyond patches

- Embed ≠ public unavailable parity (P1, P2)
- Community default silent prefill failure (P4 + `ActivityService.cs:1205–1211`)
- Server-side hidden query contract not enforced (W3)

### Edge Case Hunter — validated highlights

- Embed Close-at window (→ P1)
- Publish-after-downgrade (→ P3)
- Community default + deleted template FK null (silent blank prefill — monitor)
- Shared registration rate limiter may count website inquiries (low risk at CI limits)

### Blind Hunter

Subagent could not diff (clean working tree on `main`). Security-sensitive paths manually spot-checked: tenant embed settings, website inquiry tenant scope, CSP middleware fail-closed, form schema plan gates on save.

---

## Pass 2 — patch branch review (PR #271, `c0218eb`)

**Verdict:** P1–P4 and D1 **accepted** — ready to merge with one small follow-up patch recommended.

### Patch (recommended before or immediately after merge)

- [x] [Review][Patch] Null `FormSchema` publish NRE [`ActivityService.cs:458`] — skip plan gate when schema null; publish gate returns 400 message
- [x] [Review][Patch] Notify-off integration test too broad [`WebsiteInquiryIntegrationTests.cs:180`] — scoped to inquiry dedupe key

### Defer

- [x] [Review][Defer] Community-default prefill silent skip on downgrade [`ActivityService.cs:1210`] — assign path fixed (P4); create-time prefill still no-ops quietly
- [x] [Review][Defer] No embed Close-at render/e2e test — parity verified by code mirror of public page; no embed test harness today
- [x] [Review][Defer] Missing unit tests for Basic+recipes/Core+ publish gate — same `FormSchemaPlanGate` as save path; Pro-steps publish test covers gate wiring

### Dismiss

- AdminContactEmail blank with notify on — matches registration notify behavior (no outbox when no recipient)
- Publish `403 plan_locked` mapping — consistent with `UpdateFormSchema` controller pattern

**Score:** 0 decision-needed · 2 patch · 3 defer · 2 dismiss

---
