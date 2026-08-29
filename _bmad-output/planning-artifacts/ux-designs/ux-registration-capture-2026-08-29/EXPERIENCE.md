---
name: Registration Capture
description: IA and behavior for slash-add Form tab, Capture Field types, closed/piping/notify, templates, Recipes, embed, Contact
status: final
created: 2026-08-29
updated: 2026-08-29
sources:
  - {planning_artifacts}/prds/prd-registration-capture-2026-08-29/prd.md
  - {planning_artifacts}/epics-registration-capture.md
  - {planning_artifacts}/ux-designs/ux-lead-generation-crm-2026-06-14/EXPERIENCE.md
  - {planning_artifacts}/ux-designs/ux-cohestra-2026-07-18/EXPERIENCE.md
  - {planning_artifacts}/ux-designs/ux-registration-experience-studio-2026-08-12/EXPERIENCE.md
form_factor: web responsive (mobile-first public; admin desktop + Studio mobile preview)
ui_system: shadcn/ui + Midnight Atelier tokens
---

# EXPERIENCE — Registration Capture

## Foundation

Web. Public registration remains mobile-first (QR). Admin Form tab is desktop-primary; preview keeps Studio Mobile / Desktop toggle. Visual identity: `{planning_artifacts}/ux-designs/ux-registration-capture-2026-08-29/DESIGN.md` (delta) plus Studio DESIGN.md (page look). **No Capture-specific architecture.** Inherit `/register/{slug}` IA (UX-DR20).

## Information Architecture

| Surface | Location | Purpose |
|---|---|---|
| Form tab | Activity detail → Form | List editor + slash palette + Field types + Closed message + Close-at + piping copy + template picker |
| Design tab | Activity detail → Design | Unchanged Studio look. Theme never written into `form_schema`. |
| Public register | `/register/{slug}` | Registration / confirmation / unavailable. Hidden Fields add no chrome. |
| Embed | `/embed/register/{slug}` | Chrome-light Form. Admin not embeddable. |
| Share kit | Activity → QR & Link | Copy public URL + iframe snippet (after allow-list). |
| Allowed embed hosts | Settings (tenant) | `allowedEmbedOrigins` list. Empty = no framing. |
| Notifications | Settings → Notifications | “Email me on new registrations” (default on). |
| Template picker | Form tab (existing) | Launch templates + save/apply tenant templates + slot meter. |
| Contact section | Website builder (Core/Pro) | Fixed Field set. Not a Form tab. |
| Registration detail / Client history | Admin | Shows Hidden Answers. |

No new public tabs, accounts, or participant portal.

## Voice and Tone

| Do | Don't |
|---|---|
| "See you Saturday, Maya." (piping) | "Form submitted successfully." |
| "Waitlist opens Monday on WhatsApp" + reason chip Full | Platform "Full" only when Closed message is empty |
| "Hidden · filled from link" (admin) | Attribution UI on the Participant Form |
| "Core saves up to 5 form recipes for every new session." | "You have exceeded template quota." |
| "Split into steps" | Auto-wizard because the Form has 10 Fields |

## Component Patterns

Behavioral. Visuals in DESIGN.md.

| Component | Use | Behavioral rules |
|---|---|---|
| **SlashPalette** | Form tab | `/` or **+** opens dialog. Groups: Always toolbox; Core+ Scale / Emergency (`plan_locked` on Basic). Arrows + Enter; Esc closes. Inserts a Field in the list. Type `<select>` stays as fallback. No canvas, no typed-prose→Field. NPS/matrix/payment absent. |
| **FormFieldEditor** | Form tab | Existing list (grip / arrows). Capture types appear in the type control. Reorder unchanged (UX-DR24). |
| **HiddenChip** | Admin preview | Shown for `hidden` Fields. Participant renderer omits input and chrome (UX-DR-RC-2). |
| **RegistrationForm** | Public + preview | Renders new types. `choice` / `yes_no` large taps. `info` display-only. Submit disabled until required + consent valid. Single page unless Pro steps toggle on (UX-DR9). |
| **ReasonChip** | Unavailable | Full / Closed / Paused / Ended matching server precedence. Always with Closed message when set. |
| **ClosedMessage** | Unavailable | Operator markdown-lite, max 2000, XSS-safe. Empty → existing platform copy. |
| **CloseAtPicker** | Form tab | Displays Activity timezone; persists UTC. Clearable. Past allowed. |
| **PipingCheatsheet** | Success-copy editor | Tokens `{{full_name}}` `{{email}}` `{{phone}}` `{{field:<id>}}`. Hidden ids not listed. Live preview uses a sample name. |
| **NotifyToggle** | Settings | Default on. No per-Activity mute. |
| **TemplatePicker** | Form tab | Launch three remain. Save current draft; apply to unpublished after confirm. Slot meter 1/5/25. Over cap → UpgradePanel. |
| **RecipePicker** | Form tab (Core+) | Presets + equals/notEquals. Not a graph. Basic `plan_locked`. |
| **StepToggle** | Form tab (Pro) | Off = no public stepper. On = auto-bucket; move Fields in the list; preview shows buckets. |
| **EmbedSnippet** | Share kit | Iframe first. Disabled helper if allow-list empty. |
| **ContactSection** | Website builder | Fixed name/email/phone/message/consent. Operator edits heading/intro/button/success only. |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| Empty Form | Form tab | Visible **+**; slash still works. |
| Palette open | Form tab | Focus trap; Esc closes; Reduce Motion honors dialog. |
| Hidden on public | `/register/{slug}` | No Field, no chip, no query echo. |
| Success + piping | Confirmation | `role="status"`; missing token → one rule (empty or “there”). |
| Unavailable + copy | Public | Reason chip + Closed message. |
| After Close-at | Public | Unavailable; submit rejected; chip Closed. Capacity full still wins. |
| Template at cap | Picker | Save disabled; upgrade copy. |
| Basic + scale | Palette | Row visible, locked, upgrade. |
| Steps off | Public | One page (default). |
| Embed allow-list empty | Share kit | Snippet not usefully copyable. |
| Contact consent off | Website | Client created; marketing opt-in not set. |

Theme change mid-form preserves values and scroll (UX-DR27). Light and dark QA on every new public state (UX-DR-RC-10).

## Interaction Primitives

- `/` or **+** → SlashPalette.
- Palette: ↑↓ Enter Esc.
- Reorder: grip or arrows only.
- Steps (Pro): Next validates current step; Back; one submit on last step.
- Embed: parent query → Hidden; iframe `postMessage` height.
- Banned: drag-and-drop Form canvas; column layout; “typed prose becomes a Field.”

## Accessibility Floor

WCAG 2.2 AA on registration + Form tab + palette (NFR-RC-3). Visible labels + `aria-describedby` errors. Palette is a dialog (focus trap, Esc). Confirmation `role="status"`. Public CTAs and `choice` / `yes_no` ≥ 44×44px. Closed message not image-only. Reason chip is text + color. Reduce Motion: no palette flourish.

## Key Flows

### UJ-RC-1 — Francis authors Saturday tennis without Tally

Francis (Core) opens Form tab, types `/`, adds Email, Phone, Long text, Date, Hidden `ref`, writes Closed message, publishes (Publish Gate still requires required phone or email). **Climax:** he copies `?ref=wa` onto Instagram. Edge: type dropdown still works if the palette misses.

### UJ-RC-2 — Maya registers from Instagram

Maya (mobile, unauthenticated) opens the link with `?ref=wa`, fills name/phone/notes/date, submits. **Climax:** “See you Saturday, Maya.” Confirmation email uses the same token and Studio hero. Francis gets Operator notify. Admin shows `ref = wa`. Missing `?ref=` still submits.

### UJ-RC-3 — Session full, Francis’s copy shows

Maya opens `/register/saturday-tennis` after capacity (or Close-at). **Climax:** “Waitlist opens Monday on WhatsApp” + Full/Closed chip. Submit rejected. Capacity wins over Close-at.

### UJ-RC-4 — Guest name only when plus-one (Phase 2)

Francis adds “Bringing a guest?” + guest-name Recipe. Maya selects No → guest hidden, not required. Yes → required. **Climax:** Yes + empty guest fails; spoofed guest name dropped.

### UJ-RC-5 — Form lives where the audience is (Phase 3)

Francis copies Share kit iframe (allow-list set) or adds Contact. **Climax:** embed submit → Registration + Client; Contact → Client + website inquiry, no Activity.

## Responsive & Platform

Public: one column; full width `<768px`; max 480px at `768px+`. `choice` / `yes_no` stay large on a phone thumb. Admin palette usable at 1280px; Studio 375px preview still shows new Field types. Embed is chrome-light; no admin sidebar.

## Inspiration & Anti-patterns

**Steal:** Tally `/` speed and Hidden Fields.  
**Do not steal:** Tally document canvas, NPS/matrix, Typeform one-question default, custom CSS.
