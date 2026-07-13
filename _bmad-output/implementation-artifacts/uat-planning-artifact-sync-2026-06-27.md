---
status: done
completed: 2026-06-27
approved_via: sprint-change-proposal-2026-06-27
---

# UAT Planning Artifact Sync (Correct Course)

Status: **done**

## Story

As a developer,
I want PRD, architecture, UX, and epics to reflect UAT polish and registration numbers,
So that future work and AI agents use accurate planning context.

## Acceptance criteria

1. **PRD updated** — FR-4 extended; Registration number glossary; §6.4 UAT polish section
2. **Architecture updated** — `registration_number`, unique (client, activity), demo seed note
3. **UX updated** — Confirmation ID pattern; ActivityCard count; FormFieldEditor reorder
4. **Epics updated** — UAT polish informal section before Epic 8

## Files changed

- `_bmad-output/planning-artifacts/prds/prd-lead-generation-crm-2026-06-14/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/ux-designs/ux-lead-generation-crm-2026-06-14/EXPERIENCE.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-27.md` (approved)

## Remaining (operator / dev)

- [ ] Run `docs/deploy/uat-polish-checklist.md`
- [ ] Git commit for code + docs
- [ ] Mark `uat-handoff-checklist` done in `sprint-status.yaml`
