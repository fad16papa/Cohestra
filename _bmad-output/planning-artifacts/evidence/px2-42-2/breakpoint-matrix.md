# Story 42.2 breakpoint matrix

| Width | Shell (existing) | Form Studio composition | Inspector |
|---|---|---|---|
| 390×844 | Compact / More | Stacked palette + canvas | Sheet |
| 430×932 | Compact / More | Stacked | Sheet |
| 767 | Compact | Stacked | Sheet |
| 768×1024 | Compact rail | Stacked | Sheet |
| 1023 | Compact rail | Stacked | Sheet |
| 1024×768 | Expanded rail | Two-pane palette + canvas | Collapsible overlay |
| 1279×900 | Expanded rail | Two-pane | Collapsible overlay |
| 1280×900 | Expanded rail | Three panes | Docked |
| 1440×900 | Expanded rail | Three panes | Docked |

Boundary rules:

- 1023 = stacked. 1024 = two-pane. Do not use `width >= 1023`.
- 1279 = two-pane. 1280 = three-pane. Do not use Tailwind `lg` for three panes.
- 200% zoom: same composition as the resulting CSS viewport.

Toggle visible below 1280 only. At ≥1280 the third pane is simply there.
