# Epic 19 reconciliation — 2026-10-10

**Model:** Grok 4.6 only.  
**Skills:** `bmad-sprint-status`, `bmad-create-story`, `bmad-investigate` (non-mutating public probe).  
**Production:** **NO-GO**. No UAT deploy. No merge of this note required for launch.

October 8 artifacts remain historical. This file does **not** replace them.

| Historical artifact | Keep |
|---------------------|------|
| `19-4-sandbox-uat-execution-2026-10-08.md` | Then-unmerged PR #404; SSH denied; no sandbox walk |
| `19-4-paddle-sandbox-uat-execution-plan-2026-10-08.md` | Execution plan still in force after #404 merge |
| `19-1` / `19-2` independent public probe 2026-10-08 | Infra PASS; stories not closed |
| Tracker comments dated 2026-10-08 | Historical “#404 not merged” |

## Current repo

| Item | Value |
|------|-------|
| `origin/main` | `f293650d3ab3b536e159c2888f562b124540f26f` |
| Tip subject | Merge pull request #436 (Documentation 2.0) |
| Required CI on that SHA | SUCCESS — GitHub run `38065729824` |
| Dirty worktree at recon | clean on branch `cursor/epic-19-reconciliation-59c2` |
| PR #404 | **MERGED** 2026-10-08T14:21:54Z |
| #404 merge SHA | `69814fc3b172d23dfe2782ad837140e234a9ffc7` |
| #404 ancestor of main | **yes** |

Required CI jobs (PR/main `ci.yml`): .NET build and test, API integration tests, Next.js build, UAT isolation contract, Docker stack smoke. GitGuardian also ran on the Docs 2.0 PR HEAD.

## Tracker vs files

| Key | Tracker | Story file on main before this commit |
|-----|---------|----------------------------------------|
| `epic-19` | in-progress | — |
| `19-1-uat-droplet-deploy-and-smoke` | in-progress | exists |
| `19-2-https-edge-security-header-verify` | review | exists (`19-2-wildcard-tls-edge.md`) |
| `19-3-recaptcha-production-enablement` | ready-for-dev | **absent** → created this date |
| `19-4-paddle-billing-uat-on-droplet` | ready-for-dev | exists + Oct 8 plan/evidence |
| `19-5-operator-core-flows-launch-signoff` | ready-for-dev | **absent** → created this date |

Statuses unchanged. Stories are not marked done.

## Public UAT probe 2026-10-10 (no SSH, no secrets)

| Check | Result |
|-------|--------|
| `https://uat.cohestra.app/ready` | **200** Healthy (postgres, redis, default-tenant) |
| `http://uat.cohestra.app/ready` | **301** → HTTPS; `X-Cohestra-Edge-Vhost: uat` |
| Cert SAN | `uat.cohestra.app` + `*.uat.cohestra.app` (notBefore 2026-09-14, notAfter 2026-12-13) |
| Tenant SNI `creativorare.uat.cohestra.app` | **200**, same wildcard cert, HSTS `max-age=31536000` |
| Security headers on `/` and `/ready` | Each of XFO, XCTO, Referrer-Policy, Permissions-Policy, CSP appears **once**; HSTS present |
| `/pricing` `/signup` `/billing/paddle-return` | **200** |
| Unsigned Paddle webhook | **400** `Missing Paddle-Signature header.` |
| Garbage `Paddle-Signature` | **400** `Invalid Paddle-Signature.` |
| Deployed git SHA | **BLOCKED** — no SSH, `/ready` does not expose SHA |
| `uat-smoke.sh` / classify / migrations | **BLOCKED** — no SSH |
| `thesocialcollectivesg.com` cert | **EXPIRED** 2026-10-01 (CN `thesocialcollectivesg.com`). `curl` verify fails. With insecure TLS, `/ready` is Healthy. Shared-droplet existing-app regression is **not** clean. |

This probe does **not** close 19.1 or 19.2.

## SSH / deploy gate

| Check | Result |
|-------|--------|
| `~/.ssh/cohestra_uat` | **absent** |
| `SSH_AUTH_SOCK` | **unset** |
| `ssh deploy@129.212.235.2` | `Permission denied (publickey)` |
| Owner UAT deploy authorization this run | **absent** |
| Mutating deploy attempted | **no** |

## Changed since 2026-10-08 assessment

- PR #404 merged (`69814fc3`). Stale “MERGE READY, not merged” is historical only.
- `origin/main` moved through Epics 43/44 close, Cinema landing removal (#435), Documentation 2.0 (#436) to `f293650d`.
- Public UAT still Healthy + wildcard TLS. SHA still unproven.
- Shared existing-app certificate expired (new vs Oct 8).
- 19.3 and 19.5 story files now exist.

## Follow-up in this PR (same day)

- `19-4-paddle-billing-uat-on-droplet.md` numbered blockers 1–7 restored (addendum folded into item 1; no blocker text dropped).
- `epic-19-shared-tls-recovery-2026-10-10.md` — existing-site HTTP-01 renew vs UAT DNS-01 wildcard.
- `epic-19-acceptance-matrix-19-1-19-2-2026-10-10.md`.

## 19.3 / 19.5 AC check vs `epics-cohestra-enterprise.md`

| Story | Planning ACs | Story file |
|-------|--------------|------------|
| 19.3 | Enabled + keys; `NEXT_PUBLIC_*`; rebuild web; widget; signup+OTP; checklist §3 | All present. Extra: invalid token, rate limits, isolation, no UAT bypass |
| 19.5 | Basic+Pro; seven §7 flows; SendGrid or defer; Operator+PM sign-off | All present. Extra: `/analytics` canonical; no fabricated signatures |

Tracker statuses unchanged: 19.1 `in-progress`, 19.2 `review`, 19.3–19.5 `ready-for-dev`, epic `in-progress`.

## Production

**NO-GO.** Do not activate live Paddle. Do not deploy production.
