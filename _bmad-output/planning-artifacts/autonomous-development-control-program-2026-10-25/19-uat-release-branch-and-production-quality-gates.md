---
title: D8 UAT Branch and Clean-Lean Production Release Contract
date: 2026-10-26
status: UAT_FIRST_SEQUENCE_SELECTED_REVIEW_PENDING
implementation: NOT_AUTHORIZED
uat_cutover: NOT_AUTHORIZED
production: NO_GO
issue: 519
---

# D8 release architecture: PR and changes → UAT acceptance → protected main → owner-only Production

## 1. Product Owner direction and present evidence

The Product Owner expressly requires a distinct UAT release branch in the existing Cohestra GitHub repository, NOT another repository. Both main and release/uat must enforce security deployment guardrails and ALL required tests. Production release must additionally satisfy stricter security testing and clean, lean runtime quality standards. This is binding design intent but NOT an authorization to create branches, change workflows, create credentials, merge, deploy UAT, or touch Production.

Verified repository facts as of 2026-10-26:
- Main is a protected branch.
- .github/workflows/ci.yml currently runs on pushes and PRs to main only, with .NET, API integration, Next.js, UAT isolation, Docker smoke and GitGuardian check names.
- .github/workflows/deploy.yml currently listens to a successful completion of CI on main and automatically executes UAT with an exact SHA, as well as allowing manual workflow_dispatch. The GitHub SSH script and deploy/remote-deploy.sh default DEPLOY_BRANCH to main and verify main ancestry.
- deploy/validate-deploy-uat-workflow.sh and deploy/validate-uat-isolation.sh encode deployment safety contract checks. They must change with the workflow and cannot be bypassed.
- .github/workflows/deploy-production.yml currently allows manually dispatched deploy/rollback only, with Production Environment, 40-character SHA, repeated provenance and overlay/host checks. deploy/validate-production-provenance.sh requires trusted main ancestry, merged PR provenance, CI and GitGuardian checks. Preserve these safeguards; do not weaken Epic 46 Production NO-GO.

## 2. One-repository, UAT-FIRST release topology

**Owner clarification on 2026-10-26:** the intended sequence is **PR → changes → UAT → (if all clean) → main**. This supersedes the previous proposed main-to-release/uat promotion direction. It is a selected design direction, **not** a GitHub branch/ruleset/workflow/merge authorization.

| Stage/ref | Source | Required gate | Result |
| --- | --- | --- | --- |
| feature/task branch | Branch from approved baseline and scope | Grok 4.6/BMAD implementation, targeted unit/integration/security checks and separate code review | PR proposing changes to protected release/uat |
| protected release/uat | PR from feature branch; no direct untrusted pushes | Full pre-deployment CI/security gates on final candidate SHA, tenant/billing/auth isolation tests; immutable UAT release authorization | Deploy exact vetted SHA to isolated UAT |
| UAT acceptance | Deployed release/uat SHA and runtime artifact digest | Post-deploy smoke, browser/end-to-end, integration/security probes, acceptance evidence, 0 BLOCKER/MAJOR | ACCEPTED_UAT_RELEASE or HOLD/ROLLBACK |
| protected main | Promotion PR from the UAT-accepted release/uat branch, after acceptance | Revalidate merge result and actual resulting source tree; preserve 2-parent merge provenance, all CI/security; prove production runtime code is UAT-accepted or require UAT retest for any drift | Production-eligible commit on main, **NOT deployed** |
| Production | main-reachable merged SHA under existing provenance | All tests, extra security and measured clean/lean artifact gates; owner production Environment approval | Separate owner-only deployment, Epic 46 still NO-GO |

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

## 4. UAT-first validation, acceptance and promotion to main

1. **PR to release/uat:** a scoped agent/task branch proposes changes. Protected branch policy requires trusted PR review (Grok BMAD/CAT-SEC on exact final PR HEAD), all applicable pre-deploy unit/integration/front-end/Docker/security checks, no unresolved BLOCKER/MAJOR, and owner gates for material changes. Required checks must be passed on the SHA that is actually merged or provably unchanged-equivalent under branch protection.
2. **Controlled UAT deployment:** only vetted and authorized release/uat commits (not arbitrary branch pushes or untrusted labels) may deploy via the UAT Environment. Update `.github/workflows/deploy.yml`, SSH ref/source checks, `deploy/remote-deploy.sh`, `ci.yml` and validators so `DEPLOY_BRANCH=release/uat` is explicit and `workflow_run(main)` can never trigger UAT. Verify approved exact SHA, actor/event, release manifest and monotonic sequencing. The special semantics of `workflow_run` versus GitHub Environment branch rules must be tested; neither event nor branch protection alone is human authorization.
3. **Two-stage test interpretation:** all executable **pre-deploy** tests/security checks must pass before UAT rollout. The UAT **post-deploy** browser/smoke/end-to-end and runtime security checks necessarily run *after* UAT starts. All post-deploy required checks must pass before promotion toward main. Missing, neutral or skipped checks = HOLD, not PASS.
4. **UAT acceptance:** prove exact deployed release/uat SHA and runtime artifact digest, health, tenant isolation, auth/registration/billing/Paddle, browser/E2E and audit evidence. Failure holds acceptance, maintains or returns to last accepted UAT release and blocks main promotion; no agent may mark its own blocker waived.
5. **Promotion PR to main:** only accepted UAT release commits are eligible. PR merge preserves protected main review/test policy and two-parent provenance expected by `validate-production-provenance.sh`. Confirm every changed runtime file/artifact was UAT-tested; assert final merge-tree or runtime-artifact equivalence and rerun main SHA-specific CI, scanners and security evidence. If UAT-to-main merge introduces additional runtime changes through conflicts or differing main state, HOLD for a fresh UAT round. Main merger cannot be treated as owner Production authorization.
6. **Production handoff:** after main promotion, require enhanced security and clean/lean gates in section 5, plus a separate human owner approval for the existing Production `workflow_dispatch`. Production remains NO-GO during Epic 46.
7. **History/replay safety:** one active release, idempotent deploy/promote records, nonregressing UAT revisions, no force push, approval identity not inferred from issue comments, review invalidation on new SHA and no direct agent push to protected main.

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

The first main merge installing new UAT trigger logic is **special**: the currently active old workflow may still auto-deploy UAT on `main` CI success. It needs a separately reviewed/owner-authorized no-unintended-deploy cutover plan. A new release branch alone does not switch the old workflow off.

Implementation stages only after owner signoff:
1. Inventory existing UAT deployed SHA, release/uat initial baseline and main/release divergence; record branch and event/ruleset plan before code implementation.
2. Draft protected branch and security check rules for release/uat and main, allowing owner-controlled PR promotion without enabling unchecked bypasses or requiring a second human reviewer.
3. Update CI triggers, UAT workflow, SSH explicit release/uat source, fail-closed manual dispatch, UAT environment restrictions, on-host scripts, SHA validators and related contract tests **together**. Ensure default branch workflow_run semantics cannot make `main` CI eligible for UAT.
4. **Positive demonstration:** feature PR → pre-deploy CI/GitGuardian/BMAD security checks pass → approved UAT release → post-deploy browser/tenant/auth/billing and security acceptance passes → promotion PR to main → exact final-main-SHA CI/GitGuardian + source/artifact equivalence PASS → Production remains un-dispatched.
5. **Negative demonstrations:** simple main PR merge + green main CI produce ZERO UAT deployment; premature UAT-to-main PR before acceptance is rejected; an extra code change in main after UAT acceptance fails equivalence; skipped/missing/neutral tests HOLD; stale SHA/review, release branch drift, untrusted actor/label, malformed input, duplicate event and unauthorized ref all fail closed.
6. Preserve Production two-parent protected-main merge/provenance security, backup/restore, host isolation and manual owner approval. No UAT/Production deployment during automated negative tests.
7. Require a separate latest-HEAD Grok 4.6 BMAD architecture + code/security review with zero unresolved BLOCKER/MAJOR, and exact owner cutover authorization.

## 7. Governance and D8 impact

The owner has selected the **UAT-first** direction. This replaces earlier language saying UAT is a downstream promotion of a main commit. `main` is the protected Production release source; release/uat is the protected UAT acceptance branch. Existing Production owner-only gates and the clean/lean security requirements remain intact.

**Unresolved implementation details:** actor/ruleset/protected-PR mechanics for bidirectional release history, exact runtime/source equivalence after the UAT→main merge, authentication of release acceptance, ref selection under GitHub Actions workflow_run, cutover safety and final owner-approved scanner/budget choices. No previous issue comment or owner request authorizes changing these operational controls without review.

Tracking: Issues #517, #518, #519; draft PR #507. **Planning changes only**; no new branch, secrets, workflow, UAT, Production or main merges performed. Production NO-GO.
