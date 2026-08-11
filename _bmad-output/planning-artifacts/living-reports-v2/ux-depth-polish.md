# Reports UX depth polish

## Problems addressed
- Top Activities: Recharts Y-axis scrambled long load-test names
- Lead growth: pale text-only list
- Community ranking: flat list without share context

## UX decisions
- Replace horizontal bar chart with **ranked rows + share bars** (truncate + title tooltip)
- **ReportDepthCard** — layered shadow, accent top border, hover lift (subtle 3D, not WebGL)
- Lead growth: **cohort composition** stacked bar + icon stat cards + retention hint
- Community ranking: **% of report**, rank badges, leading-community callout

## Do not
- Use category-axis Recharts for long free-text labels
- Duplicate chart + list for the same ranking data
