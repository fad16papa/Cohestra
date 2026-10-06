# Party 43.1 — Settings nested routes

Date: 2026-10-06  
Cast: John (PM), Sally (UX), Winston (Architect)  
Question: How should Cohestra convert Settings into stable nested routes while preserving every existing role, entitlement, state, deep link, responsive behavior and Settings capability?

---

**John:** Nested routes are not a new Settings product. Operators should understand they are on Plan, Team, or Appearance because the URL and the heading say so. Permissions stay exactly as they are. If a Member gains Team or Billing through a router tree, the story fails. If Basic Team stops showing UpgradePanel, the story fails.

**Sally:** Do not add a fourth chrome layer. The two-pane already works: left rail from 1024, right rail from 1280, chips plus Context sheet below 1024. That is the one pattern. Rails did not vanish in lg–xl; stop rewriting the grid. What is broken is buttons pretending to be routes. Make them links. Current item uses `aria-current="page"`. Page `h1` is the section name. Do not keep a second “Settings” h1 plus “Plan & limits” h2.

**Winston:** Pathname is the only section authority. Kill `activeId` as primary IA. `settings/(workspace)/layout.tsx` owns shared nav, collapse, and Context sheet. Individual pages own the form body. Index `/settings` is not a content URL — client `replace` to the first permitted nested path so history is not polluted. Legacy `?section=` and `activeId` query map through a single table, then strip. Unmatched stays outside the workspace group so `/settings/teem` is 39.5, not Profile-with-rails.

**John:** Admin first view today is Plan. After nested routes, `/settings` must go to `/settings/plan` for Tenant Admin and `/settings/profile` for Member. Do not “fix” that into always-profile.

**Winston:** Member `/settings/team` already replaces to `/settings`. Keep it — first allowed becomes `/settings/profile`. Billing already stays and denies. Do not invent ProductErrorState. Admin-only workspace areas (plan, brand, organization, notifications, embed) follow Team: message plus replace. Domain that is not visible is not a role deny — it is not in the IA. Use 39.5 not-found, no silent Profile.

**Sally:** Team and Billing join the same Settings nav as first-class links, including 390 chips, so operators can see where they are. Do not redesign invite or Paddle. Right-rail “quick links” that duplicate those labels go away.

**John:** Footer “Settings” is the room door → `/settings` (resolves to first allowed). Account menu stays `/settings/profile` because that is the person. No global dirty guard — leaving a half-typed password today is allowed; don’t invent a modal.

**Winston:** Epic 37 already animates real pathname changes. No Settings-specific motion. Reduced-motion unchanged. Document titles stay `Cohestra` — the app has no title template; don’t add one for polish.

**Resolved (one model):** Pathname-canonical nested App Router routes for every current Settings area; shared workspace layout with Link nav; role-aware `/settings` replace; legacy query compatibility; preserve Team redirect, Billing deny, UpgradePanel, waitlist domain, appearance persistence; one h1 per route; keep existing responsive breakpoints.
