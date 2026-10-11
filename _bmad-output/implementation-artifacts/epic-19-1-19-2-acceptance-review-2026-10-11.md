# BMAD code review — UAT preflight FAIL (Stripe leftovers)

**Reviewed content HEAD:** `69b50c82`  
**PR:** #438 draft. #437 stays draft at `54a98647`.  
**Model:** Grok 4.6 only. In-session Blind / Edge / Acceptance.

Stories 19.1 / 19.2 **open**. Production **NO-GO**.

## Diff

Owner 09:53 preflight: 17 passed / **1 failed** / 1 warning. Fail is leftover `Stripe__*` in droplet `.env`. Recaptcha warn expected until 19.3. Preflight now prints leftover **names** only. Compose still does not inject Stripe.

## Layer results

### Blind Hunter

| Finding | Triage |
|---------|--------|
| Treat 17 passes as preflight PASS | **Dismiss** — matrix is FAIL |
| Ask owner to paste Stripe values | **Dismiss** — names-only unset instructions |

### Edge Case Hunter

| location | trigger | guard | Triage |
|----------|---------|-------|--------|
| Stripe in running API | old compose | current `docker-compose.uat.yml` has no `Stripe__` | **Handled** |
| Empty Stripe value still fails | `[[ -n ]]` | empty string does not fail; leftover non-empty does | **Handled** |

### Acceptance Auditor

| Gate | Verdict |
|------|---------|
| Preflight recorded as FAIL | **Met** |
| 19.1/19.2 not closed | **Met** |
| No secrets in repo / no mutate | **Met** |

## Verdict

**No unresolved BLOCKER or MAJOR.** Unset Stripe names on the droplet and re-run preflight. Do not merge. Do not close 19.1.
