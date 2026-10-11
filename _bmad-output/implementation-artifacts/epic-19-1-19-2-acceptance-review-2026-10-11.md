# BMAD code review — 19.1/19.2 gate plans + OCI labels

**Reviewed content HEAD:** `15e81ea5` vs previous `e525103c` (base `origin/main` `f293650d`)  
**PR:** #438 (draft). #437 stays draft at `54a98647` (CI SUCCESS `38069185578`).  
**Model:** Grok 4.6 only. In-session Blind / Edge / Acceptance. No other models.

Stories 19.1 and 19.2 are **not** closed. Production **NO-GO**. Timer **not** installed. No nginx recreate. No merge.

## Diff (this iteration)

OCI `revision` LABEL + compose build args; migration ID compare (49 expected); zz bind execution plan (`aliases=[]`); first-operator walk (not executed); timer auth/rollback/alerts; PR sequencing. Isolation **59/0**. Renew mocked **6/0**. Compare self-test **3/0**.

## Layer results

### Blind Hunter

| Finding | Triage |
|---------|--------|
| Empty `GIT_SHA` → empty OCI label | **Dismiss** — documented; next rebuild must export SHA |
| Count 50 previously called PASS | **Fixed** — now PARTIAL / ID-COMPARE BLOCKED |
| Bind plan could be run as “the next step” | **Dismiss** — first line forbids run without owner auth |
| Public 22/80/443 open treated as firewall AC | **Dismiss** — matrix still BLOCKED for DO rule list |

### Edge Case Hunter

| location | trigger | guard | Triage |
|----------|---------|-------|--------|
| Extra history ID ≠ orphan | unmerged UAT apply | compare script prints unknown extra; no delete | **Handled** |
| Orphan row + re-run folded AddColumn | already applied FormTemplates | owner column check required before any history edit | **Handled** |
| Existing nginx `aliases=[]` overwritten | copy-paste old YAML with `cohestra-uat-nginx` | plan + persistence doc keep empty aliases | **Handled** |
| Certbot Docker socket | deploy-hook | still absent; host fingerprint + exec | **Handled** |
| First-operator on UAT | walk executed here | prepared only; isolated mailbox; no secrets | **Handled** |
| #437/#438 story overlap | merge #438 first | sequencing: #437 first, then rebase | **Handled** |

### Acceptance Auditor

| Gate | Verdict |
|------|---------|
| 19.1 close | **Met** (not closed; DO firewall, migration IDs, first-operator, preflight, live OCI still open) |
| 19.2 close | **Met** (not closed; EXPORT_ONLY observed not accepted; BIND not authorized; timer not operational) |
| Isolation 59/0 + renew 6/0 | **Met** (local) |
| No merge / no nginx mutate / no timer install / no prod | **Met** |

## Verdict

**No unresolved BLOCKER or MAJOR.**  
**Do not merge #437 or #438 without explicit owner authorization.**  
**Do not treat this HEAD as 19.1/19.2 close.**
