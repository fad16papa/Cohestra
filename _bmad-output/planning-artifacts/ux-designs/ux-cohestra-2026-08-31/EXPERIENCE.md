---
name: Landing Product Cinema
status: final
created: 2026-08-31
updated: 2026-09-01
sources:
  - {planning_artifacts}/ux-designs/ux-cohestra-2026-07-18/DESIGN.md
  - craft_reference: https://www.apple.com/sg/iphone-17-pro/ (scroll grammar only — pin, scrub, chapter-seek; do not copy hardware frame-sequence / product orbit)
  - imports/current-product-carousel-website-slide.png
scope: Marketing home /#crm product cinema only. Parent UJ-1…UJ-5 remain on ux-cohestra-2026-07-18 EXPERIENCE.
design: ./DESIGN.md
implementation: web/components/marketing/marketing-product-carousel.tsx
---

# Landing Product Cinema — Experience Spine

> Behavioral contract for the marketing `#crm` section ("Inside the workspace"). Visual identity → `DESIGN.md` (**Midnight Atelier** inherited — cinema is interaction, not rebrand). Spines win on conflict with mocks, the Apple craft reference, and the live carousel.

→ Visual tokens: `./DESIGN.md`  
→ Current Website slide (backup reference): `imports/current-product-carousel-website-slide.png`  
→ Key screens: `mockups/desktop-cinema-clients.html` · `mockups/desktop-cinema-website.html` · `mockups/mobile-carousel.html` — **spines win on conflict**  
→ File today: `web/components/marketing/marketing-product-carousel.tsx` — **backup this UI/UX before change**

## Foundation

**Form factor:** Responsive marketing web on apex `cohestra.app` (and equivalent marketing host). This spine covers **one section** of the marketing home — not tenant admin, not public stub.

**UI system:** shadcn/ui + Tailwind + existing marketing shell. Brand/craft = Midnight Atelier in `DESIGN.md` / parent [ux-cohestra-2026-07-18](../ux-cohestra-2026-07-18/DESIGN.md). Cinema adds no component library and no new palette.

**Model (locked)**

| Lane | Decision |
|------|----------|
| Desktop | **Designed Chapter cinema** — stable stage; scroll progress seeks six chapters |
| Not | True Apple frame/video scrub |
| Not | Full Beat×6 micro-timelines |
| Climax | Optional **one** micro-beat on Website / Pro only — subtle scale/emphasis, not bullet stagger |
| Mobile | **(a)** current click-tabs carousel — **no long pin on mobile** |
| Copy | Every current bullet stays visible on every chapter — **no copy cut** |
| Seek / escape | Chapter pills jump to chapter; visitor can skip straight to Website |
| Seek chrome (desktop) | **LOCKED** — ChapterPills stay **sticky under the marketing header for the entire pin**; focus does not change progress — only Activate (click / Enter / Space) seeks; Website pill is the skip control. No `scrollIntoView` that fights pin progress. |
| Stakes | **Consumer conversion** — high polish + accessibility floor |
| Product view | Existing React mocks (Clients CRM, Follow-up, Dashboard, Campaigns, Reports, Website builder) |
| Backup | Current `MarketingProductCarousel` UI/UX = mobile + `prefers-reduced-motion` + explicit rollback path |

### Post Reviewer Gate locks (Admin: decide all remaining blockers)

| ID | Lock |
|----|------|
| C1 | Sticky ChapterPills under header for whole pin; Focus ≠ seek; Activate seeks; Website = skip |
| C2 | Pin `top` = `{spacing.header-offset}` (6rem); pin `z-index` below header (`z-20` pills / stage, header `z-30`); focused pill, header link, chapter H3 never fully covered (2.4.11) |
| C3 | **Native scroll only** — map `scrollY` → progress; **forbid** `preventDefault` on wheel/touch/PageDown/Space except Activate on a focused seek control |
| NRV | Both breakpoints: **tablist / tab / tabpanel** APG — roving tabindex, Left/Right/Home/End, one selected tab in tab order, **stable panel id**; chevrons = buttons not tabs |
| LiveRegion | Announce **immediately on explicit seek**; scrub updates `aria-selected` continuously; live string **debounced ~300ms / scrollend**; polite + atomic; never assertive |
| Contrast | Use `{colors.stone-cinema}` / `{colors.gold-cinema}` on paper-warm (≥4.5:1); idle glyphs ≥3:1 |
| Targets | CarouselChrome dots: visible 6px, **hit ≥24×24** |
| Breakpoint / PRM | Remount preserves chapter **id**; sync `scrollTop`; restore focus to active pill if chrome unmounted; `/#crm` **always** Clients @ progress 0; seek smooth-scroll **cancels** on wheel/touch |
| PRM | Kill hover-lift / crossfade / climax; `matchMedia` change → CarouselChrome + **tear pin spacer**; restore chapter id |
| Pin math | **70vh × 6** equal ranges; hysteresis **3%** of a chapter range (`{spacing.cinema-pin-hysteresis}`) |
| Climax | **SHIP** — scrub-entry Reports→Website only; **not** on pill skip; scale 1.02 → settle 1; skip under PRM |
| Desktop chrome | Pills-only seek (no dots/chevrons on motion-safe `lg+`) |
| Mocks | `aria-hidden` **and** `inert` (no tab stops inside frame) |
| Sources | Parent DESIGN inherit only; this workspace = `/#crm` cinema — not full parent EXPERIENCE |

**Feeling reference:** [apple.com/sg/iphone-17-pro](https://www.apple.com/sg/iphone-17-pro/) — borrow pin / scrub / chapter-seek **grammar** only. Do not copy hardware frame-sequence or product orbit.

**Protagonist:** Priya, club admin evaluating Cohestra on a laptop, then checking the same page on her phone. **[ASSUMPTION: named journey persona; Priya is the marketing-home prospect from the parent experience spine.]**

## Information Architecture

Cinema does not add routes. It re-presents six existing product surfaces inside marketing home.

### Surface

| Surface | Route | Purpose |
|---------|-------|---------|
| Marketing home — product cinema | `/#crm` | Convert by showing the real workspace at full size, chapter by chapter → `mockups/desktop-cinema-clients.html` · `mockups/desktop-cinema-website.html` · `mockups/mobile-carousel.html` |

Header nav **Clients** already points at `/#crm` (`marketing-shell.tsx`). That contract stays.

### Section (verbatim)

| Field | Copy |
|-------|------|
| `id` | `crm` |
| Eyebrow | Inside the workspace |
| Title | One product, one platform, covers all your need |
| Lead | Browse each surface at full size — the same views your team uses every week. |

### Chapters (verbatim)

Order is the seek order (1 → 6). `id` values match today's `ProductSlideId`. Points are locked — all four remain visible on the chapter.

#### 1. Clients — `clients`

| Field | Copy |
|-------|------|
| navLabel | Clients |
| eyebrow | Client CRM |
| title | A client list your team actually uses |
| lead | Every registration builds one profile. Search the list, open a client, see their history, and message them without leaving Cohestra. |
| visual | `MarketingCrmShowcase` (Clients CRM mock) |

Points (4):

1. Search and filter by status, nationality, or recent signup
2. Lead status badges so the team knows who still needs a reply
3. Full profile with contact details, registration history, and timeline
4. WhatsApp and Viber open from the profile with messages saved automatically

#### 2. Follow-up — `outreach`

| Field | Copy |
|-------|------|
| navLabel | Follow-up |
| eyebrow | Client outreach |
| title | Message clients on WhatsApp and Viber |
| lead | Open the channel your community already uses. Cohestra logs what you sent so the team stays aligned and nobody gets double messaged. |
| visual | `OutreachShowcaseMock` |

Points (4):

1. WhatsApp and Viber open from any client profile
2. Each message saved on the client timeline automatically
3. Status flags show who still needs a reply
4. Dashboard follow-up queue surfaces the next person to contact

#### 3. Dashboard — `dashboard`

| Field | Copy |
|-------|------|
| navLabel | Dashboard |
| eyebrow | Operations dashboard |
| title | See what needs attention before your next session |
| lead | Follow-up coverage, weekly registrations, and active activities in one calm view — no spreadsheet refresh required. |
| visual | `DashboardShowcaseMock` |

Points (4):

1. Follow-up queue shows who still needs a message
2. Registration counts compared to last week
3. Jump to clients, activities, or reports in one click
4. Updates as your team works through the list

#### 4. Campaigns — `campaigns`

| Field | Copy |
|-------|------|
| navLabel | Campaigns |
| eyebrow | Email campaigns |
| title | Reach your community with segmented email |
| lead | Compose once, segment by activity or lead status, and track delivery without exporting to a separate email tool. |
| visual | `CampaignsShowcaseMock` |

Points (4):

1. Segment recipients from your client list
2. Preview on desktop and mobile before you send
3. Delivery and failure counts on every campaign
4. Campaign history saved on client profiles

#### 5. Reports — `reports`

| Field | Copy |
|-------|------|
| navLabel | Reports |
| eyebrow | Reports and exports |
| title | Filter performance and export when you need a spreadsheet |
| lead | Weekly and monthly views with conjunctive filters — then export CSV for board meetings or sponsor updates. |
| visual | `ReportsShowcaseMock` |

Points (4):

1. Filter by date range, activity, community, or lead status
2. Registration counts and unique client totals
3. Export CSV on Basic; deeper filters on Core and Pro
4. Saved views for recurring check-ins

#### 6. Website — `website` (climax chapter)

| Field | Copy |
|-------|------|
| navLabel | Website |
| eyebrow | Website builder · Pro |
| title | Publish a public site tied to your activities |
| lead | Pro unlocks the full website builder — draft, preview, and publish a homepage at your org subdomain with activities that stay in sync. |
| visual | `WebsiteBuilderShowcaseMock` |

Points (4):

1. Studio sections: carousel, testimonials, FAQ, and more
2. Upcoming activities update from your workspace automatically
3. Draft, preview on desktop and mobile, then publish in one click
4. Share kit with QR, link, and WhatsApp text ready to paste

**Surface closure:** The prospect's need ("what does the product actually look like?") is delivered by these six chapters on `/#crm`. Priya's journey (Key Flows) lands here and can skip to Website. No seventh chapter.

## Voice and Tone

Microcopy only. Aesthetic in `DESIGN.md`. Section and chapter strings above are **locked verbatim** — cinema must not rewrite them for "scroll voice."

| Do | Don't |
|----|-------|
| Keep every bullet on-screen for the whole chapter | Cut, truncate, or "cinema-caption" bullets |
| Announce chapter changes to AT: "Showing {navLabel}: {title}" (existing live region) | Silent visual-only chapter changes |
| Pills labeled with `navLabel` (Clients, Follow-up, …) | Icon-only chapter nav |
| Climax is a quieter frame emphasis, not new headline copy | "And now the Pro website — wait for it" interstitial |
| Parent marketing voice: operator-plain, no emoji | "Scroll to explore the magic" |

## Component Patterns

Behavioral. Visuals in `DESIGN.md` Components (`SectionHeader`, `ChapterPills`, `CinemaStage`, `ChapterCopy`, `ProductFrame`, `ClimaxMicroBeat`, `CarouselChrome`).

| Component | Use | Behavioral rules |
|-----------|-----|------------------|
| **SectionHeader** | Top of `#crm` | Static. Not scrubbed. Hash `#crm` targets the section, not a mid-pin chapter. |
| **ChapterPills** | Seek + current chapter | Six controls, `navLabel` text. **Desktop (LOCKED):** pills are **sticky under the marketing header for the whole pin** so seek/escape never leaves the viewport. **Focus** moves highlight only — does **not** rewrite pin progress. **Activate** (click / Enter / Space) scrolls the pin track to that chapter's progress range (smooth unless reduced-motion); use `preventScroll` on programmatic focus where needed so focus never fights scrub. Activating **Website** is the skip/escape control — do not gate on watching 1–5. **Mobile:** sets carousel `index` (today's `goTo`). |
| **CinemaStage** | Desktop `lg+` only | While the section is pinned, the stage's viewport box stays geometrically stable. Scroll Y maps to chapter index. Leaving the track (scroll past last chapter, or reverse past first) **unpins** and returns normal page scroll — escape. |
| **ChapterCopy** | Left column (`lg+`); above visual on mobile | On chapter change, swap eyebrow / title / lead / **all four points** together. No per-bullet reveal. Crossfade via `{components.chapter-crossfade}` when motion is allowed. |
| **ProductFrame** | Right column (`lg+`); below copy on mobile | Hosts the chapter's React mock. Frame box does not move with scrub. Inner mock crossfades with copy. Mocks: `aria-hidden` **and** `inert` — zero tab stops. |
| **ClimaxMicroBeat** | Website, motion-safe desktop | **LOCKED SHIP:** one-shot `{components.climax-micro-beat}` only on **scrub-entry** Reports→Website. **Not** on pill skip. Settle to scale 1. Reset when leaving Website. Never staggers bullets. Skip under PRM. |
| **CarouselChrome** | `< lg`, reduced-motion, rollback | Tablist + dots + prev/next chevrons. Dots/chevrons call same Activate as pills. Dot hit ≥24×24. **LOCKED: not shown on motion-safe `lg+` cinema** (pills-only). |
| **LiveRegion** | All modes | `sr-only` polite atomic: `Showing {navLabel}: {title}`. **LOCKED:** announce immediately on **explicit seek**; scrub → debounce ~300ms/scrollend; suppress duplicate strings. |

## State Patterns

| State | Surface | Treatment |
|-------|---------|-----------|
| Cold load / first paint | `#crm` | Chapter **Clients** (index 0). No autoplay. |
| Hash `#crm` | Desktop cinema | Scroll section into view with existing `scroll-mt-24` (header offset). Pin at **progress 0** — Clients on stage. Do not land mid-scrub. |
| Hash `#crm` | Mobile / reduced-motion | Scroll section into view (`scroll-mt-24`). Carousel index 0 (Clients). No pin. |
| In-pin, chapter *n* | Desktop | Pills show *n* selected (`aria-selected`); copy+mock for *n*; live region only after scrub settle / explicit seek (see LiveRegion lock). |
| Seek via pill | Desktop | Smooth-scroll track to chapter *n* progress; then same as in-pin. Reduced-motion: jump without smooth scroll / without pin (carousel index). |
| Seek via pill | Mobile | Set index; no page scroll besides keeping the section in view if already there. |
| Skip to Website | Both | Pill 6 Activate is sufficient. No interstitial. **Climax does not fire** on skip (scrub-entry only). |
| Climax armed | Desktop Website via scrub | Micro-beat plays once on scrub-entry from Reports. |
| Climax spent | Still on Website | Frame at rest scale **1** after beat (LOCKED). |
| Unpin (escape) | Desktop | Keep scrolling out of track **or** Activate Website/any pill. Re-enter from below → Website; from above → Clients (LOCKED). |
| Focus (desktop pinned) | `#crm` | Focus ring visible vs paper-warm; tab order = sticky pills (roving) then onward landmarks; **no focus trap**; Up/Down/PageDown/Space scroll the page unless a seek control is focused and Space/Enter means Activate. |
| `prefers-reduced-motion: reduce` | All viewports | **CarouselChrome** — no pin, no scrub, no climax, no hover-lift, no crossfade; instant swap. On `matchMedia` change mid-pin: tear spacer, remount chrome, restore chapter **id**, sync scroll so section is in view. |
| Resize across `lg` / orientation | Home | Remount model; preserve chapter **id**; sync `scrollTop`; if focus was in unmounted chrome, move to active pill. Seek smooth-scroll cancels on wheel/touch. |
| Hash `/#crm` while already in section | Both | **Always** reset to Clients @ progress 0 / index 0 (LOCKED). |
| JS / cinema failure | Home | Render `CarouselChrome`. See Backup & Rollback. |

## Interaction Primitives

**Desktop chapter cinema (`lg+`, motion-safe)**

- **Pin (LOCKED):** Stage sticks with `top` = `{spacing.header-offset}`. Sticky pills share that band. Native page scroll drives `progress ∈ [0, 1]` across **six equal** ranges: chapter *i* = `[i/6, (i+1)/6)` with track height **70vh × 6**. Hysteresis **3%** of a chapter range.
- **Native scroll only (LOCKED):** map `scrollY` → progress. **Forbid** `preventDefault` on wheel / touchmove / PageDown / Space / Home / End except when a seek control is focused and Space/Enter means Activate.
- **Scrub = chapter seek, not frame-sequence.** Discrete chapter + mock. No video frames / 3D orbit.
- **Stable stage:** frame box does not translate with scrub. Transform limited to ClimaxMicroBeat (scrub-entry Website only).
- **Pills (LOCKED):** sticky under header; Activate seeks; Focus alone does not. Tablist APG: Left/Right/Home/End move **focus**/selection intent; Activate (Enter/Space) seeks scrollTop. Smooth-seek cancels on user wheel/touch.
- **Escape:** keep scrolling (unpin) **or** Activate Website (or any) pill. No modal. No scroll-jack.

**Banned on desktop cinema**

- True Apple: video/sprite scrub inside a hardware bezel.
- Beat×6: six inner timelines, bullet stagger, per-point progress bars.
- Naive opacity-tabs-on-scroll that swaps tabs without a stable pinned stage.
- Scroll-jack / `preventDefault` on the document while pinned.

**Mobile (`< lg`) and reduced-motion**

- Click/tap ChapterPills, dots, or chevrons to change index (APG tablist).
- No new swipe-on-frame (LOCKED).
- No `position: sticky` stage, no spacer pin track.

**Hash**

- `/#crm` always means: this section, Clients at rest. It does not encode chapter (no `#crm-website` in v1).

## Accessibility Floor

Stakes are consumer conversion — polish cannot outrun this floor. Visual contrast lives in `DESIGN.md` (inherited Midnight Atelier pairings).

- WCAG 2.2 AA on the marketing section (parent floor) + cinema contrast tokens in `DESIGN.md`.
- Chapter controls operable by pointer and keyboard. Sticky pills remain operable entire pin; pin must **not** trap focus.
- **Name, role, value (LOCKED):** both breakpoints use **tablist / tab / tabpanel** with APG (roving tabindex, Left/Right, Home/End, `aria-selected`, one selected tab in tab order, **stable panel id**). Chevrons are buttons, not tabs. Do not mix `aria-current` on the same node as `aria-selected`.
- **Live region (LOCKED):** polite + atomic; immediate on explicit seek; scrub debounced ~300ms/scrollend; no assertive; suppress duplicates.
- Mocks: `aria-hidden` **and** `inert` — zero tab stops inside the frame.
- `prefers-reduced-motion: reduce` **is** CarouselChrome — not a dimmed cinema. Kill hover-lift / crossfade / climax; tear pin spacer on media change.
- Focus-visible: solid ink or lagoon ≥3:1 vs paper-warm; scroll-margin clears header.
- No autoplay. ClimaxMicroBeat only on scrub-entry to Website (not pill skip).
- Pin `top` / `z-index` / sticky pills vs header — see Post Reviewer Gate locks C2. Hash `scroll-mt-24` remains.

## Key Flows

### Flow A — Priya walks the workspace (desktop, motion-safe) — climax at Website

**Priya**, club admin, laptop, marketing home. **[ASSUMPTION: same Priya as parent UJ-1 prospect.]**

1. Priya opens `cohestra.app` and scrolls (or uses header **Clients** → `/#crm`).
2. `#crm` lands: SectionHeader + ChapterPills; stage pinned on **Clients** with all four CRM bullets visible and the Clients CRM mock in `{components.browser-frame}`.
3. She scrolls. Progress seeks **Follow-up** → **Dashboard** → **Campaigns** → **Reports**. The frame stays put; copy and mock crossfade together; every chapter shows four bullets.
4. She wonders about the public site, clicks **Website** (skip/seek). Track jumps to chapter 6 — **no** ClimaxMicroBeat on skip.
5. **Climax path (alternate):** if she scrolls from Reports into Website instead, ClimaxMicroBeat (scale 1.02 → settle 1) plays once. Eyebrow still reads "Website builder · Pro." All four Website bullets are visible.
6. Resolution: she unpins by scrolling on, reaches Start free / pricing. She was not forced through a video or a six-beat timeline.

**Failure / escape:** At any pill she can jump; scrolling past Website restores normal page scroll. Reduced-motion or a phone uses Flow B.

### Flow B — Priya on her phone (mobile model a)

1. Priya opens the same URL on a phone (`< lg`).
2. `#crm` is the **current click-tabs carousel** — no long pin, no scrub spacer.
3. She taps **Dashboard**, then **Website**. Index changes; copy+mock swap; dots and chevrons still work.
4. **Climax (mobile):** Website chapter content, no scale beat (climax motion is desktop-only).
5. Resolution: she can still reach Start free below. Nothing traps vertical scroll.

### Flow C — Skip to Website (seek/escape, either surface)

1. Priya already knows she needs a public site. She clicks **Website** first.
2. Desktop: pin track seeks chapter 6; **no** ClimaxMicroBeat (skip path). Mobile: index = 5 (`website`).
3. Website copy + `WebsiteBuilderShowcaseMock` immediately. Chapters 1–5 were not required.
4. Edge: keyboard user Tabs to pills, activates Website with Enter — same seek.

### Flow D — Reduced motion

1. OS/browser `prefers-reduced-motion: reduce`.
2. Cinema code path **does not pin**. `CarouselChrome` is the UI (tabs, dots, chevrons).
3. Chapter changes are instant; live region still announces.
4. **Climax:** content only — no transform.

## Inspiration & Anti-patterns

**Borrow grammar from:** [iPhone 17 Pro](https://www.apple.com/sg/iphone-17-pro/) — a pinned product stage, scroll that *seeks chapters*, and controls that jump to a chapter. That is the feeling: the object holds still; the story advances.

**Borrow product truth from:** the live React mocks already on the carousel (see `imports/current-product-carousel-website-slide.png` for the Website chapter as it ships today). Cinema dresses those mocks, it does not replace them with illustration.

**Anti-patterns (dead options from pressure-test — do not revive)**

| Reject | Why |
|--------|-----|
| True Apple frame/video scrub | Hardware frame-sequence / product orbit is the reference's trick, not ours; we are a SaaS workspace, not a phone in titanium |
| Full Beat×6 micro-timelines | Six inner scrub tracks and bullet stagger cut copy and over-choreograph |
| Naive opacity-tabs-on-scroll | Swapping tabs on scroll without a stable stage is neither cinema nor the current carousel |
| Copy cut for "cinematic captions" | Locked: every current bullet stays visible |
| Long pin on mobile | Locked model (a): keep click-tabs carousel |
| Rebrand / new palette | Cinema is an interaction delta on Midnight Atelier |
| Autoplay through chapters | Conversion surface; visitor holds the seek |

## Responsive & Platform

Marketing already uses Tailwind `sm` / `lg` gutters and an `lg` two-column product grid in `MarketingProductCarousel`. Cinema follows that split.

| Breakpoint | Behavior |
|------------|----------|
| **`≥ lg` (1024px+) LOCKED** — same `lg` as today's copy+visual grid | Designed Chapter cinema: pin + scroll-progress seek + sticky ChapterPills. Dots/chevrons off. ClimaxMicroBeat on scrub-entry to Website only if motion-safe. |
| **`< lg`** | Mobile model **(a)**: current click-tabs carousel. Horizontal-scroll tablist below `sm` (today: `-mx-5 overflow-x-auto`). No long pin. No climax scale. |
| **`sm`–`lg`** | Still tabs (not cinema). Pills wrap as today (`sm:flex-wrap sm:justify-center`). |
| **`prefers-reduced-motion: reduce`** | Any viewport: current carousel behavior; ignore pin/scrub/climax. |
| **Platform** | Responsive web only. No native app shell. |

Hash `#crm` + sticky marketing header: keep `scroll-mt-24` so the section title is not hidden under the bar when pinning starts.

## Backup & Rollback

Cinema is a replaceable interaction layer over a proven section. The current `MarketingProductCarousel` **is** the backup, not a sketch of one.

| Path | What ships |
|------|------------|
| **Mobile (`< lg`)** | Current carousel UI/UX unchanged in intent (pills, copy, mock, dots, chevrons, live region). |
| **Reduced-motion** | Current carousel behavior (no pin, no enter animation, instant index). |
| **Explicit rollback** | Restore the backed-up carousel as the desktop `lg+` render as well (feature flag, env, or revert). Desktop then matches mobile: click-tabs, no pin. |

**Implementation note**

- File today: `web/components/marketing/marketing-product-carousel.tsx`.
- **Backup that file (and its CSS: `.marketing-product-carousel-enter` in `web/app/globals.css`) before changing it.**
- Keep `PRODUCT_SLIDES` copy and mock wiring as the single content source so rollback cannot drift from cinema content.
- Do not delete `CarouselChrome` when cinema lands; cinema is an additive desktop branch.

**Rollback success criteria:** `/#crm` on desktop looks and behaves like today's carousel (tabs + chevrons + dots, Clients first, Website skip via pill), and the Website chapter still matches `imports/current-product-carousel-website-slide.png` in structure (eyebrow, title, four bullets, website builder mock in a browser frame).
