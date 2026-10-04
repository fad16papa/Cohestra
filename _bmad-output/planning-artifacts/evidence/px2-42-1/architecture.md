# Story 42.1 architecture

## Selected

Improve the existing Website Studio chrome on `/dashboard/website`.

- Room access: `resolveNavEntitlement("website")` → loading / pending / locked / open
- Fetch `GET /api/v1/admin/site` only when access is open
- Preserve `SitePageRenderer` + `embedded`
- Preserve split at **1280px**, Edit/Preview below **1024px**, Build-or-Preview at 1024–1279
- Hidden preview stays `keepMounted={false}`
- Revert stays Story 38.6 AlertDialog
- Tour stays a skippable non-modal; overlay z-index below focused skip link; keys tenant-scoped
- Isolation: smallest two-entitled-tenant integration test

## Rejected

- New Website route or builder
- Changing `SitePage` / section entitlements / public renderer
- Converting the tour into a blocking 38.6 modal (would fight skip-link more)
- Treating Tailwind `lg`/`xl` as the 1280 split
- Starting Form Studio 42.2–42.4

## Invariants

Server authorization remains authoritative. No plan, Paddle, role, or public-site change.
