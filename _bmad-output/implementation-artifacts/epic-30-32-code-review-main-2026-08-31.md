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

## Recommended next steps

1. **Apply P1–P2** — embed Close-at + closed-message parity (small Next.js diff).
2. **Apply P3–P4** — plan gates on publish + community-default assign.
3. **Resolve D1** — product call on inquiry notify toggle.
4. Optional: brownfield migration for `EmailOnNewRegistration` (W8).
