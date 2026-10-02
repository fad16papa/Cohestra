# Story 39.3 implementation readiness

Recorded 2026-10-02 from synchronized main `cc63c61a`. Product Manager + Architect investigation. **No invented plan thresholds.**

## Verdict

**Ready to implement.** Existing API/shell contracts match DESIGN.md D4 for Website, Campaigns, Team invites, Member Team, and Billing ownership. Analytics is resolved: **do not lock the Analytics nav room for Basic.** One recorded mismatch is left as-is (server reports `custom` → 400, not `plan_locked`); this story does not change server plan math.

## Sources

| Contract | Source |
| --- | --- |
| D4 presentation | `docs/DESIGN.md` §15, §3.1–3.2 |
| IA hide vs lock | `cohestra-information-architecture.md` §9.2 |
| Shell fields | `GET /api/v1/admin/shell` → `plan`, `isTenantAdmin`, `isBillingOwner` (no capabilities array) |
| Website | `SitePageService.EnsureSitePlanAllowedAsync` — Basic → 403 `plan_locked` requiredPlan Core |
| Campaigns | `TenantPlanGate` / `RequireProPlanFilter` — not Pro/Enterprise → 403 `plan_locked` |
| Analytics | `ReportsController` TenantOperator, no plan attribute. Client `reports-page-client.tsx` gates advanced filters with UpgradePanel Core |
| Team | `TeamController` TenantAdminOnly. Invites Core+ → 403 `plan_locked`. Members → Forbid |
| Billing | TenantAdminOnly. Footer: `plan === "Basic" \|\| isBillingOwner` |
| Custom domain | Settings `settings-domain` “Enterprise coming soon” |
| UpgradePanel | `upgrade-panel.tsx` — admin checkout vs member “Ask a tenant admin” |
| D12 Basic | `E2eEntitlementFixtureSeeder` `px2-basic` |
| D12 Pro | default tenant `operator@cohestra.local` |

## Analytics resolution (mandatory)

Basic retains weekly/default reporting (200). Advanced filters (`custom`, activity/community/lead/referral, client also treats `monthly`) swap the **page body** to UpgradePanel Core. Locking the whole Analytics room would present usable reporting as unavailable — **forbidden**.

Server `custom` currently throws ArgumentException → **400**, not `plan_locked`. Recorded; do not invent a reports `plan_locked` in this story.

## Verified matrix

Legend: **U** unlocked/content · **L** visible+locked (nav lock + destination) · **P** visible, partially gated in-page · **H** hidden (structurally unavailable) · **D** deep-link denied/redirect (not UpgradePanel)

### TenantAdmin

| Destination | Basic | Core | Pro | Direct HTTP | Required plan | Destination UI when not entitled |
| --- | --- | --- | --- | --- | --- | --- |
| Dashboard, Clients, Activities, Follow-up, AI, Settings | U | U | U | 200 | — | content |
| Analytics | P | U | U | 200 default; advanced client-gated | Core for advanced only | in-page UpgradePanel; **nav unlocked** |
| Website | L | U | U | 403 `plan_locked` Core | Core | priced UpgradePanel |
| Campaigns | L | L | U | 403 `plan_locked` | Pro | priced UpgradePanel |
| Team | L | U | U | GET 200; invite 403 `plan_locked` on Basic | Core (invites) | UpgradePanel when `invitesAllowed=false` |
| Billing | U | U if owner else H | U if owner else H | 403 if not admin | — | content / owner-managed copy |
| Custom domain | H | H | H | n/a (coming soon) | Enterprise | hidden; not an upgrade offer |
| Platform items | H | H | H | 403 | — | not in tenant nav |

Enterprise follows Pro for Website/Campaigns/Team; custom domain **U** (control still “coming soon” copy if opened).

### TenantMember

| Destination | Basic | Core | Pro | Direct HTTP | Destination UI |
| --- | --- | --- | --- | --- | --- |
| Relationship rooms + Analytics + AI + Settings profile | U / Analytics P on Basic | U | U | 200 | content |
| Website | L | U | U | same plan_locked as admin if Basic | UpgradePanel **ask-admin**, no checkout |
| Campaigns | L | L | U | plan_locked if not Pro | UpgradePanel **ask-admin**, no checkout |
| Team | H | H | H | 403 Forbid (not plan_locked) | redirect/denied — **not** UpgradePanel |
| Billing | H | H | H | 403 Forbid | denied — **not** UpgradePanel |
| Custom domain | H | H | H | — | hidden |

### Pending shell (`shell == null`)

Primary rooms visible **without** lock glyphs. Footer Settings only. No Team/Billing flash. No false unlock of paid writes (pages still wait on shell/API).

## Conflicts with D4

None that block implementation. Reports 400 vs `plan_locked` is an existing server contract; UI already uses UpgradePanel for advanced filters without claiming typed 403.

## Fixtures this story may add (D12 only)

- `px2-core` / `px2-core-admin@cohestra.local` Core TenantAdmin
- `px2-pro-member@cohestra.local` TenantMember on default Pro tenant

Not production tenants. DemoDataSeed still required. Do not SQL-flip `default.Plan`.
