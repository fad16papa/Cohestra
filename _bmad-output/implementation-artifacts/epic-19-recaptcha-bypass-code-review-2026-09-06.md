# BMAD code review — Epic 19 UAT recaptcha bypass + env freeze

**Reviewed implementation HEAD:** `c545b40`  
**Prior HEADs (invalid after this change):** `a7aeea6`, `45b7a16`, `2e6c73f`  
**PR:** https://github.com/fad16papa/Cohestra/pull/294 (draft — do not merge)  
**Date:** 2026-09-06

Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor.  
Mandatory loop: IMPLEMENT → VALIDATE → TEST → REVIEW on exact HEAD.

## Pass 1 (`45b7a16`) — BLOCKER/MAJOR triage

| Sev | Finding | Decision |
|-----|---------|----------|
| claimed BLOCKER | Production captcha-off accepts empty token | **dismiss** — owner lock: UAT captcha is OFF; no test bypass token. Not a defect. |
| MAJOR | UAT compose `${VAR:-}` still injects leftover bypass | **patched** — compose no longer maps bypass keys |
| MAJOR | JWT preserved when short/placeholder | **patched** — generate if missing, `<32`, or `change-me*` |
| MAJOR | classifier `source`s env (command expansion) | **patched** — Python parse only |
| MAJOR | local Next empty token vs Development API | **patched** — non-production Next still sends `test-captcha-pass` |
| MAJOR | `Testing` compared case-sensitively | **patched** — `IsEnvironment("Testing")` |
| MAJOR | `www` / `*.uat.cohestra.app` rewrite to production apex | **patched** — same-origin UAT hosts |
| MAJOR | EmailBranding compose default `https://cohestra.app` | **patched** — defaults to `PUBLIC_BASE_URL` |
| MAJOR | classifier TLS keys / `NEXT_PUBLIC_API_URL` as 19.1 CHANGE | **patched** — DEFER 19.2 / COMPOSE FROM PUBLIC_BASE_URL |
| MAJOR | `/tmp` documented as working tree | **patched** — canonical `/home/deploy/cohestra` |
| MAJOR | isolation grep-only / stale image | **defer** — first UAT `--build` has not run; validate is repo-side |
| MAJOR | Dev/Testing accept any non-empty token | **defer** — pre-existing local-test behavior |

## Pass 2 (`2e6c73f`)

- Blind Hunter: **no BLOCKER / no MAJOR**
- Edge Case Hunter: **no unhandled edges on the 19.1 apex-only path**
- Acceptance Auditor: **PASS**

Residual MINOR patched after pass 2: `upsert` now replaces `export KEY=` / leading whitespace so a placeholder JWT cannot survive as a first-wins duplicate.

## Local evidence (no secrets)

- `bash deploy/validate-uat-isolation.sh` — 35 passed, 0 failed
- `dotnet test Cohestra.sln --filter Category!=Integration` — 847 passed
- Reconcile dry-run: JWT `GENERATED`, local-only keys removed, bypass tokens missing, hostname `http://uat.cohestra.app`, mode `600`, no secret values printed

## Decision

**CODE REVIEW: PASS** on `c545b40` (no unresolved BLOCKER / MAJOR).

Do **not** mark Story 19.1 done. Do **not** merge PR #294.  
Do **not** start `uat-compose.sh` until the owner droplet has:

1. canonical checkout `/home/deploy/cohestra` at this HEAD
2. canonical `.env` from `reconcile-canonical-uat-env.sh` (owner `deploy`, mode `600`)
3. classifier + `validate-uat-isolation.sh` PASS on that tree
4. existing-app baseline still PASS
