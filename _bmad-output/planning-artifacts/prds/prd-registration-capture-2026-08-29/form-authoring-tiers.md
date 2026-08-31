# Form authoring + saved templates — Basic / Core / Pro

**Decision (Admin, 2026-08-29):** Keep Cohestra’s existing plan **limits** (seats, communities, published activities, registrations/month). Do **not** adopt Tally fair-use uncapping. Compete on **how good it feels to author and reuse a Form**, not on 50k free submits.

**Limits unchanged** (`TenantPlanLimits`):

| | Seats | Communities | Published activities | Registrations / month |
|---|---|---|---|---|
| Basic | 1 | 1 | 4 | 250 |
| Core | 3 | 3 | 12 | 500 |
| Pro | 10 | 10 | 50 | 5,000 |

---

## What “design your own Form” means here

Operators already edit every Field. The leak is: three **hardcoded** launch templates (Tennis, Pickleball, Board Game), no “save this as mine,” and the Form tab still feels like IT.

**In (freedom):**
- Compose any Field (slash-add when Capture MVP ships). Same `form_schema` on every plan that has the Form tab.
- Write intro, Closed message, piping (Capture MVP).
- **Save** that composition as a **tenant Form template** and apply it to the next Activity.
- Look of the **page** stays the Design tab (Community Brand Kit + layout presets) — already plan-gated in Studio.

**Out (still not Tally):**
- Drag-and-drop canvas (UX-DR32 / UX-DR24).
- Custom CSS / custom fonts (NFR-12).
- A second form product detached from Activities.
- Changing registration caps.

A **Saved Form template** is a named snapshot of `form_schema` (fields + meta: intro, Closed message, Close-at). It does **not** replace `registration_theme` — page look stays on the Activity / Community kit. Pro may **pin** a Design preset name onto a template as a hint when applying (optional bundle).

Apply still **replaces** the draft Form (same as launch templates today) and stays **draft-only** (unpublished Activities), matching `form-template-picker.tsx`.

---

## Tier matrix

| Capability | Basic | Core | Pro |
|---|---|---|---|
| Platform launch templates (3) | Yes | Yes | Yes |
| Edit any Field / slash-add / Capture MVP types | Yes | Yes | Yes |
| Design tab | Classic + accent (FR-RES-5) | + Community logo / inherit | All presets (incl. Immersive) |
| **Save as my template** | **1** slot (“My default”) | **5** slots | **25** slots |
| Rename / replace / delete own templates | Yes | Yes | Yes |
| Apply own template to another Activity | Yes | Yes | Yes |
| Community default template | — | Yes (one per community) | Yes |
| Pin Design preset onto a template | — | — | Yes |
| Duplicate template | — | — | Yes |
| Recipes + optional steps (Capture Phase 2) | — | Recipes | Recipes + steps |
| Form toolbox (see `form-component-toolbox.md`) | Always group | + Scale, Emergency | + File, Signature (when D) |

Upgrade copy when Basic hits 1 saved template: “Core saves up to 5 form recipes for every new session.”

---

## Why this is more appealing than Tally *for our ICP*

Tally wins blank-page speed. We will not uncap 250. We win **the second Saturday**: Francis saves “Saturday tennis + WhatsApp ref” once, next month he applies **My default** in two taps, Design tab already looks like the club, submit still writes a Client.

The Participant never sees templates. They see a clearer Form (intro, closed copy, piping) and a branded page.

---

## Done when (templates)

1. Operator on Basic saves current Form as “My default”; creates a new Activity; applies it; Publish Gate still requires required phone or email.
2. Core saves a fifth template; sixth shows plan-locked upgrade.
3. Pro pins Compact preset on a template; applying it offers to set that preset on the Activity (Operator confirms).
4. Launch templates remain; applying one still replaces fields after confirm.
5. Server enforces slot counts (`plan_locked`). No template rows leak across tenants.
