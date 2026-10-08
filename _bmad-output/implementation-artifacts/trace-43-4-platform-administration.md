# Traceability — Story 43.4

| Requirement | UI / API | Test | Evidence |
| ----------- | -------- | ---- | -------- |
| Semantic token inheritance | `(platform)/layout.tsx` aliases | `platform-43-4-source.test.ts` | layout + screenshots |
| Muted text contrast | `--plat-stone` → `--text-muted`; header muted on ink | source test | brand-tokens `#252c33` |
| Skip / one main / one h1 | AdminSkipLink + `#main-content` | Playwright 43.4 | directory/tenant/support |
| Focus / 44px | globals `.platform-console` + min-h-11 | source + Playwright menu box | 390 directory |
| aria-current | PlatformHeader | Playwright | Tenants/Support |
| 390 directory/detail/support | scoped tables | Playwright overflow assertions | viewports/*-390.png |
| Archive dialog | AlertDialog Archive workspace | Playwright cancel + confirm | platform-archive-dialog.png |
| Suspend two-step | reason + Confirm suspend | Playwright | platform-suspend.png |
| Suspended vs OnHold | `platform-status-copy.ts` | unit + Playwright | copy tests |
| Authorization | PlatformAdminOnly + guard | Playwright denial + operator 403 | lifecycle integration |
| Default tenant | service 409 + UI hide destructive | unit + new integration | PlatformTenantLifecycle |
| Audit log | existing table + TenantCreated row | Playwright tenant 1440 | platform-tenant-1440.png |
| Complimentary | existing controls | visual + API unchanged | tenant 1440 |
| No impersonation | absent | source test | — |
| No AdminRouteTransition | absent | source test | — |

Zero orphan ACs.
