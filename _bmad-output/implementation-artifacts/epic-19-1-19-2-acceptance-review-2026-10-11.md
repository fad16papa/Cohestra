# BMAD code review — Stories 19.1 / 19.2 acceptance evidence

**Reviewed HEAD:** `99002bc0` vs `origin/main` `f293650d`  
**Model:** Grok 4.6 only. In-session Blind / Edge / Acceptance layers. No Composer / Auto / other models.  
**Skills:** `bmad-code-review`, `bmad-review-adversarial-general`, `bmad-review-edge-case-hunter`.

Mandatory loop applies. Stories 19.1 and 19.2 are **not** closed. Production **NO-GO**. PR #437 stays draft and is not this change.

## Diff scope

8 files: story addenda, tracker comments (statuses unchanged), three evidence/design notes, read-only `prove-zz-vhost-persist.sh`, isolation contract +1. No API/web product code. No timer installed. No nginx/cert mutation.

Local: `bash deploy/validate-uat-isolation.sh` — 52 passed, 0 failed.

## Layer results

### Blind Hunter

| Finding | Triage |
|---------|--------|
| 19.2 checklist all `[x]` could be read as story done | **Dismiss** — same section says tracker stays review / not done; zz bind BLOCKED |
| Owner 10/0 / 6/0 / 9/0 not pasted verbatim | **Dismiss** — attributed; counts match script contracts; public probe independent |
| Truncated image IDs in 19.1 addendum | **Dismiss** — full sha256 in evidence file |

### Edge Case Hunter

| location | trigger | guard | Triage |
|----------|---------|-------|--------|
| `prove-zz-vhost-persist.sh` | CONTAINER_ONLY | exit 0 + CONDITIONAL | **Handled** — missing vhost exits 1; BIND exits 0 PASS |
| Timer playbook | operator omits `--cert-name` | docs refuse UAT names; do not install | **Handled** |
| `renew --quiet` | failed hook | nginx -t before reload | **Handled** |
| Image IDs | treated as source SHA | evidence says provenance BLOCKED | **Handled** |

### Acceptance Auditor

| Planning AC | This PR | Verdict |
|-------------|---------|---------|
| 19.1 isolate + smoke + seeds + DNS | smoke/seeds/DNS/SHA attributed or public | **Partial** — firewall BLOCKED |
| 19.1 close | statuses unchanged | **Met** (not closed) |
| 19.2 headers + HSTS + HTTP redirect | public + owner | **Met** (shared-edge `zz` + reload, not `active-ssl` recreate) |
| 19.2 close | zz persist BLOCKED | **Met** (not closed) |
| No false PASS / no prod GO | matrices | **Met** |

## Verdict

**No unresolved BLOCKER or MAJOR.**  
Docs + read-only prove script are merge-ready after required CI on this HEAD.  
**Do not merge without owner authorization.**  
**Do not treat merge or CI green as 19.1/19.2 close.**
