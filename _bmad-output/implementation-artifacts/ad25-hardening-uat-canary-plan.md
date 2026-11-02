# AD25-HARDENING — controlled positive UAT deployment-canary plan

**PREPARE ONLY. DO NOT EXECUTE.**  
**Production stays NO-GO.**  
**Keep `UAT_DEPLOY_GATE_ACTIVE=false` and `UAT_MAIN_DEPLOY_SUPPRESSED=true` until every precondition below is owner-attested.**

This is not PR-E and not an authorization to activate UAT.

## Precondition checklist (all required)

1. **Control-plane hardening completed** — AD25-HARDENING Draft accepted, merged to `main`, and independently reviewed (BMAD + CAT-SEC, BLOCKER=0, MAJOR=0) on the merged SHA.
2. **Enforceable owner authorization** — restricted owner-policy App or org required workflow installed; check-run `AD25-Owner-Policy` is source-bound (not GitHub Actions `15368` running PR-head YAML).
3. **Protected `release/uat`** — ruleset `26322151` still active, bypass empty, required checks include the seven current checks plus `AD25-Owner-Policy`. Required reviews remain 0 until a second human exists (avoid single-owner deadlock).
4. **Restricted Environment `uat`** — deployments limited to `release/uat`; admin bypass remains disabled; no Production secret overlap; no DROPLET secrets on PR jobs.
5. **Follow-on dest-tree sync accepted** — `release/uat` blobs for the owner-approved allowlist equal the accepted `main` source. Dest-tree isolation PASS on that SHA.
6. **All mandatory post-merge tests SUCCESS** on the exact `release/uat` tip: .NET build/test, API integration, Next.js build, Docker smoke, UAT isolation, Exact-SHA security scan, native GitGuardian, in-run GitGuardian API scan on the protected-line push.
7. **Verified rollback plan** — last-known-good `release/uat` SHA recorded; host rollback command identified; canary abort does not touch Production; abort leaves `UAT_DEPLOY_GATE_ACTIVE=false` if the canary never activated, or returns it to false if the owner had flipped it.
8. **Explicit owner permission to activate UAT** — a separately authenticated owner instruction naming the exact SHA and stating `UAT activation authorized for canary`. Absence is HOLD.

## Canary sequence (future owner-runbook only)

1. Confirm preconditions 1–8 with recorded SHAs and check-run ids.
2. Drain any in-flight Deploy UAT (AD-21) with the suppressor still true.
3. Owner sets `UAT_DEPLOY_GATE_ACTIVE=true` **only** for the canary window. Do not change Production variables.
4. Push or owner-merge the already-reviewed dest tip so AD-23 Deploy UAT runs from `release/uat` (not `main`).
5. Require same-run AD-17 graph SUCCESS and `eligible==true` before SSH.
6. SSH only to UAT. Verify health, public smoke, Playwright, acceptance evidence.
7. Record immutable canary evidence: SHA, artifact digest, job ids, GitGuardian conclusion.
8. If any check is missing/skipped/failed/stale: HOLD, do not retry-blindly, execute rollback plan.
9. After the canary window, owner decides: keep UAT gate true for continued UAT-only deploys, or set `UAT_DEPLOY_GATE_ACTIVE=false`. Neither decision promotes to `main` or Production.

## Hard stops

- No `main` promotion.
- No Production workflow, host, Environment, or secret use.
- No ADCP restoration.
- No PR #505 changes.
- No blanket permission for future merges.
- No autonomous merge from Cursor, `GITHUB_TOKEN`, AD-15, or PR-E.
- Failed or partial evidence is HOLD, never PASS.

## Outcome labels (report separately later)

- `CANARY_NOT_RUN` — this story’s state.
- `CANARY_HOLD` — precondition missing.
- `CANARY_UAT_VERIFIED` — only after owner-executed SSH + acceptance.
- `PRODUCTION_NO_GO` — always, until a later `PRODUCTION CUTOVER: AUTHORIZED`.
