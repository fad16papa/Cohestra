# Checkpoint 43.5

Date: 2026-10-08  
App: native API `:8080` + web `:3000`  
HEAD: Story 43.5 branch (cookie compact bar)

## Questions

| Question | Expected | Observed |
| -------- | -------- | -------- |
| Can a first-time visitor click Cohestra's primary CTA without dismissing cookie consent? | YES | YES — Playwright clicks Start free with banner present; no geometric overlap |
| Are Accept and Reject non-essential both clear, honest choices? | YES | YES — same-size lagoon / ghost buttons; Preferences third |
| Does bootstrap copy reflect Cohestra's real Team model? | YES | YES — “invite teammates later”; no “one operator” |
| Can anyone confuse a Suspended workspace with Billing OnHold? | NO | NO — public H1 paused; Billing/Platform already distinct |
| Remaining obvious mobile/focus/empty/gutter P1/P2 assigned to Epic 43? | NO | NO material residual |

## Fresh captures

| Surface | Viewport | File |
| ------- | -------- | ---- |
| Marketing first visit | 390 | `viewports/marketing-cookie-390-first-visit.png` |
| Marketing first visit | 1440 | `viewports/marketing-cookie-1440-first-visit.png` |
| Preferences | 390 | `viewports/marketing-cookie-390-preferences.png` |
| Rejected | 390 | `viewports/marketing-cookie-390-rejected.png` |

Register / Suspended / Billing OnHold / Platform / admin shell: source + prior 43.1–43.4 evidence reused (those surfaces unchanged except register copy and Suspended H1).

## Notes

Banner is reserved in-flow under the header so Cinema can keep `window.scrollY`. Hero type can push Start free below the fold; it is not covered.
