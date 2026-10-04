# Story 41.2 intelligence mode / state matrix

| Mode / state | Presentation | Must not |
| --- | --- | --- |
| `deterministic` | “Based on workspace rules and data.” | Claim synthesis |
| `synthesized` | “Synthesized from the same grounded facts.” | Invent counts |
| Synthesis disabled | Deterministic brief usable | Enable provider |
| Synthesis provider failure | Deterministic fallback (API already returns facts) | Crash the page |
| Unknown / invalid mode | Conservative deterministic wording | Claim synthesis |
| `insufficientData` | Named message + manual next step (publish activity / record a registration or review Dashboard) | Treat as empty success |
| API 5xx / network | ProductErrorState + retry; keep `h1` | “Nothing needs attention” |
| API 403 | Denied; keep `h1` | UpgradePanel |
| Malformed payload | ProductErrorState (invalid brief) | Render partial invented cards |
| Safe-action unavailable | Insight stays; action is text, not a link | Drop the brief |
| Loading | PageHeader + polite “Loading Cohestra AI…” | Continuous thinking animation |
| Stale / refreshing | Keep last truthful brief if still showing; polite updating text | Flash empty |
