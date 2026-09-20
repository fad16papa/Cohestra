# UX — Form Experience System

## Form Studio IA (Design tab)

**EXPERIENCE** — Layout, Style, Flow (preset-first chips; customization second)  
**BRAND** — Logo (inherit), Hero, Typography tokens, Colors  
**CONTROLS** — Inputs, radius, buttons, background (advanced)  
**ADVANCED** — Plan-gated options only when entitled

No tenant website URL control on Basic (absent, not disabled).

## Preview

- Preview chrome only in Preview contexts (Form tab / Preview mode).
- Desktop preview max width aligns with public centered column (~480px) unless layout is split (wider chrome).
- Mobile preview uses real narrow layout context (375px), not scaled desktop.

## Public — Modern Centered

- Tighter vertical rhythm; footer sticks to content (no large empty footer gap on short forms).
- Activity metadata hierarchy: community → title → schedule/location → optional capacity strip.

## Public — Split Event

- Desktop: ~40–45% activity panel / 55–60% form.
- Mobile: hero → activity block → form (single column).

## Public — Event Poster

- Poster header block before fields; capacity/social proof when domain provides counts.

## Public — Conversational (Pro)

- One primary question per step; Continue CTA; back navigation; reduced-motion respects `prefers-reduced-motion`.

## Accessibility

- All flows keyboard-operable; step progress exposed to assistive tech when flow is multi-step.
