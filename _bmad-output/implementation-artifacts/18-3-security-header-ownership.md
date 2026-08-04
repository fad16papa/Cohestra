---
epic: 18
story: 3
status: done
baseline_commit: 8d02336
---

# Story 18.3: Security header ownership (nginx vs Next.js)

Status: done

## Story

As a **platform operator**,
I want **each security header set once in production**,
So that **responses do not carry duplicate or conflicting security headers**.

## Acceptance Criteria

1. **Given** production HTTPS/HTTP behind nginx  
   **When** a page response is inspected  
   **Then** baseline security headers appear exactly once

2. **Given** local `next dev` without nginx  
   **When** the app runs  
   **Then** same baseline headers present via Next.js

3. **Given** header change  
   **When** merged  
   **Then** `app.conf` and `app-ssl.conf.template` both updated if nginx-owned

4. **Given** deploy documentation  
   **When** operator reads enterprise launch checklist  
   **Then** prod vs local ownership is explicit

## Tasks / Subtasks

- [x] **Task 1 — Decision + audit**
  - [x] nginx owns production edge; Next.js owns `next dev` only

- [x] **Task 2 — Dedupe**
  - [x] `web/security-headers.ts` + conditional emit in `next.config.ts` (development only)
  - [x] `proxy_hide_header` on nginx `location /` in both templates

- [x] **Task 3 — Docs**
  - [x] `docs/deploy/enterprise-launch-checklist.md` ownership + curl verify

## Dev Agent Record

### Completion Notes

- Production `next start` (Docker) no longer attaches duplicate headers; nginx server-level `add_header` is canonical.
- `proxy_hide_header` defends against stale Next builds that still emit headers.
- HSTS remains HTTPS-template-only (not Next.js).

## File List

- `web/security-headers.ts`
- `web/next.config.ts`
- `deploy/nginx/app.conf`
- `deploy/nginx/app-ssl.conf.template`
- `docs/deploy/enterprise-launch-checklist.md`

## Change Log

- 2026-08-01: Story 18.3 — nginx owns prod security headers; Next dev-only emit.
