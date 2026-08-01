---
epic: 18
story: 2
status: ready-for-dev
---

# Story 18.2: Content-Security-Policy baseline

Status: ready-for-dev

## Story

As a **platform operator**,
I want **a documented, non-breaking CSP baseline for the web app**,
So that **XSS blast radius is reduced without breaking Next.js or the admin builder**.

## Context

Deferred from Story 17.4 CR decision — CSP can break Next.js inline scripts/styles. Ship report-only or permissive enforce mode first; document tighten path.

## Acceptance Criteria

1. **Given** production web responses  
   **When** CSP is enabled  
   **Then** `Content-Security-Policy` or `Content-Security-Policy-Report-Only` header is present

2. **Given** local Docker smoke  
   **When** login, dashboard, builder, public registration tested  
   **Then** no CSP violations block core flows

3. **Given** deploy docs  
   **When** operator reads CSP section  
   **Then** report-only → enforce upgrade path is documented

## Tasks / Subtasks

- [ ] **Task 1 — Policy design**
  - [ ] Audit Next.js requirements (inline scripts, `unsafe-inline` for styles if needed, font/img/connect-src)
  - [ ] Choose report-only vs enforce for v1 (recommend report-only first ship)

- [ ] **Task 2 — Implementation**
  - [ ] Add CSP in header owner layer (coordinate with Story 18.3 — likely nginx for prod, Next for dev)
  - [ ] `web/next.config.ts` and/or `deploy/nginx/app-ssl.conf.template`

- [ ] **Task 3 — Verification**
  - [ ] Manual smoke checklist in story or `docs/deploy/enterprise-launch-checklist.md` CSP row
  - [ ] Optional: Playwright smoke if existing harness covers surfaces

## Dev Notes

- Next.js App Router often needs `'unsafe-inline'` for styles in dev; production may differ
- Do not duplicate CSP from both nginx and Next in prod (Story 18.3)
- API responses generally do not need CSP (JSON/HTML email separate)

## File List (expected)

- `web/next.config.ts`
- `deploy/nginx/app.conf`
- `deploy/nginx/app-ssl.conf.template`
- `docs/deploy/enterprise-launch-checklist.md` (CSP row optional)
