# Story 40.3 security / isolation

- Clients remain tenant-scoped via existing host + `TenantOperator`.
- No new endpoints.
- Export still streams only the caller tenant.
- Profile GET 404/403 must stay status-only (no other-tenant leakage).
- Messenger confirm logs initiation only; QA does not send WhatsApp/Viber/email.
- Do not weaken tenant isolation tests.
