# Trace 43.5

| Audit finding | Classification | Implementation or evidence | Test | Checkpoint | Disposition |
| ------------- | -------------- | -------------------------- | ---- | ---------- | ----------- |
| PX2-LIVE-001 cookie covers CTA | STILL MISSING → fixed | In-flow region under header | Playwright overlap + click | 390/1440 shots | CLOSED |
| D20 Accept/Reject/Preferences | STILL MISSING → fixed | Three buttons + 38.6 dialog | Playwright | Preferences shot | CLOSED |
| Cookie persistence | STILL MISSING → fixed | `accepted` \| `essential` | Playwright + vitest | Rejected shot | CLOSED |
| Cookie Cinema `#crm` | ALREADY SATISFIED — preserved | hash hide | Playwright | — | CLOSED |
| Optional analytics tracker | ALREADY ABSENT | none added | source grep | — | CLOSED |
| PX2-IA-006 one operator | STILL MISSING → fixed | register + manual | Playwright + source | register | CLOSED |
| PX2-ENT-005 Suspended on hold | STILL MISSING → fixed | maintenance H1 paused | source | — | CLOSED |
| Billing/Platform OnHold | ALREADY SATISFIED | 43.3/43.4 | existing | reuse | CLOSED |
| PX2-A11Y-007 marketing focus | PARTIALLY → fixed marketing | atelier + nav rings | source | — | CLOSED |
| Public ring-ring/50 | OBSOLETE (Epic 35) | untouched | — | — | CLOSED / out of scope |
| 43.999px WhatsApp | OBSOLETE / D | untouched 44px | — | — | CLOSED |
| Mobile tab clearance | ALREADY SATISFIED | dashboard padding | — | — | CLOSED |
| Calendar FAB name | ALREADY SATISFIED | aria-label | — | — | CLOSED |
| Clients table | ALREADY SATISFIED | 40.3 | — | — | CLOSED |
| Community role=row | STILL MISSING → fixed | role removed | source | — | CLOSED |
| Client chips | ALREADY SATISFIED | 40.3 | — | — | CLOSED |
| PX2-STATE-002 empty/error | PARTIALLY SATISFIED | core primitives; nested cells left | — | — | CLOSED |
| PX2-SYS-003 gutters | PARTIALLY → cookie only | reserved banner | Playwright | shots | CLOSED |
| Axe disabled exclude | STILL MISSING → fixed | filter + analyzeAxe | vitest + callers | — | CLOSED |
| Skip scrollIntoView | ALREADY SATISFIED / unproven | untouched | — | — | CLOSED |
| Platform 43.4 | ALREADY SATISFIED | untouched | — | — | CLOSED |
| Epic 35–37 | PROTECTED | no edits | smoke + 43.5 e2e | — | CLOSED |

Zero orphan P1/P2 assigned to Epic 43.

No new legal cookie-policy interpretation. No production fixture/seeder. No new epic.
