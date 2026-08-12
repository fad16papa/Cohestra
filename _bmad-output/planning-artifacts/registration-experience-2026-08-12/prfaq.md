# PRFAQ: Registration Experience Studio

*Working Backwards — first draft for customer-first validation*

---

## Press release (future-facing)

**Cohestra launches Registration Experience Studio — community-branded sign-up pages in minutes**

**Singapore — [Future date]** — Cohestra, the community events platform for operators who run registrations and follow-up in one place, today announced **Registration Experience Studio**, letting organizers apply their community's look and feel to every activity sign-up page without a web designer.

Until now, operators could customize form *fields* but not the *feeling* of the page — or they reconfigured branding separately for every activity. Registration Experience Studio introduces **Community Brand Kits** (logo, colors, default imagery) and **layout presets** that activities inherit automatically. A pickleball club sets "Ikigai Pickleball" once; each new clinic inherits the brand and publishes with one click.

"Participants decide whether to trust us in the first three seconds," said a beta operator running tennis and wellness programs. "Our registration page now looks like it belongs to our club — not a generic SaaS form."

Registration pages remain mobile-first, accessible (WCAG 2.2 AA), and integrated with Cohestra's client deduplication, capacity limits, and follow-up tools — so better design drives conversion without sacrificing ops depth.

Registration Experience Studio rolls out to Core and Pro workspaces on Cohestra; Basic workspaces receive preset layouts with accent color support.

---

## Customer FAQ

**Q: What problem does this solve?**  
A: Generic registration pages hurt trust and conversion. Operators want sign-up to feel like their community — tennis vs pickleball vs board games — without rebuilding design for every event.

**Q: How is this different from your website builder?**  
A: Website builder publishes your *home* and marketing site. Registration Experience Studio styles the *sign-up moment* — optimized for thumbs, QR scans, and fast completion. Themes sync philosophically but serve different jobs.

**Q: Do I need design skills?**  
A: No. Pick a preset, upload a logo, choose an accent. Community defaults flow to new activities automatically.

**Q: Will my old activities break?**  
A: No. Existing hero/accent settings map to the Classic preset. You opt in to new layouts.

**Q: Is it accessible?**  
A: Yes. Presets are tested for contrast and touch targets. Custom accents get a warning if contrast is too low.

**Q: Does this work on Basic plan?**  
A: Basic gets presets and accent color. Community logo upload and full inherit/override are Core+.

---

## Internal FAQ

**Q: Why not a full page builder on registration?**  
A: Scope, support load, and a11y regression risk. Presets give 80% of perceived customization with 20% of Typeform's complexity.

**Q: Data model?**  
A: Extend `communities` with optional brand fields; add `registration_theme` JSON on `activities` (preset id + overrides). Keep separate from `form_schema`.

**Q: Engineering estimate?**  
A: ~1 epic (4–6 stories): model + API, admin Design tab, public renderer, migration/backfill, preview token, plan gates, docs.

**Q: Biggest risk?**  
A: Divergence from website builder — mitigate with shared asset pipeline and documented "Brand Kit" concept spanning both surfaces.

**Q: Metrics?**  
A: Registration completion rate, time-to-publish activity, operator NPS on "looks professional," support tickets about "branding."

**Q: What do we defer?**  
A: Conditional fields, multi-step wizard, embed widget, custom CSS — track in Epic 25+ backlog.

---

## PRD distillate (for pipeline)

| Field | Value |
|-------|-------|
| **Customer** | Multi-community event operator (Core/Pro) |
| **Problem** | Registration pages feel generic; branding is per-activity busywork |
| **Solution** | Community Brand Kit + Registration Theme presets + live preview |
| **Differentiator** | CRM-native branding tied to community catalog, not standalone form SaaS |
| **Non-goals v1** | Font picker, CSS, embed, payments UI |
| **Launch gate** | WCAG preset matrix green; preview parity; migration for existing activities |
