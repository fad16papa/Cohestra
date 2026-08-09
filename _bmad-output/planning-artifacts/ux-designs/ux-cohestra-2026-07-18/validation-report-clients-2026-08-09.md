# Validation Report — Cohestra Clients UX (2026-08-09)

- **DESIGN.md:** `_bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-07-18/DESIGN.md`
- **EXPERIENCE.md:** `_bmad-output/planning-artifacts/ux-designs/ux-cohestra-2026-07-18/EXPERIENCE.md`
- **Scope:** Clients list (`/clients`) + client profile (`/clients/{id}`) vs shipped UI on `main`
- **Run at:** 2026-08-09

## Overall verdict

The clients module is **largely aligned** with the experience spine after the Epic 23 CRM polish and profile redesign. Core lead-queue patterns (status chips, column collision fixes, icon row actions, mobile cards, profile hierarchy) match intent. One **critical layout bug** (registration answers email/consent overlap) is fixed in this branch. A few **medium** spine–implementation gaps remain (mobile filter collapse, Pro-only bulk select gating, empty-state copy).

## Category verdicts

- Flow coverage — **strong**
- Token completeness — **strong** (not re-audited; DESIGN.md unchanged)
- Component coverage — **adequate**
- State coverage — **adequate**
- Visual reference coverage — **adequate**
- Bloat & overspecification — **strong**
- Inheritance discipline — **adequate**
- Shape fit — **strong**

## Findings by severity

### Critical (1) — fixed in branch

**State coverage — Registration answers field collision** (§ Client profile / Registration answers)

Long email addresses shared a two-column grid row with Consent, causing overlapping text (`…cohestra.Yeesal`).

Fix: Email, consent, and values >48 chars span full width; email uses `break-all` + monospace. Documented in EXPERIENCE.md.

### High (0)

None.

### Medium (3)

**Component coverage — Mobile filter bar** (§ Clients list — Filter bar)

Spine specifies filters "collapsible on mobile behind Filters toggle." Implementation always shows Search + Nationality in an open card. Acceptable for desktop-first operators but adds vertical scroll on small phones.

Fix: Optional `[ASSUMPTION]` to keep always-visible filters, or implement collapse behind toggle.

**Component coverage — Bulk select plan gate** (§ Bulk select Pro FR-31)

Spine: checkbox column Pro-only. Implementation shows checkboxes on all plans; only campaign handoff is Pro-gated via `ClientBulkSelectBar`.

Fix: Hide checkbox column unless `isProPlan`, or update spine to "selection visible all plans; campaign handoff Pro-only."

**State coverage — Filtered empty copy** (§ Empty states)

Spine: *No clients match your filters.* Implementation: *No clients match your search or filters.*

Fix: Align copy (implementation wording is clearer — recommend spine update).

### Low (2)

**Component coverage — ClientRow vs ClientQueueRow naming**

Spine references `ClientQueueRow`; code uses `ClientRow`. Behavior matches; rename optional for doc/code parity.

**Visual reference — Profile mock drift**

`mockups/clients-profile-action-first.html` predates master-profile-on-top layout. Spine ratified decisions supersede; mock refresh optional.

## Clients list — alignment checklist

| Spine requirement | Status |
|-------------------|--------|
| Lead queue header + status chips (no status dropdown) | ✓ |
| `max-w-7xl` page width | ✓ |
| Contact / Status / Last reg / Last outreach / Actions columns | ✓ |
| Column collision invariants (`min-w-0`, truncate, reserved actions) | ✓ |
| Icon Mark contacted + WhatsApp/Viber on New rows | ✓ |
| Mobile card layout (`< sm`) | ✓ |
| Merge suspect / follow-up due / registered-within banners | ✓ |
| Export CSV with Core+ filtered export | ✓ |
| Nationality filter-only (not table column) | ✓ |

## Client profile — alignment checklist

| Spine requirement | Status |
|-------------------|--------|
| Identity header + single status select + messenger actions | ✓ |
| Master profile full-width under header | ✓ |
| Two-column body (history + timeline \| follow-up + outreach) | ✓ |
| Expandable registration history (10+) | ✓ |
| Expandable relationship timeline (5+) | ✓ |
| No redundant timeline preview | ✓ |
| Smooth expand transitions (`ClientProfileExpandableRegion`) | ✓ |
| Email/consent full-width in registration answers | ✓ (this branch) |
| Messenger prerequisites only in confirm dialog | ✓ |

## Recommended next steps

1. Merge registration answers layout fix.
2. Decide bulk-select visibility vs Pro-only spine rule.
3. Optional: mobile filter collapse or document always-visible as ratified.
4. Optional: refresh `clients-profile-action-first.html` mock.
