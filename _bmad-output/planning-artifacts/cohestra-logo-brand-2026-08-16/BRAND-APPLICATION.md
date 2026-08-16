# Cohestra Official Logo — Brand Application (2026-08-16)

## Brainstorm synthesis

**Goal:** Apply the official Cohestra mark across landing, auth, and email without breaking Midnight Atelier (lagoon/paper/stone UI).

**Constraints chosen:**
- Logo mark is **teal → purple gradient**; UI stays **lagoon + Fraunces wordmark** — mark is accent, not a palette takeover.
- **SVG on web**, **PNG in email** (SVG blocked in clients).
- **No black email header bar** — use `paper-warm` banner when activity hero is absent.

## UX decisions

| Surface | Treatment |
|---------|-----------|
| Marketing header/footer | Mark + Fraunces wordmark (`CohestraLogo`) |
| Auth flows | Same via `MarketingWordmark` |
| Public registration stub header | Existing `PLATFORM_LOGO_PATH` (SVG) |
| Email — activity hero present | Full-width hero (unchanged) |
| Email — no hero | Soft `#f3f5f7` banner, 96px centered logo (inline `cid:`) |
| Tenant-branded surfaces | Tenant logo unchanged; platform mark only when unbranded |

## Do / Don't

- **Do** keep logo at 32–40px in chrome; let wordmark carry name.
- **Do** inline-attach PNG for confirmation emails without hero.
- **Don't** replace lagoon primary buttons or gold section labels with logo gradient.
- **Don't** use SVG `<img>` in HTML email.

## Assets

- `web/public/brand/cohestra-logo.svg` — web
- `web/public/brand/cohestra-logo-email.png` — email URL fallback
- `src/Infrastructure/Assets/cohestra-logo.png` — embedded inline attachment
