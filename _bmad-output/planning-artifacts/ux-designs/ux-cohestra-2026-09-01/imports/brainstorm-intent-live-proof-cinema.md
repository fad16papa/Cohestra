# Intent: Live Proof Cinema

**North star:** Mount the real Cohestra UI with DemoClub seed and feeling copy so visitors hire certainty — this is the tool for their club — not a marketing carousel.

## Non-negotiables

- **Live screens + seed data.** Same React surfaces as product (Clients, Follow-up, Dashboard, Campaigns, Reports, Website), fed by a named-club snapshot (Elena, Jordan, Sunday clinic, board games night). Decorative mocks are a promise with a question mark; live seed is evidence. No second mock design system.
- **Kill chapters / scroll-to-continue.** No `chapterNumber`, no “Chapter N of 6”, no “Scroll to continue”. Pills seek surfaces, never chapters. Progress is selected pill (+ optional ink) and product state only.
- **Cohestra identity, not Apple clone.** Borrow Apple grammar (hero object owns the viewport, pin+seek, short copy, restraint). Keep Cohestra soul: gathered clarity — ink, lagoon, warm paper, Fraunces/Sora. Not black/white hardware theater, San Francisco coldness, or neon SaaS confetti.
- **Feeling over feature noise.** Copy answers a fear, not a feature list. Pattern: Feeling → Scene → Proof (live screen). Emotion target: relief + quiet confidence (“someone finally built the stack for clubs”). Three felt outcome lines max; the screen carries the rest.

## Chosen architecture

| Axis | Choice |
|---|---|
| **Data** | Static `MarketingDemoClub` JSON (apex speed + safety). Not a live demo API or cloned seed DB. Curated fixtures only — never production tenant / real PII / session cookies on apex. |
| **Mount** | Extract presentational bodies from admin pages + `MarketingDemoProvider`; iframe `/demo/*` as fallback. Crop dense screens with a cinematic mask (still live DOM). Website: preview pane + sections only, not full editor chrome. Demo layout shell without sidebar. Stage `aria-hidden`/`inert`; pills are the accessible control. |
| **Frame** | Frameless product stage **or** thin Cohestra window. Kill fake browser chrome (`ShowcaseBrowserChrome`) as authenticity theater. |
| **Copy** | Feeling + scene (optional 2–3 outcome lines). Eyebrow/thesis is emotional, not taxonomy. CTA after cinema: “Start with your first activity” (not “See pricing”). Demo copy: “A week inside a club like yours” — never “Your account”. |
| **Progress** | Selected pill only; thin ink bar optional. Chapters forbidden. Sticky selected pill teaches progress; scroll itself is the teacher. |
| **Climax** | Connection beat (Follow-up), with Clients relief as alternate; Website is pride epilogue, not the Pro upsell climax. |

Combo: JSON seed + presentational mount + thin/frameless stage + feeling+scene copy + pill-only progress + connection climax.

## Emotional arc (draft feeling lines)

Arc: **relief → connection → control → reach → proof → pride.** Pills = rooms in one house. Left copy starts with the feeling word before any feature noun. Right stage never empties — crossfade live roots so the house stays inhabited. Recurring cast across rooms (Elena in Clients and Reports).

| Surface | Feeling | Job (visitor hires this to…) | Feeling line |
|---|---|---|---|
| **Clients** | Relief | “I won’t lose a person after they scan the QR” | Every person who signs up still has a name on Monday |
| **Follow-up** | Connection | “Messaging lives where the lead lives” | Message them where they already are — and keep the record |
| **Dashboard** | Control | “Monday morning in 10 seconds” | Know what needs you before the session starts |
| **Campaigns** | Reach | “Email the right segment without exporting” | Reach the right people without exporting your community |
| **Reports** | Proof | “Prove the week to my board” | Show the week — not a spreadsheet archaeology dig |
| **Website** | Pride | “Public face and activities stay one organism” | Your public face stays tied to the activities you already run |

Section job: answer “Is this real software for my kind of club, or pretty vapor?” Emotional hire: “Make me feel the chaos ends here.” Trust hire: pixel-true to login. Identity hire: calm club craft, not generic AI SaaS.

## Kill / keep

**Kill**

- `chapterNumber`, “Chapter N of 6”, chapter watermarks, chapter footer
- “Scroll to continue”
- Empty Website section rails / hollow Pro mock / PRO chip theater
- `ShowcaseBrowserChrome` as primary authenticity signal
- Feature-checklist bullets / CRM-generic capability lists
- Parallel fake UI / second design language
- Stock photos over UI; anonymous “Acme” seed; real-PII iframe

**Keep**

- Pin cinema + seek pills (product-true labels: Clients, Follow-up…)
- Live region announces the **job sentence**, not “Chapter N”
- `prefers-reduced-motion` → click-tabs; same live surfaces (scaled), never a different fake mobile mock
- Midnight Atelier tokens; lagoon only on true actions (WhatsApp, Publish)
- Climax micro-beat (optional, subtler — ease/settle, not bounce)
- Selected pill ink-filled; idle pills whisper
- Stage inert but internally scrollable for depth; clicks blocked

## Open decisions for UX

1. **Frameless vs thin Cohestra window** — identity choice, not mock-authenticity. Fake browser dots are out either way.
2. **Climax surface** — default Follow-up (connection / “the stack can die” at WhatsApp-on-timeline). Alternate: Clients relief, or test Follow-up-first entry. Website stays epilogue.
3. **Section thesis line** (replace “Inside the workspace”):
   - “The stack ends here”
   - “A week with your people”
   - “Software that remembers your club”
4. **Stage vs copy layout** — stage ~70% with feeling headline + one breath sentence, **or** full-bleed stage with copy as caption under hero.
5. **Website mount** — live builder preview with seeded Hero/Highlights/Activities/Testimonials, or don’t show the surface.

## Handoff

**Next:** Update or Create UX workspace (`bmad-ux`) for this Live Proof Cinema direction.

Prior cinema UX `ux-cohestra-2026-08-31` is **superseded** for this direction. Do not extend that workspace’s chapter/mock cinema; start from this intent.
