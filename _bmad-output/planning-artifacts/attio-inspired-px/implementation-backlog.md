---
title: Attio-inspired Cohestra — phased implementation backlog
status: ready
baseline_sha: 5ba6ddcbf47a3630792ebc3a8779e0dee4a52691
production: NO-GO
public_beta: NO-GO
---

# Implementation backlog

Each letter is one pull request into `release/uat`. Later letters do not start by rewriting a room the earlier letter already changed.

| PR | Scope | Out of scope |
|----|--------|----------------|
| A | This contract, the component map, the acceptance matrix, and this backlog | Any component code |
| B | Marketing home and shell: centered headline, section order below, existing product preview, pricing anchor, FAQ, closing CTA | App rooms, prices, signup rules |
| C | Shared shell: sidebar density, toolbar, command palette, mobile tab bar | Room behavior |
| D | Dashboard, Activities list, Clients list and record header | Form Studio schema |
| E | Form Studio and Website Studio chrome only | Preview and publish behavior |
| F | Campaigns, Analytics, notifications, billing settings | New reports, new prices |
| G | Platform Admin density and a consistency pass | New admin powers |

## Marketing section order for PR B

1. Navigation with Start free.
2. Centered headline and one-sentence value line.
3. Product showcase of Follow-up, with Core and Pro locks.
4. Use cases already named on the page: events, clubs, workshops, crews, groups.
5. One anchored chapter per real capability: registration, clients, follow-up, Website Studio, Form Studio, analytics. Copy stays inside shipped behavior.
6. Pricing comparison using the current plan file.
7. FAQ, including the existing first-admin email-code explanation.
8. Closing CTA and the current footer.

No testimonial block until a real quote exists in the repository.

## Story loop

Spec in this folder, implement, build, test, independent review, fix blockers and majors, recheck only the changed surface, then open the pull request. Merge only when the autonomous merge policy’s evidence is complete. Do not merge a docs-only contract solely to refresh UAT while browser acceptance on `5ba6ddcb` is still INCOMPLETE.

## Deferred

- Public registration theme, beyond contrast fixes already shipped.
- New CRM objects.
- Replacing Fraunces on marketing display.
- CI and deploy workflow edits, including the Playwright apt fallback.
- Production and public beta.

## Current release fact

`release/uat` is `5ba6ddcbf47a3630792ebc3a8779e0dee4a52691`. Host acceptance and public smoke passed for that SHA. Browser acceptance did not run. Delivery outcome is INCOMPLETE. The owner reruns failed jobs on Actions run `43053552204`. This backlog does not do that rerun.
