---
name: ADR Option B — protected release/uat + unattended UAT CD
status: accepted-target
authority: https://github.com/fad16papa/Cohestra/issues/538
date: 2026-11-02
supersedes_for_topology: architecture-uat-automation-readiness-2026-11-01 AD-1 (after cutover only)
does_not_authorize: merge, deploy, SSH, gate activation, live protection or secret changes
---

# ADR — Option B

**Owner decision (2026-11-01, Asia/Singapore): approved target architecture, not live cutover.**

One repository. Protected `release/uat` integrates owner-manifest-approved feature PRs, runs fresh post-merge tests, and is the only UAT deploy source after owner activation. Protected `main` holds Production release candidates. No automatic `release/uat` → `main`. No automatic Production.

The GitHub Environment name stays `uat`. Do not create a git branch named `uat`.

## Historical findings remain true

PR #537 audit of `main` @ `22ffe635` and Deploy UAT #451 is unchanged: the suppressor HOLDs, Environment `uat` is unrestricted, dual-review is not operational, #536 is unimplemented, post-merge testing is not a dedicated gate. Option B does not convert those FAIL/UNVERIFIED rows to PASS.

## What Option B changes after cutover

| Before (live on main) | After owner-authorized cutover |
| --- | --- |
| Deploy UAT `workflow_run` CI on `main` | `push` to `release/uat` + in-run AD-17 `needs` (AD-23). Exclusive alt: App `workflow_dispatch --ref release/uat` (AD-24). No `workflow_run` / `repository_dispatch` / `workflow_call` |
| Tip-pin `origin/main` | Tip-pin `origin/release/uat` |
| Feature PRs target `main` for UAT | Feature PRs target `release/uat` |
| Owner merges every UAT feature | Restricted auto-merge of eligible manifests only |
| Environment `uat` unrestricted | Environment `uat` allows `release/uat` only |
| `main` push can start Deploy UAT | `main` push must not start Deploy UAT |
| Assumed FF of `main` into `release/uat` | AD-25 owner sync PR; exclusive-tree match; no force-push |
| Merge with `GITHUB_TOKEN` | AD-26 App installation token so `push` starts AD-23 |

## What Option B does not change

- `UAT_DEPLOY_GATE_ACTIVE` stays `false` until the owner cutover step H.
- PR-C keeps `workflow_run.branches: [main]` and adds AD-27 inline `UAT_MAIN_DEPLOY_SUPPRESSED` before candidate checkout.
- Production: `workflow_dispatch` from `main`, `PROD_DROPLET_*`, Environment `production`, two-parent provenance, `PRODUCTION CUTOVER: AUTHORIZED`.
- PR #535 is the readiness consumer. Issue #536 is the bounded correction controller and must not merge.
- PR #505, retired ADCP, and Production NO-GO.

## Authorization

This ADR authorizes documentation and separately reviewed Draft PRs. It is not authorization to merge, deploy, SSH, set the gate, or change live GitHub protections or secrets.
