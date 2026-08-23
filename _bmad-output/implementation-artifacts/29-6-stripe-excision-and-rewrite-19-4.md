---
status: done
story_id: 29.6
story_key: 29-6-stripe-excision-and-rewrite-19-4
---

# Story 29.6: Stripe excision and rewrite 19.4

Status: done

## Story

As a **platform operator**,
I want **zero Stripe runtime dependencies**,
so that **the droplet cannot be pointed at a merchant we cannot use**.

## Acceptance Criteria

- `web/package.json` has `@paddle/paddle-js` and no `@stripe/*`.
- User-visible copy (legal, pricing, signup, billing panel, checkout, complimentary) names checkout / billing portal / Paddle.
- Launch checklist + `docs/deploy/production-droplet-setup.md` use `Paddle__*` only.
- Story 19.4 remains **Paddle billing UAT on droplet**.
- Historical EF migrations and closed Epic 14 retros keep Stripe names as history.
