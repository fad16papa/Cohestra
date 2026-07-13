# Addendum: Website Builder — Technical Design Notes

*Companion to `prd.md`. Mechanism and transport decisions live here, not in FRs.*

## 1. Data model (proposed)

### SitePage table

| Column | Type | Notes |
|--------|------|-------|
| Id | uuid | Singleton per deployment |
| DraftSectionsJson | jsonb | Full document incl. site branding + sections array |
| PublishedSectionsJson | jsonb | Copy on publish |
| DraftUpdatedAt | timestamptz | |
| PublishedAt | timestamptz? | |
| PublishedByUserId | uuid? | FK to operator |
| SchemaVersion | int | Default 1 |

### Activity extension

| Column | Type | Notes |
|--------|------|-------|
| ShowOnHomepage | bool | Default true [ASSUMPTION] |

### Published snapshot (fast-follow revert)

Optional `SitePagePublishHistory` table storing previous `PublishedSectionsJson` on each publish — enables FR revert without v1 MVP commitment.

---

## 2. Site Page JSON shape (schema version 1)

```json
{
  "schemaVersion": 1,
  "siteName": "The Social Collective",
  "accentColor": "#c45c26",
  "logoAssetId": "uuid-or-path",
  "presetId": "community",
  "sections": [
    {
      "id": "hero-1",
      "type": "hero",
      "enabled": true,
      "order": 0,
      "props": {
        "eyebrow": "Singapore · Community events",
        "headline": "Community activities. Meaningful connections.",
        "description": "Join our events…",
        "heroImageAssetId": "...",
        "primaryCta": { "label": "Browse events", "target": "scroll-upcoming" },
        "secondaryCta": { "label": "Operator sign in", "target": "/login" }
      }
    },
    {
      "id": "upcoming-1",
      "type": "upcomingActivities",
      "enabled": true,
      "order": 1,
      "props": { "title": "Upcoming activities", "limit": 6, "emptyMessage": "New events coming soon." }
    }
  ]
}
```

**Section type → React component map** (web): `hero`, `highlights`, `upcomingActivities`, `howItWorks`, `footer`. Unknown types skipped at render.

**CTA target enum:** `scroll-upcoming` | `/login` | `activity:{slug}`

---

## 3. API contracts (proposed)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/v1/public/site` | None | **Published** payload; Cache-Control + Redis |
| GET | `/api/v1/admin/site` | JWT | **Draft** + publish metadata |
| PUT | `/api/v1/admin/site` | JWT | Save **Draft** only |
| POST | `/api/v1/admin/site/publish` | JWT | Validate + copy draft → published + cache bust |
| GET | `/api/v1/public/site/preview?token=` | Preview token | **Draft** for preview banner flow |

Public upcoming Activities may be embedded in site payload server-side or fetched as part of section render query in web — prefer **server-side composition in API** for single round-trip.

---

## 4. Caching

- Redis key: `site:published:{deploymentId}` or single key for single-tenant deploy
- TTL: 15 minutes with explicit delete on publish
- nginx unchanged; cache at application layer

---

## 5. Migration from env-based landing

1. EF migration adds `SitePages` + `Activities.ShowOnHomepage`
2. Seed script maps `getSiteLandingConfig()` defaults → JSON document
3. Auto-publish seed so `/` never blank on deploy
4. `LANDING_*` env vars documented as fallback-only in deploy docs
5. Remove requirement to rebuild `web` container for copy changes

---

## 6. Competitive positioning (reference)

| Competitor | Hub model | Our response |
|------------|-----------|--------------|
| Peatix Group | Logo, cover, description, auto events | Match field simplicity + CRM feed |
| Luma Calendar | Auto events, follow, newsletter | Steal auto-feed; skip network features |
| Partiful Org | Aesthetic events + org link | Steal draft language; skip effects |
| Eventbrite Organizer | Generic profile + color | Avoid checkout-first feel |
| GoDaddy | Manual brochure | Replace with builder + auto events |

**Moat:** Registration → **Master Client List** + consent campaigns; no competitor in tear-down offers this on same domain.

---

## 7. Event page v2 (out of Website Builder MVP)

Registration pages (`/register/{slug}`) keep existing hero + accent panel.

**Recommended v2 (separate epic):**

- **Phase A:** Site-wide theme presets (Minimal / Warm / Bold) as CSS variable packs
- **Phase B:** Curated hero layout templates (scrim, card overlay) — not Partiful effects sidebar
- **Phase C:** Defer social proof (“who’s going”) unless client requests — consent/privacy cost

Do not scope Partiful-lite theme picker into Website Builder v1.

---

## 8. Sprint mapping (from competitive canvas)

| Sprint | Deliverables |
|--------|--------------|
| 1 | FR-1–3, FR-17, public render, admin GET/PUT/publish API |
| 2 | FR-4–14, FR-15–16, builder UI + preview |
| 3 | Presets, publish success UX, revert history, contrast warns |

---

## 9. Rejected alternatives

| Alternative | Why rejected |
|-------------|--------------|
| Instant save to live (Option A) | Operator error risk on org homepage; party chose B |
| Docker rebuild on save | Competitors use runtime config; rebuild blocks operators |
| Full Wix-style builder | Scope explosion; wrong persona |
| Separate marketing app | Same operator confirmed; one nav |
| HTML embed sections | XSS and support burden |
