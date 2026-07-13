---
generated: 2026-06-27
project: lead-generation-crm
author: Correct Course workflow
status: approved
approved: 2026-06-27
awaiting_approval: false
baseline: uat-polish (post–Epic 7)
implementation_status: largely-shipped-uncommitted
---

# Sprint Change Proposal — UAT Polish, Registration Numbers & Demo Seed v2

## Section 1: Issue Summary

### Problem statement

During **UAT polish** (post–Epic 7), Francis identified gaps between **operator/participant needs** and what the shipped MVP documented and displayed:

1. **No participant registration ID** — Operators need a human-readable check-in code per activity registration; PRD FR-4 only promised generic confirmation.
2. **Duplicate registrations allowed** — Same client could submit twice for one activity, breaking “one participant, one slot” validation.
3. **Demo seed too thin** — 5 communities × 1 activity × 20 clients did not stress-test lists, reports, or multi-activity client profiles.
4. **Activity list showed 0 registrations** — UI never loaded counts from API (display bug, not missing data).
5. **UX debt** — Native `window.confirm`, missing archive/delete guards, form reorder friction, theme/toast polish.

### Triggering context

| Source | Finding |
|--------|---------|
| UAT operator walkthrough | “How do I validate a participant at the door?” — UUID not usable |
| Party-mode analysis | Registration ID + 6×10×100 seed matrix agreed |
| Production-like Docker dev | Seeded data present in DB but Activities cards showed **0** |
| Session implementation | Code + contracts shipped; **PRD / architecture / UX lag** |

### Evidence

- Implementation: `registration-numbers-and-demo-seed-v2.md`, migration `AddRegistrationNumber`, 60 unit tests passing
- Contract: `docs/contracts/public-registration-v1.md` — `registrationNumber` on 201
- Bug: `ActivityCard` defaulted `registrationCount` to 0; API omitted field until fix
- Planning drift: PRD FR-4 AC still “on-screen confirmation” only; no registration number glossary entry

### Issue type

**New requirement from stakeholders** (registration ID, demo matrix) + **documentation/UX drift** + **one display bug**. Not a failed approach; **no rollback**.

---

## Section 2: Impact Analysis

### Epic impact

| Epic / phase | Status | Impact |
|--------------|--------|--------|
| 1–7 | done | No reopen; hardening delivered |
| **UAT polish** | in-progress | **Extend scope** — registration numbers + seed v2 + UX items; mark complete after handoff checklist |
| Epic 8 (Phase 2) | backlog | Unchanged; optional: check-in QR scan by registration number |

**No new epic required.** Work fits **UAT polish** + planning doc updates (same pattern as Epic 7.1 artifact sync).

### Story impact

| Area | Change |
|------|--------|
| Completed stories 3.1, 3.4, 3.10 | **Additive AC** — registration number on submit response, admin surfaces, duplicate block |
| Completed story 2.2 | **Additive AC** — activity list shows live registration count |
| New informal stories | Documented as UAT-REG-1 … UAT-UI-10 in `uat-polish-implementation-log.md` |
| Epic 8 | Optional future: scan registration ID at check-in |

### Artifact conflicts

| Artifact | Conflict | Severity | Action |
|----------|----------|----------|--------|
| **PRD FR-4** | Missing registration number AC | **High** | Extend §4.1 FR-4 consequences |
| **PRD glossary** | No “Registration number” term | Medium | Add entry |
| **Architecture** | `registrations` model omits `registration_number`, unique (client, activity) | Medium | Update data model notes |
| **UX EXPERIENCE.md** | Confirmation copy lacks registration ID block | Medium | Update success pattern + UX-DR |
| **epics.md** | No UAT polish / registration ID note | Low | Add post-MVP note or §6.4 |
| **Contracts** | Updated ✓ | None | — |
| **README / addendum** | Partially updated ✓ | Low | PRD body still pending |

### Technical impact

| Area | Impact |
|------|--------|
| Database | Migration `registration_number`, unique indexes; backfill SQL for existing rows |
| API | `SubmitPublicRegistrationResponse`, `ActivityResponse.registrationCount`, 409 duplicate |
| Demo seed | **Destructive on startup** when enabled — document clearly for prod (`Enabled: false`) |
| Redis idempotency | Cached payload includes `registrationNumber` |
| Reports CSV | New “Registration ID” column |
| Risk | Demo wipe deletes campaigns/templates — acceptable dev-only; **must stay off in production** |

---

## Section 3: Recommended Approach

### Selected path: **Option 1 — Direct adjustment** (Hybrid with doc sync)

| Option | Viable? | Notes |
|--------|---------|-------|
| **1. Direct adjustment** | ✅ **Primary** | Code largely done; sync PRD/architecture/UX; close UAT polish |
| **2. Rollback** | ❌ | Would remove operator value; not justified |
| **3. MVP review** | ❌ | MVP expanded slightly but within same product promise; no Phase 2 defer |

### Rationale

1. **Implementation is complete** — correct course formalizes what shipped and closes planning debt.
2. **Registration ID is additive** — does not invalidate FR-6 dedup or immutable registrations; strengthens SM-1 traceability.
3. **Demo seed v2 is dev/UAT-only** — gated by config; no production scope creep.
4. **Documentation sync is cheap** — same playbook as approved 2026-06-22 proposal (Story 7.1).

### Risk assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Prod demo wipe | **High** if misconfigured | `DemoDataSeed:Enabled: false` in prod; README warning |
| Daily sequence overflow | Low | 6 digits = 999k/day |
| Planning drift again | Medium | This proposal + PRD §6.4 |
| Uncommitted code | Medium | Commit + UAT checklist before handoff |

---

## Section 4: Detailed Change Proposals

### 4.1 PRD — `prd-lead-generation-crm-2026-06-14/prd.md`

#### Extend FR-4 consequences (§4.1)

**OLD:**
- Successful submission creates a **Registration** linked to the **Activity**.
- Submission triggers create-or-update logic on the **Master Client List** (see FR-6).
- Participant sees an on-screen confirmation; no login is required.

**NEW (append):**
- Each **Registration** receives a unique human-readable **Registration number** (`REG` + UTC date + 6-digit sequence) for check-in and support.
- The confirmation screen displays the registration number prominently.
- A second submit by the same **Client** for the same **Activity** is rejected (duplicate blocked).
- Operators see registration numbers on activity registration lists, client history, and report exports.

**Rationale:** Aligns FR-4 with shipped behavior; supports door check-in use case.

#### Add glossary entry — Registration number

**NEW:**

> **Registration number** — Human-readable identifier assigned to each **Registration** at submit time (distinct from internal UUID). One number per client per activity. Shown to the participant on success and to operators in admin surfaces.

#### Add §6.4 UAT Polish — Registration & seed (after §6.3)

**NEW:**

```markdown
### 6.4 UAT Polish — Registration numbers & demo seed (2026-06-27)

- Participant-facing registration numbers on public confirmation and admin surfaces
- Duplicate registration blocked per client + activity
- Activity list displays live registration counts
- Demo seed v2: optional full business wipe + 6 communities × 10 activities × 100 clients × 6,000 registrations (development/UAT only)
- UX: AlertDialog confirmations, archive/delete guards, form drag-reorder, toast/theme polish
```

**Rationale:** Mirrors Epic 6 §6.3 pattern for post-MVP shipped work.

---

### 4.2 Architecture — `architecture.md`

#### Extend data model notes

**NEW (append):**

```markdown
- `registrations.registration_number` → unique string, format `REG` + `YYYYMMDD` + 6-digit daily sequence (UTC)
- Unique constraint on (`client_id`, `activity_id`) — one registration per client per activity
- `RegistrationNumberGenerator` assigns numbers at insert; idempotency cache stores number for replays
- `ActivityResponse.registrationCount` — aggregated on admin activity list API
```

#### Extend Quality & delivery table

**NEW row:**

| Area | UAT polish state |
|------|------------------|
| Demo seed | Full business wipe + matrix reseed when `DemoDataSeed:Enabled`; **never in production** |

---

### 4.3 UX — `EXPERIENCE.md`

#### Public confirmation pattern

**OLD:**
| "You're registered for {activity}." | "Form submitted successfully ✓" |

**NEW:**
| "You're registered!" + **Registration ID** (monospace, copyable) + activity recap | "Form submitted successfully ✓" |

#### Add to confirmation requirements

**NEW:**
- Success state shows **Registration ID** with helper text: “Show this ID at check-in.”
- Duplicate submit shows error **without** exposing registration ID (privacy at public terminal).

---

### 4.4 Epics — `epics.md` (light touch)

**NEW (post-Epic 7 note):**

```markdown
### UAT Polish (informal, post–Epic 7)
Tracked in `uat-polish-implementation-log.md` and `sprint-status.yaml` under `uat-polish`. Includes registration numbers, demo seed v2, activity registration counts on list cards, and confirmation-modal UX. Not Epic 8 scope.
```

---

### 4.5 Already shipped (implementation reference)

See `_bmad-output/implementation-artifacts/registration-numbers-and-demo-seed-v2.md` and `uat-polish-implementation-log.md`. **No further code required** for proposal approval unless UAT checklist finds gaps.

---

## Section 5: Implementation Handoff

### Scope classification: **Minor–Moderate**

| Layer | Status |
|-------|--------|
| Code | ✅ Shipped (uncommitted) |
| Contracts / README / addendum | ✅ Partial |
| PRD / architecture / UX body | ⏳ Pending approval of this proposal |
| UAT handoff checklist | ⏳ Backlog |

### Handoff plan

| Role | Responsibility |
|------|----------------|
| **PM (`bmad-prd` update)** | Apply §4.1 PRD edits after approval |
| **Architect** | Apply §4.2 architecture notes |
| **UX (`bmad-ux` or Paige)** | Apply §4.3 EXPERIENCE.md updates |
| **Dev** | Commit code; run `docker compose up --build api web`; verify 100 registrations on activity cards |
| **Operator (Francis)** | Run `docs/deploy/uat-polish-checklist.md`; confirm demo seed log shows 6000 registrations |

### Success criteria

- [ ] PRD FR-4 and glossary describe registration numbers and duplicate block
- [ ] Architecture documents `registration_number` and unique (client, activity)
- [ ] UX spec documents confirmation ID pattern
- [ ] Activities list shows **100** registrations per seeded activity
- [ ] Public duplicate error does **not** show registration ID
- [ ] `uat-handoff-checklist` marked done in sprint-status
- [ ] Code committed; `DemoDataSeed:Enabled` false in production config

### Out of scope (this proposal)

- QR encode registration number at check-in (Epic 8)
- Email/SMS sending registration number automatically
- Changing registration number format after ship

---

## Section 6: Checklist Summary

| Section | Status |
|---------|--------|
| 1. Trigger & context | [x] Done |
| 2. Epic impact | [x] Done — UAT polish extended, no Epic 8 |
| 3. Artifact conflicts | [x] Done |
| 4. Path forward | [x] Done — Direct adjustment |
| 5. Proposal components | [x] Done |
| 6. User approval | [x] Done — approved 2026-06-27 |
| 6.4 sprint-status | [x] Done — uat-* items logged 2026-06-27 |

---

## Approval

**Approved 2026-06-27.** PRD, architecture, UX, and epics updated per Section 4.
