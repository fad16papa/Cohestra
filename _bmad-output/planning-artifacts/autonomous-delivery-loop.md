# Cohestra autonomous BMAD delivery loop

Status: **ACTIVE** for non-production / UAT. Production remains **NO-GO**.

Control plane: Grok 4.6. Composer 2.5 is light-only. Auto is disabled.

## Loop

```
sprint-status
  → next ready story
  → create/validate story
  → implement
  → build / contract tests
  → exact-HEAD Grok 4.6 review
  → fix BLOCKER/MAJOR on the new HEAD
  → exact-head CI green
  → autonomous merge (approved policy)
  → Deploy UAT (workflow_run of accepted main SHA)
  → acceptance-summary.json + detailed artifacts
  → investigate / repair / redeploy
  → close story
  → next
```

Do not ask the owner to SSH for routine UAT. Do not treat test failures, type errors, container health, browser regressions, or review MAJOR findings as owner gates.

## Owner gates (stop and name the gate)

- missing protected secret **NAME** (`MISSING_SECRET=<NAME>`)
- new external-service credentials
- production / live cutover
- live Paddle / live money
- production DNS / TLS / customer data
- privilege expansion
- ambiguous material product decision

## Merge

Follow `_bmad-output/planning-artifacts/autonomous-merge-policy.md` (**APPROVED**). Production/live cutover stays owner-authorized.

## Evidence

Story close uses `acceptance-summary.json` plus referenced artifacts. Missing required sections are FAIL, never a fake PASS.
