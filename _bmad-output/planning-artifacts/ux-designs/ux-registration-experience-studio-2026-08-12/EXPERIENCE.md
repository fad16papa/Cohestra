---
name: Registration Experience Studio
description: IA, flows, and behavioral spec for community-aware registration design
status: final
created: 2026-08-12
updated: 2026-08-12
sources:
  - {planning_artifacts}/prds/prd-registration-experience-studio-2026-08-12/prd.md
  - {planning_artifacts}/ux-designs/ux-cohestra-2026-07-18/EXPERIENCE.md
form_factor: web responsive (mobile-first public; admin desktop + mobile preview)
ui_system: shadcn/ui + Midnight Atelier tokens
---

# EXPERIENCE — Registration Experience Studio

## Foundation

Web responsive. Public registration is mobile-first (QR scan context). Admin Design tab includes explicit **Mobile** / **Desktop** preview toggle. Visual identity: `{planning_artifacts}/ux-designs/ux-registration-experience-studio-2026-08-12/DESIGN.md`.

## Information Architecture

| Surface | Location | Purpose |
|---------|----------|---------|
| Community Brand Kit | `/activities/communities/{id}` | Logo, accent, default hero for program |
| Activity Design | Activity detail → **Design** tab | Preset, inherit toggle, overrides, live preview |
| Activity Branding (legacy) | Merged into Design tab over time; v1 keeps Branding panel until 25.4 |
| Public registration | `/{tenant}/{activity-slug}/register` | Renders resolved preset + brand |

## Voice and Tone

Admin helper copy: short, operator-facing. Example: *"Activities in this community inherit these defaults. Override on each activity's Design tab."*  
Public: no new marketing copy — community name + activity title remain factual.

## Component Patterns

### Community Brand Kit panel

- Sections: Logo (Core+), Accent, Default hero — same upload/URL pattern as `{ActivityBrandingPanel}`.
- Save is explicit; dirty state disables until changed.
- Basic plan: logo upload disabled; tooltip *"Upgrade to Core to add your community logo."*

### Design tab (Story 25.4)

- Preset grid (4 tiles) → updates preview immediately (local state until Save).
- **Inherit community brand** toggle default ON when activity has `communityLabel` matching a kit.
- Override fields visible when inherit OFF or when operator expands "Overrides".
- Preview iframe or inline `PublicRegistrationOpen variant="preview"`.

### Contrast warning

When accent fails WCAG AA against white button text, show inline warning; Save still allowed unless server rejects (worst cases only).

## State Patterns

| State | Behavior |
|-------|----------|
| Empty kit | Community detail shows empty brand section; activities use activity-level branding only |
| Partial kit | Only set fields inherit; null fields fall through |
| Plan locked (Basic + logo) | Upload disabled; API 403 if bypassed |
| Archived activity | Design read-only |

## Interaction Primitives

- Upload → campaign asset → store asset id/path in community or activity record.
- Save → PATCH community or activity → toast confirmation.
- Preview → no network beyond loaded activity + community data.

## Accessibility Floor

- Accent contrast warning meets operator awareness; public submit button must remain readable (server validation).
- Preset layouts preserve label association, focus order, and 44px touch targets.
- Logo alt text: community name.

## Key Flows

### UJ-RES-1 — Francis sets Harbourline Pickleball brand once

Francis opens **Communities → Harbourline Pickleball**, uploads club logo, sets accent `#2d6a4f`, uploads default hero. Saves. Creates new clinic activity, assigns community — hero and accent pre-filled on publish (Story 25.2+). **Climax:** first registrant sees pickleball-branded page without Francis re-uploading the hero.

### UJ-RES-2 — Francis picks Card preset for a waitlist event

Francis opens activity **Design** tab, selects **Compact** preset, toggles inherit ON, previews on mobile, publishes. **Climax:** QR scan shows form-first layout suitable for last-minute signup.

### UJ-RES-3 — Basic operator accent-only polish

Sam on Basic sets accent on community (no logo), picks **Classic** preset on activity. **Climax:** page feels tinted to club color without Core logo entitlement.

## Responsive & Platform

- Public: single column; Card preset adds horizontal padding on `sm+`.
- Admin preview: 375px and 1280px breakpoints for toggle.
