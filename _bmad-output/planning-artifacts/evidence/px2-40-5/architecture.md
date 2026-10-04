# Story 40.5 architecture and threat model

Model: Grok 4.6 (Architect + UX + security). Composer 2.5 unused.

## Selected mechanism

**Typed `ctx` query parameter**, reconstructed by existing href builders.

Format (max 512 chars):

| Token | Meaning | Href builder |
| --- | --- | --- |
| `d:<view>` | Dashboard view | `dashboardHrefForView` |
| `fu:<category>[:page]` | Follow-up | `followUpHrefForCategory` |
| `cl:<allowlisted query>` | Clients list | `/clients?…` allowlisted keys only |
| `al:<allowlisted query>` | Activities list | `/activities?…` allowlisted keys only |
| `ac:<uuid>[:tab]` | Activity detail | `/activities/{id}` |

Rules:

1. Shared URLs and history are authoritative.
2. Refresh-required context is in the URL or the current route data.
3. No module-global cache. No sessionStorage return stack.
4. localStorage must not override an explicit URL (`view` already follows this).
5. Query-only changes stay pathname-only for Epic 37.
6. Form Studio is not remounted on `ctx` or `tab` query writes.
7. A breadcrumb is navigation context, never authorization.

Room-owned persistence (independent of `ctx`):

- Clients **sort/page** move from React state onto the existing URL parsers.
- Activities **page** joins the list URL.
- Activity **tab** is written with `router.replace` on click.

## Rejected alternatives

| Alternative | Why rejected |
| --- | --- |
| Arbitrary `returnTo` as primary | Open-redirect surface; string concatenation. May still *parse* a validated relative path in tests, but hrefs are rebuilt from typed tokens. |
| sessionStorage stack | Lost across tabs; fails the “refresh must be in URL” rule if exclusive. |
| `history.back()` only | Fails deep-link and refresh. Allowed only as a last resort never — fallback is canonical parent. |
| Name → search guess | Lies. Follow-up has `lastActivityName` only. |
| Module-global memory | Dies on refresh; races across rooms. |

## Return-path threat model

`normalizeInternalReturnPath` / `parseContinuityContext` reject:

- Absolute URLs (`https://…`, `http://…`)
- Protocol-relative (`//example.com`)
- Encoded externals (`%2f%2f`, `%5c%5c`, nested decode)
- `javascript:`, `data:`, `vbscript:`
- Malformed / empty / >512 chars
- Tenant-host crossing (`https://other.localhost`, `Host` in value)
- JWTs, emails, phones, registration answers (not accepted as ctx fields)

Fallback: canonical parent of the current room (`/follow-up`, `/clients`, `/activities`, `/dashboard`). Never `location.assign` of unparsed input.

Cross-tenant UUIDs in a path still hit existing API isolation; a breadcrumb does not grant access.

## Breadcrumb / mobile Back

Compositional primitive (`ContinuityTrail` / enhanced `AdminBreadcrumbs`):

- Desktop/tablet: `<nav aria-label="Breadcrumb">` + ordered list. Current crumb is text + `aria-current="page"`.
- 390px: single Back link, `min-h-11 min-w-11` (44px), label `Back to {room}` when known.
- Does not render a second `<main>` or a second document `h1`.
- Pages pass `ctx` when linking; they do not each invent crumb conditionals.

## Command palette

Reuse Story 38.6 overlay. Primary hrefs stay canonical. Compatibility redirects remain, but are not palette targets. Keyword `reports` may remain on Analytics for discoverability; the visible label is Analytics.

## UX copy

Canonical rooms: Dashboard, Clients, Activities, Follow-up, Analytics, Cohestra AI, Website, Campaigns.

Needs attention remains a Dashboard section. Opportunity remains a Follow-up category. Website page title remains Website Studio.
