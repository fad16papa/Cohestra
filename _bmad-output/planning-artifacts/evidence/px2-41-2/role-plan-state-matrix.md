# Story 41.2 role / plan / state matrix

| Actor / state | Room | Dashboard Needs attention | Notes |
| --- | --- | --- | --- |
| TenantAdmin, any recognized plan | Available | Available | No new lock |
| TenantMember, any recognized plan | Available (TenantOperator) | Available | Same policy as 34.1 / 39.3 |
| Basic / Core / Pro / Enterprise | Available | Available | UpgradePanel is not part of this story |
| Missing / unknown plan | Room still opens if authorized | Same | No invented SKU or Basic assumption |
| Unauthenticated | Login | Login | Existing auth |
| PlatformAdmin without tenant | Existing denial | Existing denial | |
| Suspended / OnHold | Existing shell | Existing shell | |
| Cross-tenant facts | Absent | Absent | |
| 403 from brief API | Denied ProductErrorState | Inline denied/error — not empty success | Never UpgradePanel |
