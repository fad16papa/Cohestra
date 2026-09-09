# Party Mode — Website Cinema Studio Proof

**Agents:** John (PM), Sally (UX), Winston (Architect)  
**Decision:** Thin high-fidelity studio shell wrapping existing `SitePageRenderer`

## John (Product)

Smallest truthful change: show builder chrome + section rail + inspector focused on Upcoming activities. Preserves Harbourline as proof of output, adds authorship story. Do not claim live edit/publish in cinema.

## Sally (UX)

3-column studio layout at lg+: sections | canvas | inspector. Toolbar matches production vocabulary. Default inspector on Upcoming activities for operational link. Mobile: horizontal section chips. Canvas remains dominant; chrome compact.

## Winston (Architecture)

Do not mount `WebsiteBuilderPage`. Reuse `SitePageRenderer`, `SECTION_TYPE_LABELS`, seed `PublicSitePayload`. Single-active-room mount unchanged. Inspector driven by seed props — no second product.

**One direction:** `MarketingDemoWebsiteStudioShell` + existing canvas.
