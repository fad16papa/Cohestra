---
title: Attio-inspired Cohestra — visual and functional acceptance matrix
status: contract
baseline_sha: 5ba6ddcbf47a3630792ebc3a8779e0dee4a52691
---

# Acceptance matrix

A story is accepted only when every row it touches is true on the same commit. Missing browser evidence is INCOMPLETE, not PASS.

| Surface | 1440 | 768 | 390 | Light | Dark | Reduced motion | Plans |
|---------|------|-----|-----|-------|------|----------------|-------|
| Marketing home | Centered headline, product frame, Start free in the first 900px, no horizontal scroll | Same | CTA visible without a second scroll past the hero | Required | Not required (light-locked) | Lift animation is `none` | Basic, Core, and Pro named correctly |
| Pricing | Prices match `pricing-plans.ts` | Stacks cleanly | No clipped plan names | Required | Not required | No essential motion | Basic free, Core and Pro amounts unchanged |
| Signup / verify | Terms, password, CAPTCHA hook still present | Usable | 44px controls | Required | If the page already supports it | No blocking motion | Trial copy unchanged |
| Workspace shell | Sidebar labels, sticky toolbar, command search | Icon rail or sheet, no lost rooms | Tab bar reaches the same rooms | Required | Required | Route transition off | Website locked below Core, Campaigns locked below Pro |
| Clients | Table or list opens a record | No overflow | Record reachable | Required | Required | Skeletons static | Same fields |
| Activities | List opens an activity | Usable | Registration entry reachable | Required | Required | Off | Form recipe limits unchanged |
| Follow-up | Due now, At risk, Opportunity, Healthy | Filters usable | Row opens the client | Required | Required | Off | Categories unchanged |
| Form Studio | Editor and preview both visible on desktop | Preview reachable | Editor usable | Required | Required | Off | Slot limits 1 / 5 / 25 |
| Website Studio | Editor and preview | Preview reachable | No silent publish | Required | Required | Off | Core or higher |
| Campaigns | List and composer chrome | Usable | Locked state explains Pro | Required | Required | Off | Pro or Enterprise |
| Analytics | Existing reports render | No new empty charts | Readable | Required | Required | Off | Depth still follows plan |
| Billing | Plan and checkout return still resolve | Usable | No new charge | Required | Required | Off | No price edits |
| Platform Admin | Existing ops pages | Usable | Restricted nav only | Required | Required | Off | Not a tenant plan |

## Functional gates that travel with every story

- Unit tests for the files the story edits.
- No change to auth, tenant isolation, billing webhooks, or entitlement helpers unless the story is explicitly that fix.
- Keyboard focus visible on the controls the story restyles.
- Plan locks still rendered, not removed to simplify a screenshot.

## Release gate

This initiative does not merge to `release/uat` until exact-SHA CI is green and the visual rows above are evidenced for the stories in that pull request. The open UAT browser failure on deploy run `43053552204` is an archive DNS failure in `npx playwright install --with-deps`, not a product defect. This initiative does not edit deployment workflows to clear it.
