# Product roadmap P0–P3 (Aug 2026)

Execution of the honest product review recommendations — trust, operator delight, scale, and differentiation.

## P0 — Trust & launch hygiene ✅

| Item | Status | Notes |
|------|--------|-------|
| Brand alignment | ✅ | README, AGENTS.md, operator manual → Cohestra |
| reCAPTCHA production defaults | ✅ | `docker-compose.prod.yml` overlay |
| CSP enforce | ✅ | nginx + Next dev + `content-security-policy.ts` |
| Remove fictional testimonials | ✅ | Replaced with operator outcome cards |
| Marketing carousel | ✅ | Living Reports showcase mock updated |

## P1 — Operator delight ✅

| Item | Status | Notes |
|------|--------|-------|
| Clients list refactor | ✅ | `use-clients-list-filters`, `clients-filter-banners` |
| Report narrative depth | ✅ | Community + lead growth insights, action CTAs |
| Dashboard onboarding | ✅ | Checklist for first activity → follow-up |
| Mobile filter collapse | ✅ | Clients + Activities |

## P2 — Scale & enterprise credibility ✅

| Item | Status | Notes |
|------|--------|-------|
| Export row warnings | ✅ | Confirm when >5000 rows |
| Community/category enforcement | ✅ | ActivityService catalog validation |
| Platform admin polish | ✅ | PlatformCard, PlatformDataTable |
| Playwright smoke e2e | ✅ | 5 tests + README |

## P3 — Differentiation foundations ✅

| Item | Status | Notes |
|------|--------|-------|
| Share kit homepage | ✅ | WhatsApp copy in website share preview |
| Custom domains | 🔶 Foundation | Schema + resolver + Enterprise settings placeholder |
| Follow-up digest | 🔶 Foundation | Daily admin email job (off by default) |

### Still deferred (full P3 scope)

- Custom domain DNS verification UI + ACME automation
- Activity reminder emails before events
- Full FK migration for communities/categories
- Frontend E2E in CI (Playwright job)

## Deploy

```bash
git pull origin main
docker compose -f docker-compose.yml -f docker-compose.prod.yml build web api --no-cache
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate api web nginx
```

Set `SelfServeSignup__Recaptcha__SecretKey` and `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` in `.env` before production signup.
