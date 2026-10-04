# Story 42.1 tour accessibility contract

Selected: **skippable non-modal tour**.

- Named coachmark (`role="region"`, no `aria-modal`)
- No full-screen pointer-blocking overlay and no 9999px dimmer
- Highlight ring is `pointer-events-none`; only the tooltip is clickable
- Skip/dismiss always available (button + Escape)
- Escape does not complete the tour while a 38.6 AlertDialog is open
- Does not replace the page `h1`
- Does not auto-focus on open (first Tab remains skip link → main)
- Application stays pointer-operable under the tour
- Dismissal persists per encoded tenant slug and does not reopen
- Reduced motion: no position transitions
- Locked/pending/denied rooms never start the tour
- Preview step requests Preview workspace so the live pane exists
- Keys: `activity-lead:website-builder-tour-completed:<encodeURIComponent(slug.toLowerCase())>`
- Legacy unscoped keys are ignored so they cannot leak across tenants
