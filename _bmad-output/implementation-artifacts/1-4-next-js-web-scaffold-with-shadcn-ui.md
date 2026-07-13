---

baseline_commit: 304fd57a09d697e94627e1234d4b5749db0433c1

---



# Story 1.4: Next.js Web Scaffold with shadcn/ui



Status: done



## Story



As a developer,

I want the Next.js web client scaffolded with shadcn/ui and Tailwind,

So that admin and public UI stories share a consistent component foundation.



## Acceptance Criteria



1. **AC-1.4.1 — App Router + Tailwind + shadcn**

   - **Given** the web container builds successfully

   - **When** I open the web app root

   - **Then** Next.js App Router is configured with Tailwind and shadcn/ui primitives available



2. **AC-1.4.2 — API base URL (UI-only client)**

   - **Given** `NEXT_PUBLIC_API_URL` is configured

   - **When** the home page loads

   - **Then** the web client calls the API at the configured base URL

   - **And** no business logic lives in Next.js API routes for domain features



## Tasks / Subtasks



- [x] **Task 1: shadcn/ui foundation** (AC: 1.4.1)

  - [x] Initialize shadcn/ui (`components.json`, `lib/utils.ts`, CSS variables)

  - [x] Add baseline primitives: `Button`, `Card`

  - [x] Align `globals.css` with shadcn + Tailwind v4



- [x] **Task 2: API client module** (AC: 1.4.2)

  - [x] Add `lib/api.ts` with server/client base URL helpers

  - [x] Document `API_URL` (server) vs `NEXT_PUBLIC_API_URL` (browser) in compose and `.env.example`



- [x] **Task 3: Scaffold home page** (AC: 1.4.1, 1.4.2)

  - [x] Replace placeholder page with shadcn Card showing API connectivity

  - [x] Server-fetch `GET /api/v1/system/info` (no Next.js domain API routes)



- [x] **Task 4: Verify build** (AC: all)

  - [x] `npm run build` in `web/`

  - [x] `docker compose up --build web` smoke test



## Dev Notes



- Stack from Story 1.1 decision A: Next.js 16, Node 22, Tailwind v4

- shadcn/ui + `class-variance-authority`, `tailwind-merge`, `lucide-react`

- UI-only: no `app/api/` routes for domain features in this story

- Server-side fetch in Docker uses `API_URL=http://api:8080`; browser uses `NEXT_PUBLIC_API_URL`



## Dev Agent Record



### Agent Model Used



Composer



### Completion Notes List



- shadcn/ui initialized (base-nova style) with Button and Card primitives

- `lib/api.ts` separates `getServerApiBaseUrl()` (`API_URL`) from `getPublicApiBaseUrl()` (`NEXT_PUBLIC_API_URL`)

- Home page server-fetches `GET /api/v1/system/info` and renders connectivity in a shadcn Card

- Docker Compose sets `API_URL=http://api:8080` for container network; browser links use `localhost:8080`

- Code review patches: `.dockerignore`, fetch timeout, JSON casing fallback, server vs browser URL labels



### File List



- `web/.dockerignore`

- `web/lib/utils.ts`

- `web/lib/api.ts`

- `web/components/ui/button.tsx`

- `web/components/ui/card.tsx`

- `web/app/globals.css`

- `web/app/layout.tsx`

- `web/app/page.tsx`

- `web/package.json`

- `web/package-lock.json`

- `docker-compose.yml`

- `.env.example`

- `README.md`



### Change Log



- 2026-06-18: Story 1.4 implemented — shadcn/ui scaffold, API client module, home page API connectivity

### Review Findings

- [x] [Review][Patch] Missing `web/.dockerignore` — Docker build copies host `node_modules`/`.next` [web/Dockerfile:9]
- [x] [Review][Patch] SSR fetch has no timeout — slow API blocks page render [web/lib/api.ts:27-31]
- [x] [Review][Patch] System info JSON lacks PascalCase fallback — breaks if .NET JSON policy changes [web/lib/api.ts:37]
- [x] [Review][Patch] UI says "connected via" public URL but SSR fetch uses `API_URL` [web/app/page.tsx:46-49]

- [x] [Review][Defer] `NEXT_PUBLIC_*` build-time inlining for future client bundles [web/Dockerfile] — deferred; home page is SSR-heavy; document when adding client-side API calls
- [x] [Review][Defer] Runtime JSON schema validation (zod) for `SystemInfo` — deferred; scaffold-only endpoint
- [x] [Review][Defer] Web healthcheck does not verify API connectivity — deferred; compose `depends_on` api healthy is sufficient for scaffold
- [x] [Review][Defer] Hard-fail startup when `API_URL` missing in Docker — deferred; compose always sets both vars today

- [x] [Review][Patch] Button with `render={<Link />}` keeps `nativeButton=true` — breaks native button semantics / a11y [web/app/page.tsx:81-85]


