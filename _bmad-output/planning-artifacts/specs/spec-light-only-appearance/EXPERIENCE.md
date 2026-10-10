# EXPERIENCE — PlatformAdmin light-only

Date: 2026-10-10
Workflow: bmad-ux (Sally)
Model: Cursor Grok 4.6
Supersedes: global light-only experience written earlier the same day

## Decision

Lock light only on PlatformAdmin. Do not remove theme controls from tenant, public, registration, or website surfaces.

## Surfaces

| Surface | After |
|---|---|
| Platform login | Light, no ThemeToggle |
| `/platform/**` | Light paper/warm surface, dark readable text, separated cards; no charcoal shell |
| Tenant admin top bar | ThemeToggle remains |
| Settings → Appearance | Light / Dark / System + profile persistence |
| Tenant auth (`/login`, forgot/reset password, signup, invite) | Existing ThemeToggle |
| Public registration | Existing ThemeToggle |
| Tenant website | Existing ThemeToggle where previously supported |

## First paint

A direct load of `/platform/login` or `/platform/**` is light in the first frame even when OS or stored preference is dark. Tenant routes keep existing resolution.

## Checkpoint answers

- Is PlatformAdmin always light? **Yes**
- Can OS dark mode make PlatformAdmin dark? **No**
- Can a stored tenant dark preference make PlatformAdmin dark? **No**
- Does visiting PlatformAdmin erase the tenant's selected theme? **No**
- Can tenant/admin users still select Light/Dark/System? **Yes**
- Does Settings → Appearance still exist for tenant/admin? **Yes**
- Do public registration and tenant websites retain existing theme behavior? **Yes**
- Is the owner-reported Platform Overview dark UI fixed? **Yes**
