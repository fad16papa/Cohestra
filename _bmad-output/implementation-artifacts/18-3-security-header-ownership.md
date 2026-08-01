---
epic: 18
story: 3
status: ready-for-dev
---

# Story 18.3: Security header ownership (nginx vs Next.js)

Status: ready-for-dev

## Story

As a **platform operator**,
I want **each security header set once in production**,
So that **responses do not carry duplicate or conflicting security headers**.

## Context

Story 17.4 added headers to both nginx (`app.conf`, `app-ssl.conf.template`) and `web/next.config.ts`. Production HTTPS may return duplicates. Epic 17 retro: update both nginx templates when changing headers.

## Acceptance Criteria

1. **Given** production HTTPS behind nginx  
   **When** any page or API-proxied response is inspected  
   **Then** `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (and HSTS on HTTPS) appear **once**

2. **Given** local `next dev` or web-only container  
   **When** app runs without nginx  
   **Then** same baseline headers still present via Next.js

3. **Given** header change  
   **When** merged  
   **Then** `app.conf` and `app-ssl.conf.template` both updated if nginx-owned

4. **Given** deploy documentation  
   **When** operator reads checklist  
   **Then** prod = nginx owns, local dev = Next owns (or documented alternative)

## Tasks / Subtasks

- [ ] **Task 1 — Decision + audit**
  - [ ] `curl -I` prod-like stack: list duplicate headers
  - [ ] Record ownership matrix (nginx vs Next per header)

- [ ] **Task 2 — Dedupe**
  - [ ] Remove redundant layer (recommended: nginx owns prod; keep Next for dev parity)
  - [ ] Ensure API JSON responses from nginx proxy don't get wrong headers if applicable

- [ ] **Task 3 — Docs**
  - [ ] Update `docs/deploy/enterprise-launch-checklist.md` or nginx deploy doc

## Dev Notes

- HSTS only on HTTPS nginx template (already in 17.4 CR)
- CSP added in 18.2 should follow same ownership rule
- `next.config.ts` headers apply to all Next routes; nginx adds on proxied responses

## File List (expected)

- `web/next.config.ts`
- `deploy/nginx/app.conf`
- `deploy/nginx/app-ssl.conf.template`
- `docs/deploy/enterprise-launch-checklist.md`
