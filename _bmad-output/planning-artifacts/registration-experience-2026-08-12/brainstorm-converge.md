# Brainstorm → Converge: Registration & activity form experience

**Topic:** Improve whole activity + registration form; enable operator-designed look/feel per activity & community  
**Mode:** Ideate for me (autonomous)  
**Date:** 2026-08-12

## Divergent ideas (sampled across lenses)

### A — Visual design & theming
1. Registration **theme presets** (Minimal, Community Warm, Sport Energy, Night Event)
2. **Community brand kit** — logo + accent + default hero inherited by all activities in that community
3. Activity overrides community kit (hero, accent, optional background texture)
4. **Cover layout variants** — hero full-bleed vs split hero + form card vs centered card on tinted canvas
5. Custom **form card** radius, shadow, border (within token guardrails)
6. **Typography scale** pick (Compact / Comfortable / Accessible+) — still Geist, different sizes
7. Optional **secondary accent** for badges (community pill, date chip)
8. **Dark-first** preset for evening events (pickleball under lights)
9. Background **gradient or pattern** from community palette (subtle, WCAG-safe)
10. **Photo gallery strip** under hero (Pro) — second/third activity images

### B — Form builder & fields
11. **Conditional fields** — show "clinic level" only if select = Advanced
12. **Section headers** + helper text blocks between field groups
13. **Multi-step wizard** (Contact → Details → Consent) with progress bar
14. **Duplicate field sets** — "+1 guest" repeatable group
15. **File upload** — waiver PDF, medical form (Pro, virus scan)
16. **Address / map pin** field type
17. **Age / DOB** with min age gate
18. **Language toggle** on public form (EN / 中文) — labels from schema i18n
19. **Save progress** — email magic link to resume (logged-out)
20. **Template marketplace** — community operators share form templates

### C — Community & activity intelligence
21. Auto-suggest theme from **community catalog** (Tennis → green court palette)
22. **Smart defaults** when creating activity: inherit community form template
23. Community **registration landing** — list all upcoming activities for "Harbourline Pickleball"
24. **QR kit** includes community logo frame
25. Cross-activity **series branding** (8-week clinic shares visual identity)

### D — Conversion & trust
26. **Social proof** block — "127 registered" (when not privacy-sensitive)
27. **Spots remaining** progress bar (ties to max registrants)
28. **Trust row** — powered by Cohestra, privacy link, tenant legal name
29. **Organizer mini-card** — photo, name, "Questions? WhatsApp"
30. reCAPTCHA **invisible placement** options (footer vs pre-submit)
31. **Exit intent** nudge on mobile (careful — don't annoy)

### E — Post-registration & ops
32. Branded **confirmation page** variants (calendar add, share to WhatsApp)
33. **Add to Google/Apple calendar** .ics generation
34. **Refer-a-friend** field pre-fill from URL `?ref=`
35. Registration **webhook** for external automations
36. **PDF ticket** with QR check-in (future paid events)

### F — Integration with website builder
37. "Open registration" **section block** on published site — same theme tokens
38. Single **Brand DNA** object synced: site + registration + email
39. Publish registration theme **preview URL** before activity publish
40. Embed snippet for WordPress / Linktree

## Converge — recommended tiers

### P0 — High impact, fits Cohestra wedge (next epic candidate)
| # | Idea | Why |
|---|------|-----|
| **R1** | **Registration Theme v1** — presets + layout variant + community inherit | Directly answers user request; bounded scope |
| **R2** | **Community brand kit** (logo, accent, default hero, optional form template) | Operators think in communities, not just activities |
| **R3** | **Live registration preview** (mobile/desktop) in admin | Closes "design" loop without full builder |
| **R4** | **Form sections + intro copy block** | Better forms without new field types |
| **R5** | **Spots remaining + cap UX** on public page | Already have max registrants — surface it beautifully |

### P1 — Strong follow-ups
- Multi-step wizard for long forms
- Conditional fields
- Calendar add on success screen
- Theme sync hint from website builder accent
- Template library expansion (5–8 verticals)

### P2 — Defer until PMF signal
- Full font picker / custom CSS
- File upload fields
- Embed widget
- Paid ticket styling
- Template marketplace

### Kill / park
- Unlimited visual freedom (Webflow clone) — conflicts with supportability & a11y
- Per-field color styling — noise, accessibility debt
