# Architecture — entitlement, tenant URL, responsive renderer, persistence

Architect: Winston. Only the four required contracts.

## Entitlement enforcement

| Plan | Form Studio control | Persist `showPublisherWebsiteLink: true` | Public tenant website link |
| ---- | ------------------- | ---------------------------------------- | -------------------------- |
| Basic | Absent | Normalize to omitted (200). Do not 403 a valid Basic save. | Never (`isPublisherWebsiteLinkEnabledForForm` false) |
| Core / Pro / Enterprise | Optional checkbox | Persist true/false | Show unless meta === false |

Implementation:

- `FormSchemaPlanGate.NormalizePublisherWebsiteLink` then `EnsureAllowed` on **activity and template** persist.
- Normalize first so leftover Basic `true` cannot throw.
- Public and confirmation consult plan + meta, never stored URL strings.
- Downgrade: public ignores immediately; next save clears stored flag.
- Upgrade: existing schema intact; control appears.

## Tenant URL architecture

Reuse only:

- C# `TenantPublicWebUrlBuilder` (local `{slug}.localhost`, UAT `{slug}.uat.cohestra.app`, prod `{slug}.cohestra.app`)
- TS `buildTenantPublicSiteUrl` / `buildTenantDashboardUrl` (client/`window` aware)

Public registration link `href` = **request origin** of the tenant host. Do not call the TS builder during SSR (no `window` → production host leak).

Form Studio display = `resolvePublicSiteDisplayUrl(shell.tenantSlug)` on the client.

No second URL generator. No cross-tenant selection. Tenancy is “current tenant slug / current origin” only.

## Responsive renderer contract

One tree: `PublicRegistrationOpen`.

Roots marked `@container` (unnamed, inline-size):

- `PublicFormLayout` outer (viewport)
- Embed layout outer (iframe/container)
- `RegistrationPreviewChrome` surface (390 / 768 / 720|480|960)

Layout-critical breakpoints become container variants:

- columns: `@sm:grid-cols-2`
- split grid: `@lg:grid …`
- scale radios: `@sm:grid-cols-5`

Split `w-screen` breakout: **public variant only**. Preview and embed use `w-full max-w-full`.

Poster desktop preview class: `max-w-[480px]` to match public poster.

## Persistence contract

Owner: `formSchema.meta.showPublisherWebsiteLink` (`bool?`).

- Additive. Missing = legacy show for eligible plans.
- Not theme JSON. Not a field. Not a website-builder document.
- No DB migration.
- Templates use the same meta + same gate/normalize.
