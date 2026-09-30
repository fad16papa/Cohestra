# Remaining Reports `text-lagoon` inventory (Story 38.4)

HEAD correction: all authenticated Reports/Analytics `text-lagoon` occurrences below were **migrated** to `text-text-link`. None remain deferred. Inventory test asserts zero `text-lagoon` under authenticated product globs.

Light `--text-link` is `#043532` (independent of decorative `--lagoon` `#0b6b63`) so 14px links still sample ≥4.5:1. Declared contrast on `--paper` `#fafbfc` is **12.99:1**. Dark `--text-link` `#159a90` on `--paper` `#070d12` is **≥4.5:1**. Dark `--lagoon` `#12877d` remains fill/atmosphere only.

| File | Component | Purpose | Size / weight | Kind | Foreground | Background | Contrast | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `web/components/reports/report-community-ranking-panel.tsx` | Community ranking header icon | UI graphic accompanying count | 16px icon | icon / UI graphic | `--text-link` | `--paper` / card | light 12.99:1; dark ≥4.5:1 | **Migrated** — 38.4 |
| `web/components/reports/report-community-ranking-panel.tsx` | Leader badge | Status word “Leader” | 10px / semibold | normal text | `--text-link` | card / lagoon tint | light ≥4.5; dark `--text-link` ≥4.5 | **Migrated** — 38.4 |
| `web/components/reports/report-trust-bar.tsx` | CSV export trust line | Helper / metadata | 12px / medium | normal text | `--text-link` | `--paper` | dark `--lagoon` would fail 4.5; `--text-link` passes | **Migrated** — 38.4 |
| `web/components/reports/report-activity-ranking-chart.tsx` | Activity name hover | Link hover | 14px / semibold | normal text | `group-hover:text-text-link` | `--paper` | passes | **Migrated** — 38.4 |
| `web/components/reports/report-lead-growth-panel.tsx` | Retention rate annotation | Helper on card | 12px / normal | normal text | `--text-link` | card | passes | **Migrated** — 38.4 |
| `web/components/reports/report-follow-up-chart.tsx` | Slice label hover | Link hover | 14px | normal text | `group-hover:text-text-link` | `--paper` | passes | **Migrated** — 38.4 |

No remaining Reports `text-lagoon`. Marketing / legal / cinema `text-lagoon` stays **outside Story 38.4**.
