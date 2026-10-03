# Story 39.4 implementation readiness

Role: Product Manager (`bmad-check-implementation-readiness`, adapted to the story-specific heading inventory).  
Baseline: `main` `2b7cf2fa`. Story 39.3 ACCEPTED/CLOSED. Story 38.5 ACCEPTED/CLOSED. Story 39.5 not started.

## Verdict: READY

The shared `PageHeader` can preserve the Story 38.5 one-`main` / one-`h1` contract. Every inventoried authenticated route already has exactly one document h1 (or a known title defect that this story is allowed to fix: Website title strings). No PO decision is open.

## Canonical sources

- Backlog §39.4, D19 — `_bmad-output/planning-artifacts/cohestra-product-experience-2-backlog.md`
- DESIGN.md D19 / §4.1 / §14
- Story 38.5 accepted contract — one main, one h1, studio preview has no main/h1
- Existing primitive — `web/components/shared/page-header.tsx`

## Heading / header inventory (current)

| Route | h1 owner | Visible title | Supporting copy | Primary actions | Loading / empty / error | Mobile | Studio chrome |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/dashboard` | `DashboardGreetingHeader` h1 `Dashboard` | Greeting + date are `<p>` | Cockpit sentence | None in header | Greeting remains | Card stacks | No |
| `/clients` | `PageHeader` `Clients` | Same | Merge-by-phone copy | Export CSV `size="sm"` | Suspense raw h1; empty stays under header | Actions row at `sm` (640) | No |
| `/clients/[id]` | Profile / loading raw h1 | Client name | None | Profile actions outside header | Loading/error h1 `Client` | Title truncates | No |
| `/activities` | `PageHeader` `Activities` | Same | Lead-engine copy | New activity | Suspense raw h1 | Wrap at `sm` | No |
| `/activities/[id]` | Detail raw h1 | Activity name | Breadcrumb link | Publish controls | Loading/error h1 `Activity` | Title + tabs | Form Studio tab uses `h2` |
| `/follow-up` | `CanonicalRoomStub` h1 | Follow-up | Empty h2 | Empty-state CTAs | Loading/empty/error keep room h1 | Stacked | No |
| `/analytics` | raw h1 | Analytics | Report sentence | Export CSV | Suspense + in-page loading keep h1 | Wrap at `sm` | No |
| `/ai` | `CanonicalRoomStub` h1 `Cohestra AI` | Same | Empty h2 | Empty-state CTA | Same stub contract | Stacked | No |
| `/dashboard/website` | PageHeader or sr-only | `Website Builder` / `Website` / toolbar `<p>` | “Customize…” | Studio toolbar | Loading/lock/error keep a header | Studio split | **Yes** |
| `/campaigns` | `PageHeader` `Campaigns` | Same | Outreach copy | New campaign | Loading/lock keep header | Wrap at `sm` | No |
| `/settings` | `SettingsPageHeader` h1 | Settings | Tenant name `<p>` | None | Header always on page | Stacks | No |
| `/settings/team` | local h1 `Team` | Same | Denied/owner copy | Invite form is body | Loading/denied keep h1 | Stacks | No |
| `/settings/billing` | local h1 `Billing` | Same | Owner-managed copy | Panel is body | Loading/denied keep h1 | Stacks | No |
| Form Studio | Activity-detail h1 | Activity name | Form builder `h2` | Studio controls | Same detail header | Studio panes | **Yes** |

## Gaps this story must close

1. Website titles are `Website Builder` / `Website`, not `Website Studio`.
2. Populated Website has sr-only h1 plus a large toolbar title — duplicate display title.
3. Header actions are 28–32px (`sm` / default Button), not 44px.
4. Action wrap uses `sm` (640), not `<768`.
5. Analytics, stubs, Settings, Team, Billing, and detail routes invent local headers instead of composing `PageHeader`.

## 38.5 preservation

- Do not add `<main>`.
- Do not add a second h1.
- Embedded Website/Form preview must remain without `main`/`h1`.
- Skip target `id="main-content"` unchanged.

## Non-goals confirmed

Nav, entitlements, APIs, tables, marketing headers, 39.5 error pages, Epic 40 Dashboard views.
