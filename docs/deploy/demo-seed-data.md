# Demo seed data (local / UAT)

Production-like demo data for manual UAT on Docker. **Development only** — blocked in non-Development environments when enabled.

## Enable

**Docker Compose** (`.env`):

```bash
DemoDataSeed__Enabled=true
OperatorSeed__Enabled=true   # optional — operator@cohestra.local / ChangeMe123!
```

**Local API** (`appsettings.Development.json` defaults `DemoDataSeed:Enabled` to `true`).

On every API startup the seeder **wipes business data** (clients, registrations, activities, campaigns, timeline) and reseeds. Operator/platform users are preserved.

## What gets seeded

| Area | Coverage |
|------|----------|
| **Tenant** | Default tenant promoted to **Pro trialing** |
| **Personas (11)** | Francis Decena (UAT), new/contacted/active/inactive leads, merge suspects, no phone, no consent, PH mobile |
| **Activities (7 curated + bulk)** | Unlimited, **capacity full** (5/5), spots left, draft, archived, homepage hidden |
| **Registrations** | Sparse fill (~35%), not 100×60 cross product; no duplicate client×activity pairs |
| **Timeline** | WhatsApp initiated/follow-up, Viber initiated, lead status changes, email campaign sent |
| **Campaigns** | Email template + completed campaign with recipients |
| **Synthetic clients** | Fill to `ClientCount` (default 48) with rotated lead statuses |

## Key personas to test

| Client | Use for |
|--------|---------|
| **Francis Decena** | Messenger outreach, full profile, +65 9339 5840 |
| **Ava Tan** | New lead / needs follow-up |
| **Sophia Reyes** + **Sophia R.** | Merge suspect banner |
| **Emma Davis** | No phone — messenger disabled |
| **James Patel** | Consent false — campaign exclusion |
| **Maria Santos** | PH Viber normalization |

## Key activities

| Slug | Use for |
|------|---------|
| `demo-harbourline-pickleball-intro` | **Full** — max 5 registrants, 5 registered |
| `demo-boardgame-night` | Capacity headroom (8/20) |
| `demo-runners-draft-clinic` | Draft — no public registration |
| `demo-sunset-archived-social` | Archived |

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `ClientCount` | 48 | Personas + synthetic fill |
| `CommunityCount` | 4 | Bulk communities (beyond curated) |
| `ActivitiesPerCommunity` | 3 | Bulk activities per community |
| `RegistrationFillRate` | 0.35 | Synthetic registration probability |
| `IncludeOutreachTimeline` | true | WhatsApp/Viber/status timeline |
| `IncludeCampaigns` | true | Template + sent campaign |
| `PromoteDefaultTenantToPro` | true | Plan-gated admin features |

## Rebuild after pull or .env change

Changing seed flags in `.env` does **not** update a running API container. Recreate it:

```bash
docker compose build api --no-cache   # after git pull with seeder changes
docker compose up -d --force-recreate api
docker compose logs api | grep -i seed
```

## Where demo data appears

Demo seed targets the **default** tenant only — not `creativorare`:

| Surface | URL |
|---------|-----|
| Login | `http://default.localhost:8088/login` |
| Clients | `http://default.localhost:8088/clients` |

Load test seed uses `load-*` subdomains — see `.env.local-docker.example` hosts list.
