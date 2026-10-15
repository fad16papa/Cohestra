# Investigation: Epic 19 post-19.4 reconciliation

## Hand-off Brief

1. **What happened.** After Story 19.4 closed, tracker still listed 19.1 in-progress and 19.2 review even though live UAT already satisfies those acceptance contracts.
2. **Where the case stands.** 19.1 and 19.2 are proven DONE. 19.4 stays CLOSED. 19.3 is the next executable story and is blocked on owner reCAPTCHA keys. 19.5 remains ready-for-dev until 19.3 UAT verification.
3. **What's needed next.** Owner creates UAT-scoped Google reCAPTCHA keys and applies them on the droplet per `19-3-recaptcha-production-enablement.md`. Do not start production cutover.

## Case Info

| Field | Value |
| ----- | ----- |
| Ticket | Epic 19 post-19.4 reconciliation |
| Date opened | 2026-10-15 |
| Status | Concluded |
| System | UAT `https://uat.cohestra.app` on shared droplet; main `2eaf4e8ff948051abd1181d0a28cc3ed28791475` |
| Evidence sources | Public HTTPS probes, `deploy/verify-security-headers.sh`, `docker-compose.uat.yml`, sprint-status, 19.4 closeout |

## Problem Statement

Tracker statuses for 19.1 and 19.2 may be stale after months of successful UAT deploys and Story 19.4 billing acceptance.

## Evidence Inventory

| Source | Status | Notes |
| ------ | ------ | ----- |
| `https://uat.cohestra.app/ready` | Available | 2026-10-15 Healthy postgres/redis/default-tenant |
| Public 19.1 smoke subset | Available | home 200, onboarding, /signup 200, /pricing 200, legal versions |
| Loopback exposure | Available | Public 3100/5100/8180/5432/6379 timeout |
| `verify-security-headers.sh` apex + tenant | Available | PASS including HSTS |
| Wildcard cert | Available | SAN `uat.cohestra.app` + `*.uat.cohestra.app` (Sep 14–Dec 13 2026) |
| CRM | Available | `thesocialcollectivesg.com/ready` Healthy; own cert; no `X-Cohestra-Edge-Vhost` |
| Signup HTML | Available | No grecaptcha / data-sitekey — reCAPTCHA off |
| Droplet SSH / `.env` | Missing | Cloud Agent has no key |
| Live Paddle GET | Not required | 19.4 frozen CLOSED |

## Confirmed Findings

### Finding 1: 19.1 runtime and isolation are satisfied

**Evidence:** UAT `/ready` Healthy; compose hard-codes `OperatorSeed__Enabled=false` and `DemoDataSeed__Enabled=false` (`docker-compose.uat.yml`); public diagnostic ports timeout; CRM Healthy; isolation contract on main CI; 19.4 billing UAT completed on this droplet.

**Detail:** `uat-smoke.sh` docker-ps/loopback curls require droplet SSH. The epic AC smoke list (`/ready`, web home, onboarding, signup/pricing) passes from the public URL.

### Finding 2: 19.2 HTTPS + headers are satisfied

**Evidence:** `verify-security-headers.sh` PASS on `https://uat.cohestra.app` and `https://creativorare.uat.cohestra.app`. HTTP `/ready` → 301 HTTPS with `X-Cohestra-Edge-Vhost: uat`. Tenant registration URL 200. CRM cert is `thesocialcollectivesg.com` only.

### Finding 3: 19.3 reCAPTCHA is still disabled

**Evidence:** Signup HTML has no recaptcha script. Compose defaults `SelfServeSignup__Recaptcha__Enabled=false` and `NEXT_PUBLIC_RECAPTCHA_ENABLED=false`. Production env accepts empty captcha when disabled (`GoogleRecaptchaVerifier`).

### Finding 4: 19.4 remains closed

**Evidence:** `story-19-4-final-uat-closeout.md` on main `2eaf4e8f`. No billing regression observed during this probe.

## Deduced Conclusions

### Deduction 1: Next executable story is 19.3

**Based on:** Findings 1–3. 19.5 sign-off requires all Epic 19 stories and includes public signup.

**Conclusion:** Do not activate 19.5 as the current execution story. Prepare 19.5 matrix now; walk after 19.3 UAT verification.

## Conclusion

**Confidence:** High for 19.1/19.2/19.3-disabled. Medium for droplet `.env` seed flags (compose locks them false).

19.1 DONE. 19.2 DONE. 19.3 BLOCKED on owner keys. 19.5 READY after 19.3. Production NO-GO.
