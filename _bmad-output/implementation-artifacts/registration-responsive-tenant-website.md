# Story: Registration responsive hardening + plan-true tenant website link

Status: review
Story key: `registration-responsive-tenant-website`
Branch: `cursor/registration-responsive-tenant-url-8d20`
Base: `origin/main` `53bd0c11`
Epic: owner product slice (not 42.4, not Epic 43)

## Validate

| Check | Result |
| ----- | ------ |
| Scope is one releasable slice | PASS — responsive + existing website-link contract |
| Reuses current renderer / gate / URL builder | PASS |
| AC are testable | PASS |
| Persistence additive | PASS — nullable meta bool |
| Basic registration not coupled to Website Builder | PASS |
| 42.3 / 42.4 / Epic 43 untouched | PASS |

Readiness: **READY**

## Goal

Harden the existing public registration renderer for real desktop and mobile browsers, and keep the optional Core/Pro tenant website connection plan-true (Basic absent, server normalize, no arbitrary URL).

## Acceptance criteria

1. **Public responsive** — `/register/{slug}` has no horizontal overflow and a reachable submit at 320, 360, 375, 412, 768, 1366, 1440. Confirmation and unavailable/closed states do not overflow at 320/375.
2. **Embed responsive** — `/embed/register/{slug}` stays within a 320px iframe container (not only a narrowed top-level page).
3. **Preview parity** — Form Studio Mobile/Tablet/Desktop preview reuses `PublicRegistrationOpen`. Preview surface is a CSS `@container`. Layout-critical columns/split/scale use `@sm`/`@lg` so a 390px frame stacks columns. Poster desktop preview is `max-w-[480px]`. Split `w-screen` is public-only.
4. **Basic Form Studio** — Website connection section is not in the DOM. No disabled/locked/upgrade control.
5. **Core/Pro Form Studio** — Optional checkbox present; derived hostname; does not block Save/Preview/Publish.
6. **API Basic** — PUT `meta.showPublisherWebsiteLink: true` succeeds and persists omitted/null (ignore/normalize). Registration remains publishable.
7. **API Core/Pro** — true/false persist; false hides public + confirmation link.
8. **Downgrade** — After plan → Basic, public renderer hides tenant website link even if JSON still has true; next save clears the flag; `/register/{slug}` still works.
9. **Upgrade** — Plan → Core/Pro reveals the control without recreating the form.
10. **Tenancy** — Tenant A cannot emit Tenant B’s website hostname (derived from current tenant slug/origin only).
11. **Regression** — Existing field types still submit; Basic registration is not gated on Website Builder.

## Tasks

- [x] `@container` on public layout, embed layout, preview chrome
- [x] Container variants for columns / split / scale (`@min-[640px]` / `@min-[1024px]`)
- [x] Public-only split breakout; poster preview 480
- [x] Unavailable overflow guards
- [x] Activity + template persist: normalize then EnsureAllowed
- [x] Contract doc: Basic persist ignores, does not 403
- [x] Unit / integration / frontend / e2e coverage
- [x] Checkpoint preview evidence

## Dev notes

- Do not call `buildTenantPublicSiteUrl` during SSR public render.
- Do not 403 Basic publisher-only saves.
- Do not add UpgradePanel for this control.
- Do not implement on the 42.3 branch.

## Test plan (Murat / ATDD)

See `planning-artifacts/evidence/registration-responsive-tenant-url/atdd.md`.
