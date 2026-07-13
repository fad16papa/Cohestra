---
status: spec + implementation
consultants: Sally (UX), Victor (strategy)
module: clients
scenario: client joined multiple activities
---

# Client profile — multi-activity registration UX

## Problem (current)

Two-column layout: **Master profile** (fixed ~9 fields) beside **Registration answers** (unbounded stack of full answer grids).

| Failure | At 2 activities | At 5+ activities |
|---------|-----------------|------------------|
| Column imbalance | Empty space under master profile | Severe — right column dominates |
| Scan time | Repeat fields (name, email) in every card | Operator cannot find the relevant signup |
| Workflow | WhatsApp + timeline pushed down | Outreach and timeline far below fold |

## Sally (UX) — prescription

1. **Stack, don’t split** — Master profile full width; registrations get their own section below.
2. **Master–detail for history** — Scrollable activity list (newest first) + one detail pane; never render all full answer grids at once.
3. **Progressive disclosure** — List shows activity name, date, field count; answers only for the selected registration.
4. **Keep workflow visible** — WhatsApp outreach and relationship timeline stay at predictable vertical positions (not buried under N cards).
5. **Summary cue** — Header shows registration count (e.g. “3 activities · newest first”).

## Victor (strategy) — why this scales

- Registration archive is **reference**, not daily workflow — don’t let it own the viewport.
- Timeline + outreach are **action surfaces**; they must remain reachable without scrolling past duplicate data.
- Same pattern scales to 20+ activities without redesign (list scrolls; detail is constant height).

## Layout (after)

```
[ Header: name · status · lead control ]

[ Master profile — full width ]

[ Registration answers — master/detail list + selected answers ]

[ WhatsApp outreach ]

[ Relationship timeline ]
```

No API changes — `registrationHistory[]` unchanged.
