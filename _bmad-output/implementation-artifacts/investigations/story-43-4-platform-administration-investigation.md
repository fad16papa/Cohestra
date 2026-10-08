# Investigation: Story 43.4 Platform administration

## Hand-off Brief

1. **What happened.** Original 43.4 predates 38.4–38.6, 39.x, and 43.1–43.3. Platform already has a distinct staff shell, one `<main>`, page-level `<h1>`s, Suspend two-step with break-glass copy, complimentary/default-tenant/audit, scoped table overflow, and authoritative API authz.
2. **Where the case stands.** Remaining delta is inheritance, not a redesign: alias `--plat-*` shared semantics (do not flatten gold wash / ink header), replace `--plat-stone` on paper (fails AA), add skip + `aria-current` + 44px menu, replace `window.confirm` Archive/recovery, and show Suspended vs OnHold operator language.
3. **What's needed next.** Spec + implement that delta only. Do not merge Platform into tenant Admin chrome, add impersonation, AdminRouteTransition, Cinema, or lifecycle/Paddle policy changes.

## Case Info

| Field | Value |
| ----- | ----- |
| Ticket | 43.4 |
| Date opened | 2026-10-08 |
| Status | Concluded |
| System | Cohestra main `059ee9a4` |
| Evidence sources | `(platform)/layout.tsx`, PlatformHeader, tenant/support pages, AlertDialog 38.6, brand-tokens.css, PlatformTenantService |

## Delta audit (CURRENT HEAD `059ee9a4`)

| Original concern | Class | Evidence |
| ---------------- | ----- | -------- |
| Parallel `--plat-*` system | PARTIALLY SATISFIED | Hex duplicates `--ink/--paper/--lagoon/--danger`; `--plat-stone` still `#8B939C` (fails AA on paper); gold wash + ink header are legitimate Platform-only |
| Native/bespoke controls | PARTIALLY SATISFIED | Semantic `<button>`/`<input>` already used; focus often hover-adjacent; do not mechanically swap to Button |
| Skip link | STILL MISSING | Platform layout has no `AdminSkipLink`; tenant dashboard already has 38.5 contract |
| One `<main>` | ALREADY SATISFIED | `web/app/(platform)/layout.tsx` single `<main>` |
| One page `<h1>` | ALREADY SATISFIED | Directory / tenant / support / report each own h1; header "Platform" is context |
| `aria-current` nav | STILL MISSING | `platform-header.tsx` links have no current-route |
| 44px mobile menu | STILL MISSING | Menu is `size-10` (40px); pagination `min-h-10` |
| Archive `window.confirm` | STILL MISSING | `tenants/[id]/page.tsx`; recovery also `window.confirm` in ops panel |
| Suspend two-step | ALREADY SATISFIED | Reason required + Confirm suspend + break-glass copy — safer than a reasonless modal |
| Suspended vs OnHold | PARTIALLY SATISFIED | Break-glass copy present; surfaces still print raw `Suspended` / `billingStatus`; directory filter omits OnHold |
| Complimentary / default tenant / audit | ALREADY SATISFIED | Server 409 on default; UI complimentary guard; audit table scoped overflow |
| Platform identity (not tenant chrome) | ALREADY SATISFIED | No sidebar / Follow-up / PlanBadge / AdminRouteTransition |
| PlatformAdmin authz | ALREADY SATISFIED | `PlatformRouteGuard` + API `PlatformAdminOnly`; operator 403 in lifecycle integration tests |
| Impersonation | OBSOLETE / ABSENT | Not present; must stay absent |
| Cinema / tenant Admin motion | OBSOLETE | Platform is outside Epic 37 |
| 390 directory overflow | PARTIALLY SATISFIED | `PlatformDataTable` scoped `overflow-x-auto`; page-level overflow and 44px pagination still to verify |
| Empty/error quality | PARTIALLY SATISFIED | Empty copy exists; errors are thin (happened, weak means/do) |

## Token classification

| Token | Class | Decision |
| ----- | ----- | -------- |
| `--plat-ink` / `--plat-ink-soft` | SHARED SEMANTIC | Alias `--ink` / `--ink-soft` |
| `--plat-paper` / `--plat-paper-warm` | SHARED SEMANTIC | Alias `--paper` / `--paper-warm` |
| `--plat-stone` | SHARED SEMANTIC (broken) | Alias `--text-muted` (`#252c33`) for body/helper |
| `--plat-line` / `--plat-line-strong` | SHARED SEMANTIC | Alias `--line` / `--line-strong` |
| `--plat-lagoon` / `--plat-lagoon-fg` / `--plat-danger` / `--plat-danger-bg` | SHARED SEMANTIC | Alias `--lagoon` / `--lagoon-fg` / `--danger` / `--surface-danger` |
| `--plat-gold` / `--plat-gold-soft` | PLATFORM-SPECIFIC decorative | Keep (header/wash identity) |
| `--plat-header-muted` | PLATFORM-SPECIFIC | New: `#8B939C` on ink only (AA ~6.3:1). Do not use `--text-muted` on ink |

## Stronghold

`web/app/(platform)/layout.tsx` still inlines hex `--plat-stone: #8B939C` and owns the only Platform `<main>` without skip/id.

## Recommendation

Inherit tokens + a11y primitives. Keep staff chrome. Replace only confirmed gaps.

## Status

Concluded — High confidence.
