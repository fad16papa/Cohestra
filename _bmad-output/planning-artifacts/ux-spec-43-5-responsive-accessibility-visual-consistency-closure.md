# UX 43.5 — closure delta (not a redesign)

## Cookie banner

Non-modal region under the marketing header. Paper surface, top/bottom line, existing atelier type. Full width of the header gutters (`px-5 sm:px-8 lg:px-10`).

Copy:

- Title: Cookies on this site
- Body: Cohestra uses essential cookies to keep you signed in and to remember this choice. Optional analytics are not currently used. Privacy policy link (must **not** accept).

Actions, one row wrapping, all `min-h-11`:

1. Accept — lagoon atelier
2. Reject non-essential — ghost atelier (same size; not muted fine print)
3. Preferences — ghost atelier

Motion: existing 160ms or instant under `prefers-reduced-motion`. No new timings.

Dismiss: unmount. No leftover gap.

Cinema `#crm`: hide.

## Preferences (38.6 dialog)

Name: Cookie preferences.

- Essential cookies — always on, disabled control, helper: required to sign in and remember this choice.
- Optional analytics — default off, helper: not currently used on this site.

Save choices / Cancel. Esc and overlay close restore focus to Preferences. Fit 390. PRM respected by Dialog.

Do not preselect optional. Do not invent Advertising / Personalization categories.

## Register

Eyebrow: First-time setup (keep).
Title: Create your workspace admin account
Description: This creates the initial admin account for your workspace. You can invite teammates later, according to your plan.

## Public Suspended

Eyebrow: Workspace paused (keep).
H1: `{tenant} is paused` / `This workspace is paused`.
Body: keep platform-review meaning. Do not say on hold.

## Marketing focus

`marketingAtelierButtonClass` and header/footer marketing text links: `focus-visible:ring-2 focus-visible:ring-lagoon focus-visible:ring-offset-2`. Do not restyle hover or cinema.

## Out of scope visually

Marketing restyle, dashboard restyle, Clients, registration shells, Settings, Platform, Creation Studios, motion library.
