# NFR — Story 19.4 Option A

| NFR | Evidence | Result |
| --- | --- | --- |
| Security / tenant isolation | Preview/confirm resolve tenant from auth context; client cannot send subscription id, price id, or proration mode | PASS |
| Billing-owner auth | Same `EnsureBillingAccessAsync` as checkout; TenantMember 403 | PASS |
| Secrets | ProblemDetails use sanitized policy copy; tests assert Paddle error bodies and `pdl_`/`pri_` absent from 503 preview | PASS |
| Money safety | `PaddleMinorUnits` rejects decimals/scientific notation; no float proration | PASS |
| Reliability | Preview failure and stale confirm do not mutate; webhook remains source of truth | PASS |
| Accessibility | Review dialog uses AlertDialog title/description, currency `aria-label`s, focus trap from existing overlay | PASS |
| Viewport 390 | `REVIEW_DIALOG_CLASS_NAME` max-height + overflow-y + `calc(100vw - 1.5rem)` | PASS |
| Viewport 1440 | `max-w-md` dialog on existing checkout layout | PASS |
| Production | No live Paddle credentials; no sandbox mutation in this PR | NO-GO (intentional) |
