# Decision Intent — 21.2 channel-switch dirty behavior

**Date:** 2026-08-09  
**Parent story:** 21.2 Viber follow-up  
**Question:** When Log outreach toggle switches WhatsApp ↔ Viber while the form is dirty, what should happen?

## Recommendation

**Option 2 — Keep per-channel drafts**

## Why (converged)

| Option | Silent loss | Monday speed | Sidebar fit | Complexity |
|--------|-------------|--------------|-------------|------------|
| 1 Warn & confirm | Medium (still loses if confirm) | Low (modal) | Heavy for 21rem card | Low |
| **2 Per-channel drafts** | **High (prevents)** | **High** | **No new chrome** | Med (~15 lines) |
| 3 Keep discard | Low (silent wipe) | High | Lightest | Lowest |

Channels are **independent timeline streams**. Drafts keyed by channel are the same model as per-channel baseline already shipping. Fixes peek-and-return and mis-tap without interrupting intentional switches.

## Implementation sketch (when applying patches)

```ts
type ChannelDraft = { status: OutreachLogStatus; note: string };
// drafts: Record<OutreachChannel, ChannelDraft>
// on switch: save current into drafts[channel]; load drafts[next] ?? baseline(next)
// on successful save: clear drafts[channel]; set baseline from saved
```

## Also apply with patches

- P1 note baseline dirty guard  
- P2 cross-channel isolation unit test  
- P3 radiogroup a11y  
