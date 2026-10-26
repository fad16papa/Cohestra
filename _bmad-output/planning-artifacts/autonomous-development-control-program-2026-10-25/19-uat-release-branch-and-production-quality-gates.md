---
title: D8 UAT Branch and Clean-Lean Production Release Contract
date: 2026-10-26
status: UAT_FIRST_SEQUENCE_SELECTED_REVIEW_PENDING
implementation: NOT_AUTHORIZED
uat_cutover: NOT_AUTHORIZED
production: NO_GO
issue: 519
---

# D8 release architecture: PR → UAT deployment and acceptance → HOLD → owner business instruction → main and Production

## 1. Product Owner direction and present evidence

The Product Owner expressly requires a distinct UAT release branch in the existing Cohestra GitHub repository, NOT another repository. Both main and release/uat must enforce security deployment guardrails and ALL required tests. Production release must additionally satisfy stricter security testing and clean, lean runtime quality standards. This is binding design intent but NOT an authorization to create branches, change workflows, create credentials, merge, deploy UAT, or touch Production.

Verified repository facts as of 2026-10-26:
- Main is a protected branch.
- .github/workflows/ci.yml currently runs on pushes and PRs to main only, with .NET, API integration, Next.js, UAT isolation, Docker smoke and GitGuardian check names.
- .github/workflows/deploy.yml currently listens to a successful completion of CI on main and automatically executes UAT with an exact SHA, as well as allowing manual workflow_dispatch. The GitHub SSH script and deploy/remote-deploy.sh default DEPLOY_BRANCH to main and verify main ancestry.
- deploy/validate-deploy-uat-workflow.sh and deploy/validate-uat-isolation.sh encode deployment safety contract checks. They must change with the workflow and cannot be bypassed.
- .github/workflows/deploy-production.yml currently allows manually dispatched deploy/rollback only, with Production Environment, 40-character SHA, repeated provenance and overlay/host checks. deploy/validate-production-provenance.sh requires trusted main ancestry, merged PR provenance, CI and GitGuardian checks. Preserve these safeguards; do not weaken Epic 46 Production NO-GO.

## 2. One-repository, UAT-FIRST release topology

**Owner clarification, October 26, 2026:** the sequence is **feature PR → changes → protected release/uat → UAT acceptance → STOP**. Even with clean tests, a UAT release does **not** automatically promote into main or Production. Only an **explicit Product Owner business instruction** for a specific UAT-accepted release can initiate separate protected-main promotion and owner-gated Production release readiness. This supersedes both prior main→UAT promotion and automatic UAT-pass→main designs. It is a selected design direction, **not** permission to create branches, merge or deploy.

| Stage/ref | Source | Required gate | Result |
| --- | --- | --- | --- |
| feature/task branch | Branch from approved task baseline | Grok 4.6/BMAD implementation and independent review; targeted tests/security checks | PR into protected release/uat |
| protected release/uat | Reviewed feature PR; not untrusted direct push | Full pre-deploy CI/security gates for accepted release SHA | Deploy approved candidate to isolated UAT |
| UAT acceptance | Exact deployed release/uat SHA, immutable manifest and artifact digest | Post-deploy smoke, browser/E2E, tenant/auth/billing/security and business-facing acceptance | UAT_ACCEPTED or UAT_REJECTED |
| **UAT HOLD (mandatory)** | UAT_ACCEPTED release | Preserve immutable candidate SHA/digest, acceptance evidence and readiness report; **no scheduled or automatic promotion** | **AWAIT_BUSINESS_RELEASE** indefinitely |
| business release instruction | Authenticated Product Owner instruction for explicit candidate/version and scope | Verify request identity, candidate still valid, no drift; reject bot labels/comments or agent self-authorization | BUSINESS_RELEASE_REQUESTED, not yet deployed |
| protected main promotion PR | Only specifically business-authorized accepted UAT snapshot | Protected review, latest main merge-tree and runtime artifact equivalence or UAT retest; exact-main-SHA CI/security; two-parent merge provenance | Production-eligible main SHA, not a deployment |
| Production release | Owner-gated exact main SHA | All tests, enhanced security and clean/lean artifact gates, separate actual Production Environment approval | Owner-authorized deploy only; Epic 46 remains NO-GO |

**Trust and history rule:** protected main remains the Product Owner's *production release source*, not a bypass route for ordinary features. Production provenance currently requires a two-parent merge commit and immutable main ancestry. Therefore the promotion PR merge may create a new main SHA unlike the SHA tested in UAT. The gate MUST compare final main merge tree/build inputs and deployable runtime artifact(s) to the UAT-accepted source/build, verify no extra untested runtime code was included, and rerun exact-main-SHA CI/security. If the integration changes runtime behavior or security-sensitive build inputs, re-run UAT acceptance or HOLD. Don't claim hash equality when histories differ; prefer digest equality when actually reproducible.

**Divergence management:** before making a new UAT candidate, check release/uat ancestry relative to main. After a promotion, an independently gated ref-alignment/sync may be required to avoid duplicate or unrelated content. Such a sync must NOT itself be treated as approval to deploy or bypass a PR rule. Block circular or untested merges, release drift, and stale PR-head reviews. The reliable architecture is a versioned release manifest and explicit state transitions, NOT a raw `push` as sole proof of authorization.

**No new repository. No automatic Production deployment. No implicit UAT deploy on main CI.**

## 3. Shared branch quality and security floor

- Both protected branches require passing trusted exact-candidate-SHA status checks with zero skipped, neutral, cancelled, stale, timed-out or missing required results.
- Existing six checks (.NET build and test; API integration tests; Next.js build; UAT isolation contract; Docker stack smoke; GitGuardian Security Checks) must not regress or disappear; add CI runs for release/uat and enforce required results for that branch.
- Include applicable story tests for auth, tenancy, registration, Paddle/billing, schema migration safety, frontend accessibility/browser, public API contracts, negative/abuse cases, runtime smoke and cross-service regressions. A test that was not run is not a PASS.
- Require security scanning as approved and installed: secret leak detection, dependency/security advisories, SAST, Docker and compose/IaC hardening, container vulnerability scanning, supply-chain licenses, and Grok 4.6 BMAD/CAT-SEC for security-sensitive architectural/implementation work. Do not claim scanners not yet installed are already enforced.
- Normalize findings and approved exceptions in a tamper-evident record linked to exact SHA, PR, tests, source build, generated artifact digest and actor. Owner must approve any new vendor, scan cost, access/egress and exception mechanism before activation.
- Unknown actor, missing approval evidence, scope drift, SHA change, uncertain classifier or inconsistent protected checks => RELEASE_HOLD.

## 4. UAT deployment, mandatory HOLD, and business-triggered Production release

1. **PR to release/uat:** scoped feature/task branch goes through independent Grok BMAD/CAT-SEC review, exact-HEAD required pre-deploy CI/security tests, no unresolved BLOCKER/MAJOR, and material architecture owner gates. Only accepted PRs may reach protected release/uat.
2. **UAT deploy:** GitHub accepts the explicitly authorized release/uat SHA, checks pre-deployment tests/security and provenance, then deploys to the isolated UAT Environment. It must never deploy to UAT because main CI succeeded. Source must be release/uat without fallback to main.
3. **Post-deploy UAT acceptance:** independently confirm release/uat SHA and artifact digest on the host, web/browser E2E and tenant/auth/billing/registration/security tests, functional and business-facing acceptance. Missing/failed/skipped required checks make UAT_ACCEPTED impossible.
4. **Mandatory no-promotion HOLD:** UAT_ACCEPTED records immutable SHA, artifact digest, signed/verified release evidence, date and acceptance verdict, and transitions **ONLY** to AWAIT_BUSINESS_RELEASE. No automatic creation of a main PR, no automatic branch synchronization, no Production workflow dispatch, no timer-based or CI-green-triggered release. The release may remain in UAT indefinitely.
5. **Business decision gate:** only an explicit, authenticated Product Owner business instruction to release a **specified UAT-accepted version** may move the state to BUSINESS_RELEASE_REQUESTED. An issue label, PR comment, bot completion, agent recommendation, or mere green checks do NOT grant this authority. The business instruction initiates a controlled release process, not a waiver of technical/security gates.
6. **Snapshot promotion when requested:** build a main promotion PR from the **selected immutable UAT-accepted candidate**, not blindly the mutable current release/uat tip (which may include later unreleased changes). Prevent release drift. Verify actual protected main merge result against accepted UAT source/runtime digest. If main changed or conflicts introduce non-UAT-tested runtime code, require new UAT acceptance or HOLD; preserve two-parent main provenance. Rerun exact-main-SHA CI/security and independent Grok checks.
7. **Separate production go/no-go:** the owner still authorizes the exact Production deployment via the `production` Environment after all enhanced vulnerability/security, clean/lean artifact, host, backup/rollback and billing gates pass. A business instruction alone must not bypass the release security checklist; Production Epic 46 remains NO-GO until explicitly cleared.
8. **Release independence:** additional changes may progress through UAT without changing the original accepted version. Every Production request names an immutable candidate; maintain a versioned ledger of released/held/retired UAT versions. Reject stale approvals, replay, unintended newer changes and automated bulk promotion.

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

## 6. Controlled cutover and end-to-end test contract

The first main merge installing the new UAT trigger is exceptional: the OLD deploy.yml may still auto-deploy UAT on its own CI-success event. Owner-authorized safe transition and live event validation are required. A release branch alone does not stop the current workflow.

Implementation stages only AFTER separately approved architecture, credentials and release cutover:
1. Inventory live UAT SHA, main provenance, and initial release/uat baseline. Establish protected UAT and main PR branch rules and authenticated release decision ledger without creating any second GitHub repository.
2. Update CI, deploy.yml, on-host remote-deploy.sh, explicit release/uat checkout, required tests, environment checks and validators atomically under latest-HEAD independent Grok review. Existing UAT isolation, tenant smoke and Production SHA provenance must not regress.
3. **Positive UAT demonstration:** feature PR → release/uat → required pre-deploy CI and security PASS → UAT deploy → browser/security/business acceptance PASS → AWAIT_BUSINESS_RELEASE. **Verify that the main branch and Production do not change**, including after waiting or additional CI events.
4. **Business-authorized Production demonstration in a non-deploying test harness:** trusted owner instruction explicitly selects one UAT acceptance ledger version → valid protected main PR and exact-main-SHA tests/security/provenance → release marked eligible → owner Production Environment approval still required. Do not actually trigger live Production in the test.
5. **Negative demonstrations:** green UAT and UAT_ACCEPTED without business instruction never opens main promotion PR nor deploys Production; an auto-generated bot/comment or stale/forged business request cannot promote; asking to release an older candidate must not silently include later UAT features; additional code on main forces equivalence recheck/UAT replay where necessary; skipped/missing required checks, wrong ref, drift, replay and duplicate runs fail closed.
6. **Main independence:** normal main CI/PR success causes ZERO UAT deploys after cutover. Preserve existing Production manual-only workflow, two-parent provenance and GitGuardian.
7. Final architecture/BMAD/CAT-SEC independent Grok review on latest HEAD, zero unresolved BLOCKER/MAJOR, documented owner approval of release source rules and cutover. No credentials, droplet or production changes in planning work.

## 7. Governance and D8 impact

**Latest owner-selected release contract:** PR → protected release/uat → UAT tests and acceptance → **STOP/HOLD indefinitely** → ONLY on authenticated business instruction for an exact accepted version, promotion PR to protected main → enhanced security/clean-lean Production gate → explicit owner Production deploy. All previous wording implying automatic UAT-pass-to-main or main-pass-to-UAT is superseded.

D8 still must resolve immutable release snapshot storage/selection, replay-safe business instruction identity (not mutable issue/PR text), actual merge artifact equivalence, branch/CI/deployment workflow provenance, safe legacy main-CI-to-UAT cutover and owner-approved scanning/artifact budgets.

Tracking: Issues #517, #518, #519; draft PR #507. **Planning only**; no new branch, workflow changes, credentials, merges, UAT or Production deployments. Production NO-GO.
