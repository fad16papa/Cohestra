---
stepsCompleted: [1, 2]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-lead-generation-crm-2026-06-14/prd.md
  - _bmad-output/planning-artifacts/prds/prd-lead-generation-crm-2026-06-14/addendum.md
  - _bmad-output/planning-artifacts/prds/prd-lead-generation-crm-2026-06-14/reconcile-business-proposal.md
  - _bmad-output/planning-artifacts/briefs/brief-lead-generation-crm-2026-06-14/brief.md
  - _bmad-output/planning-artifacts/ux-designs/ux-lead-generation-crm-2026-06-14/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-lead-generation-crm-2026-06-14/EXPERIENCE.md
  - _bmad-output/planning-artifacts/research/market-lead-generation-crm-saas-research-2026-06-14.md
workflowType: architecture
project_name: lead-generation-crm
user_name: fadthegreat!
date: '2026-06-15'
techStackStatus: official
techStackDecided: '2026-06-15'
infrastructureDecisionsDecided: '2026-06-15'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Official Technology Stack

**Status:** Approved — 2026-06-15  
**Architecture pattern:** API-first, multi-client (web now, mobile later)

All business logic, persistence, and domain rules live in the **.NET API**. Web and future mobile apps are thin clients that consume the same REST API.

### Stack summary

| Layer | Technology | Role |
|-------|------------|------|
| **Backend API** | ASP.NET Core Web API | Domain services, auth, REST endpoints, OpenAPI |
| **ORM** | Entity Framework Core | PostgreSQL access, migrations, JSONB mapping |
| **Database** | PostgreSQL | Relational core + JSONB for dynamic form schemas and answers |
| **Cache** | Redis | Rate limiting, hot-read cache, refresh-token store |
| **Identity** | ASP.NET Core Identity | Operator user store, password hashing, roles (MVP: single admin) |
| **Auth** | JWT Bearer | Access + refresh tokens; shared by web and future mobile |
| **Email** | SendGrid | Campaign sends, delivery/failure logging |
| **Hosting** | DigitalOcean Ubuntu (Linux) | Docker Compose deployment |
| **Containers** | Docker + Docker Compose | Local dev and deployment consistency |
| **Web client (MVP)** | Next.js + Tailwind CSS + shadcn/ui | Admin dashboard + public registration (UX spec) |
| **Theming (web)** | next-themes | Light / Dark / System per `DESIGN.md` |
| **Future client** | Mobile app (platform TBD) | Same API v1 contracts |

### Rejected alternatives

| Alternative | Reason |
|-------------|--------|
| ASP.NET Core MVC monolith | Faster for solo web-only MVP, but blocks clean mobile expansion; user requires API foundation now |
| Next.js monolith (API routes + Prisma) | Misaligned with team .NET strength and mobile roadmap |
| MVC + Tailwind only (no separate API) | Same as monolith rejection — no shared backend for mobile |

### Rationale

1. **Mobile-ready foundation** — JWT-based API with versioned REST endpoints (`/api/v1/...`) allows a future iOS/Android app without rewriting business logic.
2. **Team fit** — Primary developer is .NET-background; backend built in area of strength.
3. **UX compliance** — Next.js + shadcn satisfies finalized `EXPERIENCE.md` and `DESIGN.md` for web surfaces.
4. **Product fit** — PostgreSQL + JSONB supports dynamic Activity forms without hard-coding template fields; EF Core handles relationships for Client dedup, timeline, and reports.
5. **MVP NFRs** — API supports synchronous registration ingestion (SM-1), rate-limited public endpoints, and 60s dashboard polling from web client.

### System topology

```
┌─────────────────────┐     ┌─────────────────────┐
│  Next.js (MVP web)  │     │  Future mobile app  │
│  admin + /register  │     │  (Phase 2+)         │
└──────────┬──────────┘     └──────────┬──────────┘
           │         REST /api/v1        │
           └─────────────┬───────────────┘
                         ▼
           ┌─────────────────────────┐
           │  ASP.NET Core Web API   │
           │  Application + Domain   │
           │  EF Core Infrastructure │
           └────────────┬────────────┘
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
        ┌───────────┐       ┌───────────┐
        │ PostgreSQL│       │   Redis   │
        └───────────┘       └───────────┘
```

### Backend solution structure (target)

```
LeadGenerationCrm.sln
├── Api/                 # Controllers, auth middleware, OpenAPI
├── Application/         # Use cases (RegisterClient, SendCampaign, ExportReport)
├── Domain/              # Entities, enums, dedup rules
├── Infrastructure/      # EF Core, Redis, email, QR generation
└── Contracts/           # Request/response DTOs (wire contract for web + mobile)
```

### API surface conventions (mobile-ready)

| Group | Auth | Purpose |
|-------|------|---------|
| `Public` | None + rate limit | Activity by slug, registration submit |
| `Admin` | JWT Bearer | Activities, clients, campaigns, reports, settings |
| `Health` | None | `/health`, `/ready` for containers |

**Cross-client rules:**

- DTOs only on the wire — never expose EF entities
- Pagination on all list endpoints (offset or cursor)
- Stable UUIDs for resource identifiers
- RFC 7807 `ProblemDetails` for errors
- OpenAPI spec published for client generation
- Optional `Idempotency-Key` on public registration POST

### Data model notes

- `activities.form_schema` → JSONB (field definitions per Activity)
- `registrations.answers` → JSONB (immutable submitted values)
- `registrations.registration_number` → unique string, format `REG` + `YYYYMMDD` + 6-digit daily sequence (UTC)
- Unique constraint on (`client_id`, `activity_id`) — one registration per client per activity
- `RegistrationNumberGenerator` assigns numbers at insert; idempotency cache stores number for replays
- `ActivityResponse.registrationCount` — aggregated on admin activity list API
- `clients` → normalized master fields (phone, email, lead status, consent)
- Dedup at registration: normalized phone/email match before insert
- Timeline events append-only for audit (status changes, campaigns, notes)
- `communities` / `categories` → catalog tables (id, name, timestamps); seeded from distinct activity labels on migration
- `activities.community_label` / `activities.category` → denormalized strings; rename propagates via catalog service; no FK in MVP+Epic 6
- `client_timeline_events` → append-only audit rows plus projected registration events on client detail API

### Web client boundaries

Next.js owns **UI only**:

- Routing, SSR for public `/register/{slug}` (FCP &lt; 2s target)
- shadcn components, theme toggle, 60s dashboard polling
- JWT storage and `Authorization: Bearer` on admin API calls (see Authentication below)

Next.js does **not** own:

- Business logic, dedup, campaigns, reports, or persistence

### Docker Compose services (target)

| Service | Image |
|---------|-------|
| `api` | ASP.NET Core Web API |
| `postgres` | PostgreSQL |
| `redis` | Redis |
| `web` | Next.js (when web scaffold begins) |

---

## Core Architectural Decisions

**Status:** Approved — 2026-06-15

### Authentication & Security

| Decision | Choice |
|----------|--------|
| Identity library | **ASP.NET Core Identity** |
| Token format | **JWT** (access + refresh tokens) |
| Web client auth | **Direct JWT** — Next.js stores tokens and sends `Authorization: Bearer` on admin API requests |
| Admin API protection | `[Authorize]` + JWT Bearer middleware |
| Public API | Unauthenticated; Redis rate limiting on registration POST |
| Future mobile | Same login endpoint and JWT contract |

**Auth flow:**

1. Operator posts credentials to `POST /api/v1/auth/login`
2. API validates via Identity, returns **access token** (short-lived) + **refresh token** (longer-lived)
3. Next.js admin routes attach access token to API calls
4. On 401, client calls `POST /api/v1/auth/refresh` with refresh token
5. Session expiry per PRD assumption: 24h inactivity acceptable — configure refresh token TTL accordingly
6. Operator **appearance/theme preference** stored on Identity user profile (synced from Settings)

**Rejected:** BFF HttpOnly cookie proxy — direct JWT chosen for parity with future mobile client.

**Security notes:**

- CORS restricted to Next.js web origin(s) on admin endpoints
- HTTPS termination at reverse proxy (nginx on DigitalOcean)
- SendGrid API key and JWT signing key in environment secrets — not in source control
- Refresh tokens stored in Redis with TTL and revocation support

### Email

| Decision | Choice |
|----------|--------|
| Provider | **SendGrid** |
| Integration | SendGrid API from Infrastructure layer |
| MVP scope | Compose + send campaigns; log per-recipient delivery/failure (FR-12, FR-13) |
| Privacy | Individual sends or BCC — never expose recipient list in headers (PRD NFR) |

**Operational:** Configure sender domain and DNS (SPF/DKIM) on SendGrid before production campaigns (PRD Open Question 5).

### Infrastructure & Deployment

| Decision | Choice |
|----------|--------|
| Hosting | **DigitalOcean — Ubuntu Linux** |
| Deployment model | **Docker Compose** on droplet(s) |
| Reverse proxy | nginx (TLS termination, route `/api` → API container, `/` → Next.js) |
| Database | PostgreSQL in Compose for MVP; managed DB optional later |
| Environments | `development` (local Compose), `production` (DO Ubuntu) |

**Target production layout (MVP):**

```
Internet → nginx (443) → web (Next.js :3000)
                       → api (ASP.NET Core :8080)
                       → postgres (:5432, internal network)
                       → redis (:6379, internal network)
```

### Redis scope (full intended use)

| Use case | Implementation |
|----------|----------------|
| **Public registration rate limiting** | Sliding window per IP / fingerprint on `POST /api/v1/public/registrations` |
| **Hot-read cache** | Published activity + form schema by slug (invalidate on activity update/publish) |
| **Dashboard metric cache** | Cached aggregate tiles between 60s web polls (TTL ~60s) |
| **Refresh token store** | Refresh token lookup, rotation, and revocation (Identity + JWT) |

Redis is required infrastructure for MVP — not deferred.

### Open decisions (remaining)

- SendGrid sender domain confirmation with client (operator checklist in app — Story 7.6)
- Client-owned DNS + production hostname cutover (script: `deploy/switch-https-domain.sh`)

### Shipped (UAT polish 2026-06-30)

- **Docker nginx** — `deploy/nginx/app.conf`; optional TLS via `active-ssl.conf` from Certbot
- **Temporary HTTPS** — nip.io + Let's Encrypt (`deploy/setup-temporary-https.sh`); no volume wipe on enable/rollback
- **CI/CD** — `.github/workflows/ci.yml` + `deploy.yml` → `remote-deploy.sh`

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

16 FRs across 7 feature areas drive an API-first system with a web client:

| Area | FRs | Architectural implication |
|------|-----|---------------------------|
| Activity Engine | FR-1–4 | Activity CRUD, JSON form schema storage, slug-based public routes, QR generation, registration ingestion |
| Master Client List | FR-5–7 | Client entity with dedup, immutable Registration records, relationship timeline |
| Dashboard | FR-8–9 | Aggregated metrics queries; web polls API every 60s |
| Reports | FR-10–11 | Filtered aggregation + CSV export in API |
| Email Campaigns | FR-12–13 | Segment builder, email provider integration, send logging |
| WhatsApp MVP | FR-14–15 | Deep link from web; status updates via API |
| Administration | FR-16 | JWT/session auth on admin API routes |

**Core data flow:** Activity setup → public Form submit → Registration + Client (deduped) → follow-up actions → aggregated Reports.

Three launch form templates (TGH Tennis, Ikigai Pickleball, Board Game Night) are seed data against a shared JSON schema format — not separate database schemas.

**Non-Functional Requirements:**

| Category | Requirement | Architecture impact |
|----------|-------------|---------------------|
| Performance | Public page &lt; 2s on 4G; dashboard &lt; 3s | Next.js SSR + colocated API; Redis cache for activity schemas |
| Reliability | Registration→client link within 60s | Synchronous API ingestion; no async-only queue without retry |
| Availability | ~99% business hours (MVP) | Single-region deployment acceptable |
| Security | Auth on admin; rate limiting on public forms | API middleware; Redis rate limiter |
| Privacy | Consent capture; preferences honored on campaigns | Consent flags on Client; segment filters in API |
| Data integrity | Immutable registrations; audited corrections | Append-only registrations; timeline event log |
| Observability | Log failed sends and registration failures | Structured logging (Serilog); health checks |

**Scale & Complexity:**

- **Primary domain:** API-first backend + responsive web client
- **Complexity level:** Medium
- **Estimated components:** API (4 layers), web app, PostgreSQL, Redis, Docker orchestration
- **Tenancy:** Single operator (Marco) for MVP; schema designed for future productization without multi-tenant implementation now

### Technical Constraints & Dependencies

- **UX mandate:** Next.js + shadcn/ui + Tailwind + next-themes on web (`EXPERIENCE.md`, `DESIGN.md`)
- **Backend mandate:** .NET API is system of record — chosen for team skill and mobile roadmap
- **Email provider:** SendGrid — API integrates send + delivery/failure log
- **WhatsApp:** Click-to-message in web only for MVP; Business API deferred to Phase 2
- **QR codes:** Generated server-side in API; white background in PNG download per UX
- **Phone default:** +63 (PH) country code assumption
- **Export format:** CSV for MVP
- **Delivery context:** 8-week MVP; stack favors proven, boring technology

### Cross-Cutting Concerns Identified

1. **Authentication & authorization** — ASP.NET Core Identity + JWT (access/refresh); public endpoints unauthenticated with Redis rate limits; future mobile uses same token endpoints
2. **Dynamic form schema** — shared JSON contract between API storage, web `RegistrationForm`, and future mobile renderer
3. **Client deduplication** — normalized phone/email at API ingestion; merge-suspect flags only in MVP
4. **Audit timeline** — append-only events (registrations, status changes, campaigns, WhatsApp actions, notes)
5. **Consent & communication preferences** — gates campaign segments and Board Game template submit
6. **Theme system** — web-only (next-themes); API stores operator appearance preference
7. **Lead Status lifecycle** — New → Contacted → Active → Inactive; drives filters, badges, reports
8. **Segment/filter engine** — AND-semantics shared by Reports and Campaign compose endpoints
9. **Rate limiting & abuse prevention** — Redis on public registration POST
10. **Community & category catalogs** — operator CRUD on `communities` / `categories`; denormalized labels on `activities` for reporting and filters; not separate tenants
11. **API versioning** — `/api/v1` from day one for mobile compatibility

### Quality & delivery (post-MVP target — Epic 7)

| Area | MVP / Epic 6 state | Epic 7 target |
|------|-------------------|---------------|
| CI | Unit tests for SendGrid settings only | GitHub Actions: build, test, SendGrid sandbox gate |
| Integration tests | Deferred across Epics 3–6 | Registration ingest, dedup, campaign send, catalog CRUD smoke |
| List pagination | Activities/reports capped at 100 rows | Server pagination + UI on activities list; catalog-aligned report filters |
| Email delivery | SendGrid API accept | Operator DNS checklist; optional in-app delivery setup status |
| Outreach audit | WhatsApp follow-up dirty guard (UI) | Server-side dedup or cooldown on identical follow-up POSTs |
| Demo seed | 5 communities × 1 activity (legacy) | Full business wipe + 6×10×100 matrix when `DemoDataSeed:Enabled`; **never in production** |
