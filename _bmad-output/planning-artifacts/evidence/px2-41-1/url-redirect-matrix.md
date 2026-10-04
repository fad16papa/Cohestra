# Story 41.1 URL and redirect matrix

| Input | Result |
| --- | --- |
| `/reports` | `/analytics` then client default `?preset=weekly` |
| `/reports?preset=weekly` | `/analytics?preset=weekly` |
| `/reports?preset=monthly` | `/analytics?preset=monthly` (Basic still Core-locked) |
| `/reports?preset=custom&from=2026-01-01&to=2026-01-31` | same query on `/analytics` |
| `/reports?preset=weekly&activityId=&community=Harbour` | keys preserved, including empty |
| `/analytics` (no query) | `replace` to `?preset=weekly` |
| `/analytics?preset=not-a-preset` | parsed as weekly |
| `/analytics?leadStatus=unknown` | leadStatus dropped |
| Filter change on `/analytics` | `router.push` query-only. Pathname motion key unchanged. |
| Browser Back/Forward | Prior Analytics query (preset/filters) is restored. |
| Hard refresh | URL remains source of truth. |
