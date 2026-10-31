# UAT TDD-gated promotion — implementation evidence

**Branch:** `cursor/tdd-uat-gated-deploy-a5ee`  
**Base:** `origin/main` at `e962c8c3eead953a1f56f2b397b3e9d4fc669041`  
**Policy:** PR #505 comment `6547127330` (1 Nov 2026)  
**ADCP:** not restored  
**Production:** untouched  
**Live activation:** not performed  
**Independent review:** Grok 4.6 High Fast BMAD + CAT-SEC PASS on `0e17a92f` (BLOCKER=0 MAJOR=0, 1 MINOR on grep fail-open). Follow-up HEAD closes that MINOR and requires GitGuardian on the exact deploy SHA.

## TDD loop

1. Added failing fixtures in `deploy/validate-uat-predeploy-gate.test.sh` and
   `deploy/validate-uat-gate-activation.test.sh` covering every required gate.
2. Implemented the smallest fail-closed verifier:
   `deploy/validate-uat-predeploy-gate.sh` + `deploy/lib/uat-predeploy-gate.py`.
3. Wired `.github/workflows/deploy.yml` so SSH cannot start unless the gate
   marks `eligible=true`, then revalidates immediately before SSH.
4. Kept public smoke, Playwright, lifecycle, and acceptance-summary.

## Required checks (exact candidate SHA)

- `.NET build and test`
- `API integration tests`
- `Next.js build`
- `UAT isolation contract`
- `Docker stack smoke`
- `Exact-SHA security scan` (Actions job on the exact checkout)
- `GitGuardian Security Checks` on the **exact candidate SHA**
  (`app.slug=gitguardian`, `filter=all`, `conclusion=success` only).
  Two-parent merges **also** require GitGuardian SUCCESS on `${sha}^2`.
  PR-head SUCCESS alone is HOLD.

`neutral`, `skipped`, missing, pending, wrong app, or conflicting duplicates
are HOLD.

## First-merge suppressor

`vars.UAT_DEPLOY_GATE_ACTIVE` must be exactly `true`. This PR does not set it.
See `docs/deploy/uat-gated-promotion.md`. Do not activate, deploy, or disable
live workflows from this change.
