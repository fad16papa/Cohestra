# SPEC — Registration responsiveness + plan-true tenant website link

## Why

Operators and guests must complete registration on real desktop and mobile browsers from one public renderer. Core and Pro may optionally connect a registration to the tenant’s canonical Cohestra website. Basic must keep full registration without seeing or receiving Website Builder capability.

## Capabilities

- **CAP-1** Public `/register/{slug}` and `/embed/register/{slug}` stay readable and free of horizontal overflow from 320px through desktop widths, including confirmation and unavailable/closed states.
- **CAP-2** Form Studio Desktop / Tablet / Mobile preview reuses `PublicRegistrationOpen` and applies the same layout rules as a public page at that width (container layout context, not scaled-down desktop).
- **CAP-3** Core/Pro Form Studio Form tab offers an optional “use my Cohestra website link” control bound to `formSchema.meta.showPublisherWebsiteLink`. Default remains show-when-eligible when meta is unset. Unchecked hides the link. Save / Preview / Publish never require it.
- **CAP-4** Basic Form Studio does not render the control (not disabled, not upsold). Persist paths normalize the flag to omitted. Public renderer treats Basic as feature-absent even if stale JSON remains.
- **CAP-5** Tenant website href is the current tenant’s canonical public origin (request origin on the public page; client `buildTenantPublicSiteUrl` in Form Studio). No arbitrary external URL. No cross-tenant hostname.
- **CAP-6** Canonical `/register/{slug}` remains available on every plan, independent of Website Builder.

## Constraints

- MUST NOT add a free-form URL field.
- MUST NOT create a second public or preview renderer.
- MUST NOT 403 an otherwise-valid Basic form save solely because a leftover or crafted publisher flag is present.
- MUST NOT emit `{tenant}.cohestra.app` from UAT/local via SSR URL fallback.
- MUST NOT start Story 42.4, Epic 43, or land this work on the 42.3 branch.
- MUST reuse `FormSchemaPlanGate`, `TenantPublicWebUrlBuilder`, and existing plan entitlements.
- SHOULD keep Form-tab placement; MUST NOT scatter the control across Website Studio, dashboard, or publish dialogs.
- MAY keep current public max widths (720 centered, 480 poster, split at `lg`).

## Non-goals

- Website Builder UX revamp, Marketing Cinema, Epic 19, Paddle, pricing redesign.
- Native mobile apps.
- Visible Basic upgrade chips for this control.
- Changing Core Website Builder Essentials back to Pro-only.

## Success signal

The owner matrix is true in UI, API, public renderer, and tests on one HEAD: all plans register responsively; Basic has no tenant-website option; Core/Pro can optionally enable it; downgrade hides the feature without breaking registration.
