# BMAD code review — PR #437 Epic 19 reconciliation

**Reviewed docs content HEAD:** `66e798fb` vs `origin/main` `f293650d`  
**This artifact** is the last intended file on the PR. Independent Grok review of that content plus this note.  
**PR:** #437 (draft)  
**Model:** Grok 4.6 only. Layers run in this session (same model; no Composer / no other models / Auto off).  
**Skills:** `bmad-code-review` (in-session layers — no cross-model agents); Blind Hunter (`bmad-review-adversarial-general`); Edge Case Hunter (`bmad-review-edge-case-hunter`); Acceptance Auditor vs `epics-cohestra-enterprise.md` Epic 19; `bmad-investigate` evidence grades on TLS; `bmad-testarch-nfr` for header/TLS gates.

Mandatory loop applies. This is a **docs/tracker** change. No product code. Stories 19.1–19.5 are **not** closed.

## Diff scope

10 files under `_bmad-output/implementation-artifacts/` after this review is committed. No `src/`, `web/`, `deploy/` executable changes.

Reconfirmed 2026-10-10 16:48 UTC: 19.4 blockers 1–7 are one continuous numbered list (no heading between 1 and 2). Tracker statuses unchanged. Isolation `51/0`. Public probe unchanged (UAT wildcard valid; existing leaf expired 2026-10-01).

## Layer results

### Blind Hunter

| Finding | Triage |
|---------|--------|
| Item 1 still opens with “merge PR #404” | **Dismiss** — October 8 wording preserved; same sentence records merge SHA `69814fc3` |
| Tracker still contains “MERGE READY, not merged” | **Dismiss** — labeled historical 2026-10-08 |
| Matrix “PASS (infra probe)” could be misread as 19.1 done | **Dismiss** — row says not SHA-proven; “Do not close 19.1” |
| Recovery playbook is runnable and dangerous if mis-copied | **Dismiss** — STOP until owner authorizes; `--cert-name` locked; refuse UAT names |

### Edge Case Hunter

| location | trigger | guard | consequence | Triage |
|----------|---------|-------|-------------|--------|
| `live/` cert names | lineage not named `thesocialcollectivesg.com` | inspect `live/` + stop if collapsed with UAT | wrong `--cert-name` | **Handled** in recovery doc |
| `--keep-until-expiring` on expired cert | already expired | certonly webroot for that name | renew still required | **Handled** (expired leaf is the reason to run) |
| `verify-existing-app.sh` | expired TLS | `curl -fsS` fails closed | script FAIL until renew | **Defer** — pre-existing; no notAfter print |
| `remote-deploy.sh` | uncommitted droplet edits | `git reset --hard origin/main` | local droplet edits lost | **Defer** — pre-existing deploy contract |

### Acceptance Auditor

| Planning AC | Story / recon | Verdict |
|-------------|----------------|---------|
| 19.3 keys, `NEXT_PUBLIC_*`, rebuild, widget, signup+OTP, §3 | `19-3-recaptcha-production-enablement.md` | **Met** (plus invalid token / rate limit / no UAT bypass) |
| 19.5 Basic+Pro, seven flows, SendGrid, Operator+PM | `19-5-operator-core-flows-launch-signoff.md` | **Met** |
| Do not mark 19.1–19.5 done | tracker statuses unchanged | **Met** |
| Preserve Oct 8 evidence | comments + execution file untouched | **Met** |
| No false PASS / no prod GO | matrix + recon | **Met** |

## Verdict

**No unresolved BLOCKER or MAJOR.** Docs PR is merge-ready after required CI on this HEAD.  
**Do not merge without owner authorization.**  
**Do not treat CI green as 19.1/19.2 close or production GO.**

Local check: `bash deploy/validate-uat-isolation.sh` — 51 passed, 0 failed (unchanged deploy tree).
