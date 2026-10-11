---
status: in-review
story: 19.4
title: Fix Paddle Manage Payment return URL validation
---

# Story 19.4 defect — Paddle return URL validation

## Intent

UAT Manage payment posts `https://{slug}.uat.cohestra.app/settings/billing` and receives 400 because the API compared that URL to `Request.Scheme` + `Request.Host`. Behind shared HTTPS nginx → Cohestra nginx → API, `Request.Scheme` stays `http`.

## Scope

- Allow-list portal and checkout return URLs against the authenticated tenant public origin (`PublicWeb` + slug) and that tenant's verified custom domain.
- Do not widen ForwardedHeaders trust, accept `*.cohestra.app`, or trust `X-Forwarded-Host` for redirects.
- Do not close Story 19.4 from this fix alone.

## Acceptance (Given / When / Then)

- Given UAT PublicWeb `https://uat.cohestra.app` and tenant `creativorare`, when Manage payment posts the workspace HTTPS billing URL, then validation succeeds (Paddle 200/503, not 400 origin).
- Given a return URL with http, another tenant host, an external host, a deceptive suffix, a nonstandard port, or a non-URL, then the API returns 400.
- Given `X-Forwarded-Host: evil.example`, when the return URL is that host, then the API still returns 400.
- Given checkout success/cancel URLs, then the same allow-list applies.
