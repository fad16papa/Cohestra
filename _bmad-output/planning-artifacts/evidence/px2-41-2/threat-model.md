# Story 41.2 action / evidence link threat model

## Assets

- Tenant-scoped people, activity names, counts
- Recommended next-action URLs
- JWT in the browser

## Threats and controls

| Threat | Control |
| --- | --- |
| Absolute / protocol-relative / encoded external URL | Decode then allowlist; reject `://`, `//`, `\` |
| `javascript:` / `data:` / `vbscript:` | Reject scheme after decode |
| Open redirect via `/login?next=` | `/login` not allowlisted |
| Public registration `/r/{slug}` | Not allowlisted |
| Platform operator routes | Not allowlisted |
| Tenant-host crossing | Same-origin relative paths only; API already tenant-scoped |
| Clicking an unsafe recommendation | Render non-clickable “Next action unavailable” |
| Hiding a valid brief because one href is bad | Neutralize that href only |
| XSS via evidence value | Render as text; no `dangerouslySetInnerHTML` |
| Cross-tenant IDs in hrefs | Backend queries filter `TenantId`; Playwright asserts no foreign IDs |
| Logging PII | Existing composer logs mode/count only |

## Chosen parse rule

If `recommendedAction.label` exists and `href` is unsafe or empty: keep the insight, set `href: null`. If the insight itself is missing required grounded fields, fail the payload (malformed).
