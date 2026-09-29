# Remaining Reports `text-lagoon` inventory (Story 38.4)

HEAD correction: all authenticated Reports/Analytics `text-lagoon` occurrences below were **migrated** to `text-text-link`. None remain deferred.

Light `--lagoon` / `--text-link` `#0b6b63` on `--paper` `#fafbfc` is **5.73:1**. Dark `--lagoon` `#12877d` on `--paper` `#070d12` is **4.45:1** (fails 4.5:1 as normal text). Dark `--text-link` `#159a90` on `--paper` is **≥4.5:1**.

| File | Line (pre-fix) | Component | Purpose | Size / weight | Kind | Pre-fix fg | Background | Pre-fix contrast | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `web/components/reports/report-community-ranking-panel.tsx` | 53 | Community ranking header icon | Decorative accompanying count; still a UI graphic | 16px icon | icon / UI graphic | `--lagoon` | `--paper` / card | light 5.73:1 (pass 3:1); dark 4.45:1 (pass 3:1 graphic) | **Migrated** to `text-text-link` so dark text-role pairing stays consistent |
| `web/components/reports/report-community-ranking-panel.tsx` | 106 | Leader badge | Status word “Leader” | 10px / semibold | normal text (not large) | `--lagoon` on `bg-lagoon/10` | composited lagoon/10 | light ~5.2:1; dark lagoon 4.45:1 **fail 4.5** | **Migrated** — 38.4 |
| `web/components/reports/report-trust-bar.tsx` | 63 | CSV export trust line | Helper / metadata | 12px / medium | normal text | `--lagoon` | `--paper` | dark 4.45:1 **fail** | **Migrated** — 38.4 |
| `web/components/reports/report-activity-ranking-chart.tsx` | 94 | Activity name hover | Link hover | 14px / semibold | normal text | `group-hover:text-lagoon` | `--paper` | dark 4.45:1 **fail** | **Migrated** to `group-hover:text-text-link` |
| `web/components/reports/report-lead-growth-panel.tsx` | 150 | Retention rate annotation | Helper on card | 12px / normal | normal text | `--lagoon` | lagoon-tinted card | dark **fail 4.5** | **Migrated** — 38.4 |
| `web/components/reports/report-follow-up-chart.tsx` | 159 | Slice label hover | Link hover | 14px | normal text | `group-hover:text-lagoon` | `--paper` | dark 4.45:1 **fail** | **Migrated** to `group-hover:text-text-link` |

Marketing / legal / cinema `text-lagoon` remains **outside Story 38.4** (frozen unless a proven WCAG fail on those surfaces).

Vitest `authenticated-product-color-inventory` asserts zero `text-lagoon` under authenticated product globs.
