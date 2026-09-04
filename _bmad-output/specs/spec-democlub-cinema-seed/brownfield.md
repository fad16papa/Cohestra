# Brownfield notes

## Current cinema seed

- Module: `web/lib/marketing/marketing-demo-club.json` + `marketing-demo-club.ts`
- Tests: `web/lib/marketing/marketing-demo-club.test.ts`
- Org: **Riverside Rec** · host `riverside-rec.cohestra.app`
- Sparse roster: Elena Martinez, Sam Rivera, Jordan Kim, Priya Shah (4 visible) + `clientListTotalCount` 248
- Activities: Sunday clinic, board games night, youth open play
- Week locked roughly **2026-03-08 → 2026-03-15**
- Invariants already enforce: no Acme org; `@example.com` emails; no remote logo/hero assets; room availability; selected/follow-up/proof clientDetails; non-empty campaigns; locked activity names in ranking

## Gap vs this SPEC

| Brownfield | Target |
|------------|--------|
| 4 postcard people | 5 Anchors + 25–40 visible ambient |
| Sunday clinic headline | Golden Hour Run 34/42 + Pickleball + Board Game Night |
| Elena / Jordan arcs | Maya / Daniel / Priya Nair / Marcus / Sarah arcs |
| Weak cross-room number law | Derived assertions + reverse-chain CI |
| Feature-carousel rooms in mounts | House-tour rooms consume same seed (mount reorder is downstream) |

## Migration stance

- Prefer **atomic rewrite** of the JSON + updating tests/invariants in one story slice over incremental rename spaghetti.
- Preserve the **single static JSON** architecture from story 33.1.
- Backend `DemoDataSeeder` is out of scope unless a later story unifies API demo tenants with marketing JSON.

## Downstream sequence (locked)

1. This seed SPEC → implement fixtures + helpers + reverse-chain tests  
2. Website mount (FOH) against seed  
3. Clients / Activities / Follow-up mounts  
4. Analytics mount  
5. Committed AI product surface (gate) → AI chapter  
6. Cinema polish (frame, seek cuts, density chrome)
