# Investigation: Story 19.4 Paddle Manage Payment return URL 400

## Hand-off Brief

1. **What happened.** UAT `POST /api/v1/admin/billing/portal` with `returnUrl=https://creativorare.uat.cohestra.app/settings/billing` returns HTTP 400 `Invalid return URL` / `Return URL must stay on the current workspace host` even though the browser hostname matches.
2. **Where the case stands.** Concluded. Root cause is Confirmed: `BillingController` allow-lists against `Request.Scheme` + `Request.Host`, which stay `http` behind the two-proxy UAT hop because `UseForwardedHeaders` trusts only loopback.
3. **What's needed next.** Validate portal and checkout return URLs against the authenticated tenant public origin (`PublicWeb` + slug, plus verified custom domain). Do not widen `ForwardedHeaders` trust. Do not close Story 19.4 on this fix alone.

## Case Info

| Field            | Value |
| ---------------- | ----- |
| Ticket           | Story 19.4 UAT defect — Manage payment return URL |
| Date opened      | 2026-10-11 |
| Status           | Concluded |
| System           | Git HEAD `f293650d` (`origin/main`); work branch `cursor/story-19-4-paddle-return-url-59c2`; UAT two-proxy topology |
| Evidence sources | Source, nginx examples, ASP.NET ForwardedHeaders defaults, UAT report |

## Problem Statement

Workspace `https://creativorare.uat.cohestra.app/settings/billing` → Settings → Billing → Manage payment. Browser posts the current `window.location.href`. API returns 400 claiming the return URL left the current workspace host. The hostnames appear to match.

## Evidence Inventory

| Source | Status | Notes |
| ------ | ------ | ----- |
| UAT HTTP 400 title/detail | Available | User-reported; Confirmed as the failure contract in `BillingController` |
| `BillingController` portal/checkout | Available | `tenantBase = $"{Request.Scheme}://{Request.Host.Value}"` |
| `IsAllowedReturnUrl` | Available | Requires scheme AND host ordinal-ignore-case equality |
| Frontend `in-app-billing-panel.tsx` | Available | `createBillingPortalSession(authFetch, window.location.href)` |
| Checkout success/cancel | Available | `window.location.origin` — same scheme compare |
| `Program.cs` ForwardedHeaders | Available | For/Proto/Host enabled; `KnownNetworks`/`KnownProxies` empty initializers |
| Internal `deploy/nginx/app.conf` | Available | Forwards `Host` + `X-Forwarded-Proto $forwarded_proto`; not `X-Forwarded-Host` |
| Edge TLS example | Available | Sets `X-Forwarded-Proto https` and `X-Forwarded-Host $host` |
| `TenantPublicWebUrlBuilder` | Available | Builds `https://{slug}.uat.cohestra.app` from `PublicWeb:BaseUrl` |
| `TenantRequestHost` | Available | Tenant slug resolution may use `X-Forwarded-Host` (Story 15.1); separate from return-URL allow-list |
| Live UAT nginx dump | Missing | Cloud agent cannot SSH; repo configs + ASP.NET defaults are sufficient for the scheme mismatch |
| Paddle sandbox session | Missing | Not executed; no production/UAT credentials in this run |

## Investigation Backlog

| # | Path to Explore | Priority | Status | Notes |
| - | --------------- | -------- | ------ | ----- |
| 1 | Compare browser HTTPS return URL to API `Request.Scheme` | High | Done | Scheme mismatch is sufficient to 400 |
| 2 | Confirm ForwardedHeaders trust boundary | High | Done | Empty collection initializers do not add Docker networks |
| 3 | Check whether Host also disagrees | Medium | Done | Host likely matches; scheme alone fails the predicate |
| 4 | Checkout success/cancel same predicate | High | Done | Same `tenantBase` construction |
| 5 | Stale running nginx vs repo `app.conf` | Medium | Done | Even a correct edge proto header is dropped unless the API trusts the Docker peer |
| 6 | Platform hostname override | Medium | Done | Unneeded; `Request.Host` is tenant host if nginx `Host $host` is intact |

## Timeline of Events

| Time | Event | Source | Confidence |
| ---- | ----- | ------ | ---------- |
| UAT session | Operator opens Manage payment on `creativorare.uat.cohestra.app` | User report | Confirmed |
| Browser | `POST /api/v1/admin/billing/portal` `{"returnUrl":"https://creativorare.uat.cohestra.app/settings/billing"}` | User report | Confirmed |
| Edge nginx | TLS terminate; `X-Forwarded-Proto https`; `Host $host`; proxy to `cohestra-uat-nginx:80` | `deploy/host-proxy/cohestra-uat.nginx.tls.example.conf` | Deduced (example + documented topology) |
| Internal nginx | HTTP `:80`; `X-Forwarded-Proto` passed through or defaulted to `$scheme` (`http`) | `deploy/nginx/app.conf:8-11,64` | Confirmed in repo |
| API | Connection from Docker 172.x; ForwardedHeaders ignores proto/host | `Program.cs:138-146` | Confirmed |
| API | `Request.Scheme` remains `http`; compare to `https` return URL fails | `BillingController.cs:234-247,514-524` | Confirmed |

## Confirmed Findings

### Finding 1: Allow-list uses API request scheme and host

**Evidence:** `src/Api/Controllers/V1/BillingController.cs:142`, `:234`, `:514-524`

**Detail:** Portal and checkout both build `tenantBase` from `Request.Scheme` and `Request.Host.Value`. `IsAllowedReturnUrl` requires absolute URIs and equal scheme + host.

### Finding 2: Frontend sends the browser URL

**Evidence:** `web/components/billing/in-app-billing-panel.tsx:404`; `web/lib/billing/billing-api.ts:58-65`

**Detail:** Manage payment posts `window.location.href`. Checkout posts `window.location.origin` success/cancel URLs. The client is not inventing a different host.

### Finding 3: Forwarded HTTPS is not applied on the Docker hop

**Evidence:** `src/Api/Program.cs:138-146`

**Detail:** `ForwardedHeadersOptions.KnownNetworks` / `KnownProxies` are get-only lists. `{ }` is an empty collection initializer and does not register RFC1918 or the nginx container. ASP.NET therefore trusts only loopback. The internal nginx → API connection is untrusted, so `Request.Scheme` stays `http` and `X-Forwarded-Host` does not replace `Request.Host`.

### Finding 4: Internal nginx speaks HTTP to the API

**Evidence:** `deploy/nginx/app.conf:18-20,58-65`

**Detail:** Upstream is `api:8080`. `X-Forwarded-Proto` is `$forwarded_proto`, which is the incoming proto or `$scheme`. After the edge hop the incoming proto should be `https`, but the API still will not rewrite scheme unless it trusts that peer.

### Finding 5: Public tenant origin already exists and is HTTPS on UAT

**Evidence:** `src/Infrastructure/Tenancy/TenantPublicWebUrlBuilder.cs:52-55`; `docker-compose.uat.yml` `PublicWeb__BaseUrl`

**Detail:** `BuildTenantOrigin("https://uat.cohestra.app", "creativorare")` is `https://creativorare.uat.cohestra.app`. Comments already warn not to use API `Request.Host` for browser URLs.

### Finding 6: Checkout uses the same allow-list

**Evidence:** `src/Api/Controllers/V1/BillingController.cs:142-160`

**Detail:** Success and cancel URLs fail the same scheme compare on UAT.

## Deduced Conclusions

### Deduction 1: Scheme mismatch is the 400

**Based on:** Findings 1, 2, 3, 4

**Reasoning:** Browser URL scheme is `https`. API `Request.Scheme` is `http`. Host can be identical (`creativorare.uat.cohestra.app`) and the predicate still returns false.

**Conclusion:** The title `Invalid return URL` is produced by a false workspace-host failure. The host is not the disagreeing field.

### Deduction 2: Widening ForwardedHeaders trust is the wrong layer

**Based on:** Finding 3; Story 15.1 `TenantRequestHost`; security constraint

**Reasoning:** Adding Docker/RFC1918 to `KnownNetworks` would also honor `X-Forwarded-Host` from any container on that network, which is a tenant-isolation / open-redirect risk. Return-URL allow-listing must not depend on hop-by-hop proto reconstruction.

**Conclusion:** Approved origin = authenticated tenant public origin (`PublicWeb` + slug) and optional verified custom domain. Leave `ForwardedHeaders` loopback-only.

## Hypothesized Paths

### Hypothesis 1: Scheme lost on the two-proxy hop

**Status:** Confirmed

**Theory:** Browser HTTPS vs API HTTP `Request.Scheme` fails `IsAllowedReturnUrl`.

**Supporting indicators:** UAT 400 with matching hostname; empty KnownNetworks; HTTP upstream.

**Would confirm:** Code path `Request.Scheme` (`http`) vs return URL (`https`).

**Would refute:** API already seeing `https` and still 400.

**Resolution:** Findings 1–4. Host-only mismatch is unnecessary to explain the defect.

### Hypothesis 2: Platform hostname overrides the tenant host

**Status:** Refuted as the primary cause

**Theory:** `Request.Host` becomes `uat.cohestra.app` or an internal name.

**Supporting indicators:** Possible if nginx rewrote Host.

**Would confirm:** `Request.Host` ≠ `creativorare.uat.cohestra.app`.

**Would refute:** Repo nginx sets `Host $host`; scheme mismatch alone 400s.

**Resolution:** Even with a correct Host, scheme compare fails. Do not treat Host rewrite as the root cause.

### Hypothesis 3: Running nginx is stale vs repo

**Status:** Refuted as necessary

**Theory:** Live vhost dropped proto/host headers.

**Would confirm:** Live dump missing `X-Forwarded-Proto https` or `Host $host`.

**Would refute:** API still ignores untrusted forwarded proto.

**Resolution:** Missing live dump. Repo + ForwardedHeaders defaults already produce the 400. Stale nginx is not required.

### Hypothesis 4: Frontend sent a wrong host

**Status:** Refuted

**Theory:** Client constructed a non-workspace URL.

**Resolution:** `window.location.href` is the workspace billing page. Payload matches the reported URL.

## Missing Evidence

| Gap | Impact | How to Obtain |
| --- | ------ | ------------- |
| Live UAT nginx dump / API request scheme log | Would show hop headers on the failing request | Authorized droplet inspect; not required to fix |
| Paddle sandbox portal session after fix | Product acceptance of Manage payment | Authorized UAT deploy + sandbox credentials; not this PR |

## Source Code Trace

| Element | Detail |
| ------- | ------ |
| Error origin | `BillingController.IsAllowedReturnUrl` → portal 400 title `Invalid return URL` |
| Trigger | `POST /api/v1/admin/billing/portal` from Settings → Billing → Manage payment |
| Condition | `returnUri.Scheme` (`https`) ≠ `Request.Scheme` (`http`) |
| Related files | `BillingController.cs`, `Program.cs`, `TenantPublicWebUrlBuilder.cs`, `TenantRequestHost.cs`, `deploy/nginx/app.conf`, `deploy/host-proxy/cohestra-uat.nginx.tls.example.conf`, `in-app-billing-panel.tsx`, `checkout-page-content.tsx`, `billing-api.ts` |

## Conclusion

**Confidence:** High

Confirmed root cause: same-workspace validation compares the Paddle return URL to the API request's reconstructed origin. On the real two-proxy UAT topology the API request remains `http` because forwarded proto is not trusted from Docker nginx. The browser URL is `https` on the tenant host. Checkout success/cancel uses the same predicate and will 400 the same way.

Not the root cause: frontend host construction, accepting every `*.cohestra.app`, or a requirement to trust arbitrary `X-Forwarded-Host`.

## Recommended Next Steps

### Fix direction

Replace `Request.Scheme` + `Request.Host` allow-listing with `TenantPublicWebUrlBuilder` origin for the authenticated tenant slug, plus that tenant's verified custom domain. Default portal/checkout URLs must use the same public origin. Keep `ForwardedHeaders` KnownNetworks/Proxies empty. Keep exact host + scheme match (no suffix, no wildcard). Require HTTPS when `PublicWeb:BaseUrl` is HTTPS.

### Diagnostic

Unit-test the allow-list. Integration-test portal and checkout with valid tenant URLs, wrong scheme, wrong tenant, external host, deceptive suffix, invalid URL, and `X-Forwarded-*` spoofing. Expect spoofed forwarded host to stay rejected.

## Reproduction Plan

1. On UAT HEAD `f293650d`, as billing owner: Settings → Billing → Manage payment.
2. Observe `POST /api/v1/admin/billing/portal` 400 with the workspace HTTPS return URL.
3. After the fix (authorized deploy only): same action must not 400 on origin; Paddle sandbox portal may still 503 if unconfigured.

## Side Findings

- `TenantRequestHost` reading `X-Forwarded-Host` is for tenant slug resolution (Story 15.1), not redirect allow-listing. Do not reuse it as the approved origin.
- Empty `{ }` on `KnownNetworks`/`KnownProxies` is easy to misread as “trust none / trust all”; it leaves framework defaults (loopback only).
- Story 19.4 remains open. This defect is necessary but not sufficient to close billing UAT.
