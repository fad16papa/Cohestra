# Story 42.1 tour accessibility contract

Selected: **skippable non-modal tour**.

- Named dialog (`role="dialog"`, `aria-modal="false"`)
- Skip/dismiss always available
- Does not replace the page `h1`
- Does not auto-focus on open (first Tab remains skip link → main)
- Overlay z-index stays below focused skip link (`z-[80]`)
- Escape and backdrop click dismiss
- Dismissal persists per tenant slug and does not reopen
- Reduced motion: no position transitions
- Locked/pending/denied rooms never start the tour
- Keys: `activity-lead:website-builder-tour-completed:<tenantSlug>` (and visited/checklist siblings)
- Legacy unscoped keys are ignored so they cannot leak across tenants
