# Story 39.4 architecture

Owner: Grok 4.6. Composer 2.5 is not required for this API.

## Primitive

`web/components/shared/page-header.tsx` is the only authenticated page-header.

```ts
type PageHeaderProps = {
  title: string;
  eyebrow?: ReactNode;      // breadcrumb / workspace label — never a heading
  description?: ReactNode;  // supporting copy, greeting, date — never a heading
  actions?: ReactNode;      // existing buttons/links; slot enforces 44px
  className?: string;
};
```

Composition, not route booleans: callers pass nodes. The primitive does not know Dashboard vs Website.

## Ownership

| Concern | Owner |
| --- | --- |
| Document h1 | `PageHeader` `<h1>{title}</h1>` |
| Supporting copy / greeting | `description` as `<p>` or fragment of `<p>`s |
| Eyebrow / breadcrumb | `eyebrow` as `<p>` or link row |
| Primary actions | `actions` slot; min 44×44 on `a` / `button` |
| Landmark | Existing shell `main#main-content` |
| Studio chrome | Local toolbar / panes. Labels are not headings and not a second page title |
| Route motion | Epic 37 pathname wrapper only |

## Layout

- Default: column. From `md` (768px): row, title start, actions end.
- Actions wrap (`flex-wrap`) and never force horizontal page overflow.
- No `animate-*` / transition on the header itself.
- Semantic wrapper is `<header>`, not `<main>` or a heading nest.

## State persistence

Every inventoried route renders `PageHeader` with the **same title** in loading, populated, empty, error, denied, and plan-locked states. Body content below the header changes. Empty-state / UpgradePanel headings stay `h2`.

## Route titles

| Route | `title` | `description` / eyebrow |
| --- | --- | --- |
| Dashboard | `Dashboard` | Date + greeting + cockpit sentence as `<p>`s |
| Clients | `Clients` | Existing merge copy |
| Client profile | client name or `Client` while loading | eyebrow `Client` |
| Activities | `Activities` | Existing copy |
| Activity detail | activity name or `Activity` | eyebrow / breadcrumb |
| Follow-up | `Follow-up` | stub description stays in body |
| Analytics | `Analytics` | existing report sentence |
| Cohestra AI | `Cohestra AI` | stub body |
| Website | `Website Studio` | “Customize your public homepage” on non-studio states |
| Campaigns | `Campaigns` | existing copy |
| Settings | `Settings` | workspace/tenant supporting row |
| Team | `Team` | existing owner/denied copy |
| Billing | `Billing` | existing owner-managed copy |

## Studio boundary

- Website populated: one `PageHeader` / one h1 `Website Studio`. Toolbar keeps controls; drop the large “Website Builder” display title.
- Form Studio: page h1 remains the activity name from the detail header. `h2` “Form builder” stays a section heading.

## Forbidden

- `main` inside the primitive
- nested headings inside the primitive
- route-transition animation
- nav / entitlement / API / Paddle changes
- marketing / public / platform headers
- table redesign
- Story 39.5 error pages
