---
title: D8 UAT Branch and Clean-Lean Production Release Contract
date: 2026-10-26
status: OWNER_DIRECTION_SELECTED_REVIEW_PENDING
implementation: NOT_AUTHORIZED
uat_cutover: NOT_AUTHORIZED
production: NO_GO
issue: 519
---

# D8 release architecture: one repo, protected main and release/uat

## 1. Product Owner direction and present evidence

The Product Owner expressly requires a distinct UAT release branch in the existing Cohestra GitHub repository, NOT another repository. Both main and release/uat must enforce security deployment guardrails and ALL required tests. Production release must additionally satisfy stricter security testing and clean, lean runtime quality standards. This is binding design intent but NOT an authorization to create branches, change workflows, create credentials, merge, deploy UAT, or touch Production.

Verified repository facts as of 2026-10-26:
- Main is a protected branch.
- .github/workflows/ci.yml currently runs on pushes and PRs to main only, with .NET, API integration, Next.js, UAT isolation, Docker smoke and GitGuardian check names.
- .github/workflows/deploy.yml currently listens to a successful completion of CI on main and automatically executes UAT with an exact SHA, as well as allowing manual workflow_dispatch. The GitHub SSH script and deploy/remote-deploy.sh default DEPLOY_BRANCH to main and verify main ancestry.
- deploy/validate-deploy-uat-workflow.sh and deploy/validate-uat-isolation.sh encode deployment safety contract checks. They must change with the workflow and cannot be bypassed.
- .github/workflows/deploy-production.yml currently allows manually dispatched deploy/rollback only, with Production Environment, 40-character SHA, repeated provenance and overlay/host checks. deploy/validate-production-provenance.sh requires trusted main ancestry, merged PR provenance, CI and GitGuardian checks. Preserve these safeguards; do not weaken Epic 46 Production NO-GO.

## 2. One-repository branch and release topology

| Branch | Authority | Trigger | Deployment |
| --- | --- | --- | --- |
| main | Protected engineering integration and source of Production provenance | PR/merge with required CI and security checks | NO automatic UAT or Production from main CI |
| release/uat | Protected UAT release reference; updates only by authorized promotion of a SHA already reachable from main | Trusted promotion after exact-SHA tests, security validation and approval | UAT may deploy accepted promoted SHA after independent release gates |
| Production release | No separate release/prod branch proposed; exact SHA reachable from protected main | Separate human owner-authorized Production workflow_dispatch | Production only following ALL required tests, enhanced security, clean-lean evidence and Epic 46 gates |

A normal green main CI must never implicitly deploy UAT after the cutover. Prefer fast-forward-only promotion of an approved main commit to release/uat, retaining exactly the same code SHA. If fast-forward conflicts with PR-only branch protection, resolve through a separately owner-approved narrowly scoped promotion mechanism, NOT a general bot bypass or force push. A release-only merge commit that changes the tested artifact is forbidden.

## 3. Shared branch quality and security floor

- Both protected branches require passing trusted exact-candidate-SHA status checks with zero skipped, neutral, cancelled, stale, timed-out or missing required results.
- Existing six checks (.NET build and test; API integration tests; Next.js build; UAT isolation contract; Docker stack smoke; GitGuardian Security Checks) must not regress or disappear; add CI runs for release/uat and enforce required results for that branch.
- Include applicable story tests for auth, tenancy, registration, Paddle/billing, schema migration safety, frontend accessibility/browser, public API contracts, negative/abuse cases, runtime smoke and cross-service regressions. A test that was not run is not a PASS.
- Require security scanning as approved and installed: secret leak detection, dependency/security advisories, SAST, Docker and compose/IaC hardening, container vulnerability scanning, supply-chain licenses, and Grok 4.6 BMAD/CAT-SEC for security-sensitive architectural/implementation work. Do not claim scanners not yet installed are already enforced.
- Normalize findings and approved exceptions in a tamper-evident record linked to exact SHA, PR, tests, source build, generated artifact digest and actor. Owner must approve any new vendor, scan cost, access/egress and exception mechanism before activation.
- Unknown actor, missing approval evidence, scope drift, SHA change, uncertain classifier or inconsistent protected checks => RELEASE_HOLD.

## 4. UAT promotion and deploy safety

1. Select an exact previously tested main SHA and validate protection rules, main ancestry, all required tests and security checks on that SHA.
2. Prove the requested release/uat ref update is from a trusted promotion action, fast-forward-only, current release monotonic, atomic/idempotent and replay resistant. GitHub issue comments, labels and task-authored impact fields alone are not owner approvals.
3. Require release/uat CI/security validations to finish with applicable success on the same SHA before runtime deployment.
4. Change deploy.yml so that a CI success on main cannot deploy UAT, and require a verified promotion SHA, release/uat provenance and accepted event for any new deploy. Do not silently trust any push by itself.
5. Require DEPLOY_BRANCH=release/uat explicitly both in GitHub SSH execution and on-host remote-deploy.sh. No implicit main fallback. Verify deployed SHA exactly against authorized release/uat revision.
6. Harden UAT Environment rules and workflow_dispatch actor/ref/SHA checking. Note: a GitHub workflow_run downstream workflow is defined on default branch and its GitHub ref can differ from the upstream release/uat ref. Do not rely on Environment branch allowlisting by itself with workflow_run; empirically verify event semantics and choose a compatible promotion-dispatch pattern.
7. Preserve existing isolated Cohestra UAT Docker project, locked networks/secrets, HTTPS and tenant smoke, Playwright and lifecycle tests, post-deploy SHA proof, artifacts and rollback to last accepted release.
8. Failure or uncertainty preserves currently running UAT. Repeated promotion events must not cause duplicate deploys. A manual dispatch on main, a non-main SHA, a skipped check or untrusted label must be refused.

## 5. Production hardening in addition to the shared baseline

Production release is OWNER ONLY and remains NO-GO pending Epic 46. It must require:

- Every applicable CI and security check successful and current on the exact main-reachable deploy SHA, including GitGuardian, required Grok 4.6 independent exact-HEAD BMAD/CAT-SEC review where applicable, and zero unresolved review BLOCKER/MAJOR.
- SAST, dependency and container scanning evidence, SBOM, licenses, build provenance and signed/verified digest identity where feasible and owner-approved. Target no unresolved Critical or High vulnerabilities except an explicit independently approved time-limited waiver with compensating controls. Do not allow automated agents to waive their own defects.
- Verified Production security readiness: credentials separated from UAT, no exposed PostgreSQL/Redis/API ports, no test bypass/debug flags, restricted host SSH/firewall and least privileges, validation of TLS and tenant/auth/payment/webhook controls, immutable acceptance evidence, safe migration/backups/rollback and post-deployment checks.
- Functional validation of the same source and equivalent runtime artifact previously exercised in UAT, or documented and security-tested build/environment differences. Passing UAT does not authorize Production.
- A clean build: multi-stage runtime-only images; exclude development dependencies, test fixtures, source maps if unsafe, test accounts, local environment files, debug tools, credentials and unused assets. Test these exclusions.
- A lean runtime: minimal dependencies, layers, services, published ports, writable mounts and privileges; non-root/read-only/drop-capabilities where compatibility is independently proven. Minimize startup/memory/disk and use stable health/resource limits.
- Measured immutable artifact budgets: collect baseline sizes/layers/packages/SBOM, memory/CPU/startup metrics and digest inventory; introduce numerical growth thresholds only after baseline and owner acceptance. Unexplained release bloat => OWNER_GATE, not silently deploy.
- Required Production owner Environment approval, deployment provenance and SHA verification just before SSH, and retained manual deploy/rollback route. No autonomous Production promotion.

## 6. Exact migration and test contract

This cutover has an unavoidable special hazard: the currently deployed workflow can still see the main CI success from the merge that replaces it. Mitigation must be explicitly designed, reviewed, tested and owner-approved before that merge. A separate branch alone does NOT remove this hazard.

Implementation sequence only AFTER owner approves design/permissions:
1. Record current actual UAT deployed SHA; verify its main ancestry and whether fast-forward release/uat initialization is safe.
2. Define exact branch protections, required-status checks, UAT Environment dispatch rules and narrowly privileged owner-authenticated promotion operation. No rule relaxation without owner gate.
3. Implement CI(main + release/uat), UAT promoted-SHA-only workflow, GitHub SSH DEPLOY_BRANCH, on-host remote-deploy.sh, and all existing deployment validators coherently; retain SHA pinning.
4. Add negative tests for main CI never deploying UAT, wrong ref/manual dispatch, unauthorized label, bot actor, missing/failed/neutral status, stale SHA, divergence/non-fast-forward, unknown secrets, race/replay and malformed input.
5. Validate positive path: authorized main SHA fast-forward to release/uat, successful full tests/security, exactly one UAT deployment of the accepted digest/SHA, tenant/browser/smoke acceptance and auditable rollback.
6. Validate Production regression: manual owner only, exact merge-provenance main SHA, six required checks plus new security/clean/lean quality gates, no UAT secrets or resources and no Production deployment during test.
7. Run independent Grok 4.6 code/security review on actual latest SHA, clear BLOCKER/MAJOR; specific owner cutover and main-merge/UAT-impact approval.

## 7. Governance and D8 impact

Owner-selected direction: SINGLE repo + protected main + protected release/uat, shared all-test security floor and elevated secure clean/lean Production quality. These requirements must be integrated into D8 and the [ADCP v1 controller] design because main must be free to accept reviewed changes without automatically redeploying UAT.

Open material architecture decisions: implementable fast-forward authority under branch protection; exact trustworthy release promotion and event/Environment gate; cutover procedure without unintended old-workflow UAT deployment; concrete new scanner vendors/thresholds and artifact budget; Production Epic 46 deployment gating and additional checks. No prior owner approval of a topology translates into permission to change workflows or release.

Tracking: GitHub Issues #517 and #519; pending independent D8 architecture review #518; proposed ADCP planning PR #507. Production NO-GO.
