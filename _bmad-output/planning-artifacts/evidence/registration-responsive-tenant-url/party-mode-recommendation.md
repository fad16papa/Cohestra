# Party Mode — one recommendation

**Question:** What is the smallest truthful design and architecture that makes Cohestra registration forms excellent on desktop and mobile browsers while adding an optional tenant-website URL integration only for Core and Pro, without breaking Basic registration?

**Cast:** John (PM), Sally (UX), Winston (Architect)

**Mode:** session, autonomous close to one recommendation.

---

**John:** The matrix is already the product. All plans register. Basic has no website option — not a locked teaser. Core/Pro may opt in. Do not open a PRD. Do not invent a paste-any-URL field. If the control already lives in Form Studio and the gate already exists, ship the gaps, not a second product.

**Sally:** Keep the checkbox on the Form tab, beside closed-message and close-at. That is publication behavior, not a Design token. Basic: section unmounted. Core/Pro: optional, derived hostname, no DNS jargon. Preview must stop lying — a 390px frame that still applies `lg:` because the operator laptop is 1440 is not a mobile preview. Ratify current public widths: 720 centered, 480 poster, split two-column from 1024 (`lg`), not a rollback to a historical 480-everywhere column.

**Winston:** One renderer. `@container` on public, embed, and preview roots; layout-critical `@sm:` / `@lg:`. Split `w-screen` breakout stays public-only so preview/embed cannot escape their frame. Persist `formSchema.meta.showPublisherWebsiteLink` — do not put this in theme JSON. Normalize Basic on every persist path *before* EnsureAllowed so downgrade saves do not 403. Public href stays request origin; SSR `buildTenantDashboardUrl` would emit `{slug}.cohestra.app` without `window`. Form Studio display already uses the client builder. No correct-course: Core Website Builder Essentials is current truth.

**John:** Then we are agreed. One story. Harden, don't rebuild.

---

## Locked recommendation

1. Reuse `PublicRegistrationOpen` + existing Form-tab Website connection.
2. Fix preview/embed layout context with container queries; poster preview 480; public-only split breakout.
3. Basic: no UI, persist ignore/normalize, public ignore-by-plan.
4. Core/Pro: optional derived canonical tenant site URL.
5. Tests: plan matrix, tenancy, responsive viewports, embed iframe, preview parity.
6. Skip PRD / market / domain research. Skip correct-course. Leave 42.3 / 42.4 / Epic 43 untouched.
