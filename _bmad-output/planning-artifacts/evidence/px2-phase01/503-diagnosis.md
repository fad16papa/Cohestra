# PX2-LIVE-004 — authenticated-route 503 diagnosis

**Date:** 2026-09-22  
**HEAD reviewed:** `5c3fe75d` plus this Phase 0.1 docs commit  
**Method:** Playwright `page.on("response")` on `http://default.localhost:3000/dashboard` after operator login (`waitUntil=networkidle`). Confirmed with `curl` using a tenant JWT.

## Exact failing request (recurring)

| Field | Value |
|-------|--------|
| Method | `POST` |
| URL | `http://localhost:8080/api/v1/admin/billing/sync` |
| Status | **503** |
| Resource type | `fetch` |
| Response body | `{"title":"Billing unavailable","status":503,"detail":"Paddle is not configured in this environment."}` |
| Screens | Every authenticated admin route that mounts `TenantShellProvider` (dashboard, clients, activities, website, reports, campaigns, settings, profile, compose, Form Studio) |
| Repro | 100% on this VM. First TenantAdmin session after load. Subsequent navigations in the same tab are suppressed by `sessionStorage` key `cohestra_billing_sync_attempted`. New browser context (Playwright per-route) repeats the 503. |

## Caller (CODE)

```113:115:web/components/shell/tenant-shell-provider.tsx
    void syncBillingFromProviderWithAuth(authFetch)
      .then(() => refreshShell())
      .catch(() => undefined);
```

API maps unconfigured Paddle to 503 by design:

```56:66:src/Api/Controllers/V1/BillingController.cs
        if (!paddleOptions.Value.IsConfigured)
        {
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                new ProblemDetails
                {
                    Title = "Billing unavailable",
                    Detail = "Paddle is not configured in this environment.",
                    Status = StatusCodes.Status503ServiceUnavailable,
                });
        }
```

The catch in the shell swallows the error, so first paint still succeeds. The browser console still logs `503 Service Unavailable`.

## Classification

| Question | Answer |
|----------|--------|
| Is the 503 status an environment-only incident? | **Partially.** Paddle is not configured here (and is not configured in any native-dev snapshot). The API 503 for `!IsConfigured` is intentional. |
| Is the recurring console 503 a product defect? | **Yes — product behavior, not incidental.** The shell **unconditionally POSTs `/billing/sync` on every new TenantAdmin session** without reading `billingConfigured` from `/api/v1/admin/billing` first. Any environment without Paddle (local, CI, many UAT boxes) will 503 on every authenticated admin entry. This is not a transient outage. |
| Did pages fail to render? | No. First paint and primary jobs completed. |
| Other 4xx/5xx this pass | Website 404s from Phase 0 were not reproduced as a single asset in the isolated dashboard diagnosis. Basic Website additionally called `GET /api/v1/admin/site` → **500** `Site pages require a Core plan or higher` (plan gate using 500 instead of 403) — see PX2-ENT-004. Intentional `/nope-px2-audit` → Next default 404. Stale Phase 0 client/activity IDs 404 after demo reseed (environment). |

**Do not classify this 503 as incidental.** Record it as a product session-start call that depends on a third-party that is optional in Development.
