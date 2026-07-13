---
name: Activity Lead — Website Builder
status: final
created: 2026-07-06
updated: 2026-07-06
sources:
  - {planning_artifacts}/prds/prd-website-builder-2026-07-06/prd.md
  - {planning_artifacts}/ux-designs/ux-cohestra-2026-06-14/EXPERIENCE.md
design: "{planning_artifacts}/ux-designs/ux-website-builder-2026-07-06/DESIGN.md"
---

# Activity Lead — Website Builder (EXPERIENCE.md)

> Behavioral contract for Epic 9. Visual specs in paired `DESIGN.md`. Parent CRM UX in `ux-cohestra-2026-06-14/EXPERIENCE.md`.

## Foundation

Responsive web. Next.js admin + public `/`. shadcn/ui + existing Activity Lead patterns. Single operator edits marketing homepage and runs CRM in one session.

## Information Architecture

| Surface | Path | Purpose |
|---------|------|---------|
| Public homepage | `/` | Published Site Page — anonymous |
| Homepage preview | `/` + `?preview=` token | Draft Site Page — banner visible |
| Website builder | `/dashboard/website` | Edit draft, preview, publish |
| Operator sign-in | `/login` | Shows client logo/name from published Site branding |
| Activity overview | `/activities/{id}` | “Feature on your public site” toggle |
| Public registration | `/register/{slug}` | Unchanged — per-activity branding |

**Admin nav:** New top-level item **Website** (Globe icon), placed after Dashboard, before Activities.

Wireframe reference: `wireframes/website-builder-layout.md`

## Voice and Tone

| Do | Don't |
|----|-------|
| “Save draft” | “Save” |
| “Publish homepage” | “Go live” (too vague) |
| “Feature on your public site” | “Show on homepage” (internal jargon) |
| “Your site is live” | “Publish successful” |

## Component Patterns

| Pattern | Rules |
|---------|-------|
| **Save draft** | Persists all section + branding fields; toast “Draft saved”; updates “Last saved …” |
| **Publish** | AlertDialog confirmation; disabled when draft === published; runs gate validation |
| **Preview** | Opens new tab with signed preview URL; never replaces builder tab |
| **Section editor** | Expand one section at a time; reorder via drag handle |
| **Hero CTA target** | Select: Scroll to events / Operator sign-in / Specific activity (published only) |
| **Device toggle** | Phone (375px frame) / Desktop (100% preview width) |

## State Patterns

| State | Treatment |
|-------|-----------|
| **Clean draft** | Status pill “Live” when draft matches published |
| **Dirty draft** | Pill “Unsaved changes”; Save draft enabled |
| **Draft saved, not live** | Pill “Draft saved”; Publish enabled |
| **Publish blocked** | Inline list of blockers; warn-only items in dialog with “Publish anyway” |
| **Empty upcoming** | Preview shows empty-state message from section config |
| **Loading site config** | Skeleton in preview pane; editor disabled until load completes |
| **API error on save** | Toast error; draft unchanged on server |

## Interaction Primitives

- Explicit **Save draft** — no auto-save in v1.
- **Unsaved guard** on route change (same pattern as ActivityBrandingPanel dirty state).
- **Publish** requires confirmation showing domain from `PUBLIC_BASE_URL`.
- Section **enabled** toggle hides on public render without deleting data.

## Accessibility Floor

- WCAG 2.2 AA — inherit Activity Lead floor.
- Preview device toggle is keyboard reachable.
- Publish dialog traps focus; Escape cancels.
- Drag reorder has keyboard alternative (move up/down buttons) in v1.

## Key Flows

### UJ-WB-1. Alex publishes homepage refresh

- **Persona:** Alex, The Social Collective operator.
- **Entry:** Authenticated; sidebar → Website.
- **Path:** Edit hero headline → Save draft → toggle Desktop preview → Publish → confirm → success with copy link.
- **Climax:** Success state shows live URL; opening `/` in incognito shows new copy.
- **Edge:** Navigate away with dirty fields → confirm dialog.

### UJ-WB-2. Alex hides workshop from storefront

- **Entry:** Activity Overview for published workshop.
- **Path:** Uncheck “Feature on your public site” → save activity.
- **Climax:** Homepage upcoming block no longer lists workshop; direct `/register/{slug}` still works.

## Responsive & Platform

| Breakpoint | Builder layout |
|------------|----------------|
| `≥ lg` | Side-by-side editor + preview |
| `< lg` | Stacked; preview phone width |

## Anti-patterns

- Wix-style drag-anywhere canvas.
- Instant publish on every field blur.
- Separate marketing app or role.
- Per-section HTML embeds.
