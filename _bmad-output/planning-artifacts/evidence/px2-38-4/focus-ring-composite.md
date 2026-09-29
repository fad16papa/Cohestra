# Focus-ring composite contrast (Story 38.4)

Requirement: the **visible** focus indicator must reach ≥3:1 against adjacent colors. `ring-ring/30` and `ring-ring/50` must not be accepted because the opaque `--ring` hex passes.

Source: `_bmad-output/planning-artifacts/evidence/px2-38-4/focus-ring-composite.json` (asserted by Vitest).

| Indicator | Theme | Adjacent | Composited hex | Ratio | 3:1 |
| --- | --- | --- | --- | --- | --- |
| `ring-ring/30` | light | `--paper` `#fafbfc` | `#b2d0ce` | 1.58 | fail |
| `ring-ring/30` | light | `--paper-warm` `#f3f5f7` | `#adcccb` | 1.57 | fail |
| `ring-ring/30` | dark | `--paper` `#070d12` | `#0b3738` | 1.50 | fail |
| `ring-ring/30` | dark | `--paper-warm` `#141c24` | `#144244` | 1.55 | fail |
| `ring-ring/50` | light | `--paper` | `#83b3b0` | 2.24 | fail |
| `ring-ring/50` | light | `--paper-warm` | `#7fb0ad` | 2.20 | fail |
| `ring-ring/50` | dark | `--paper` | `#0e5451` | 2.24 | fail |
| `ring-ring/50` | dark | `--paper-warm` | `#155b5a` | 2.19 | fail |
| opaque `--ring` | light | `--paper` | `#0b6b63` | 6.15 | pass |
| opaque `--ring` | light | `--paper-warm` | `#0b6b63` | 5.83 | pass |
| opaque `--ring` | dark | `--paper` | `#159a90` | 5.63 | pass |
| opaque `--ring` | dark | `--paper-warm` | `#159a90` | 4.96 | pass |

## Contracted surfaces migrated to opaque `--ring`

Login and invite already used opaque `ring-2 ring-ring`. Correction migrated:

- register / forgot-password / reset-password field shells
- verify-email (shared `Input`)
- `button` (`ring-2 ring-ring` plus `ring-offset-2 ring-offset-background` so the halo contrasts against primary fill)
- `input`
- change-password field shell and help-support textarea (same translucent failure class)

Disabled controls keep `disabled:pointer-events-none` / `disabled:opacity-50` and are not in the tab order when native `disabled` is set.
