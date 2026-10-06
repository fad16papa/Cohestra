# Party — Story 43.2 Team and permissions

Date: 2026-10-06  
Cast: John (PM), Sally (UX), Winston (Architect)  
Question: smallest remaining Team/permissions change that distinguishes role denial, plan locking, seat capacity, and destructive membership actions while preserving authorization.

---

📋 **John:** Role denial is “you cannot do this.” Plan lock is “your role can, your plan cannot.” Seat cap is “the plan includes Team, this workspace is full.” If Member sees UpgradePanel we have failed. Keep 43.1 copy+replace. Do not invent Owner/Manager.

🎨 **Sally:** Do not bloat Settings. Campaigns already taught the pattern: room h1 stays, denied body is ProductErrorState h2. 390: stack member rows, 44px Remove/Revoke/Send invite. Dialogs: Cancel / Remove member / Revoke invite — never Yes/No. Seat-full copy must mention revoke and remove, not only upgrade.

🏗️ **Winston:** No new PermissionDenied framework. ProductErrorState is the shared primitive. Server TenantAdminOnly stays the authority. Seat policy is already members+pending. Race on cap is server 409 + refresh, not realtime. Document existing local Member fixture. No production seeder.

---

## Resolved direction

Reuse ProductErrorState for TenantMember Team denial. Keep 43.1 replace to `/settings/profile`. Keep UpgradePanel for Basic Admin. Keep seat-cap banner. Specific destructive dialog verbs. 390 touch targets. Map API error codes. Test with FakeEmailSender / local fixtures. No new roles, no Billing redesign, no production seeder.
