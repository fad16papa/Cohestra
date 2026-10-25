# ADCP one-time Cursor API review bootstrap exception

**Date:** 2026-10-26 (Asia/Singapore)  
**Classification:** SECURITY DESIGN PROPOSAL, not an adopted ADR  
**Owner authorization so far:** APPROVED TO **PREPARE THE EXCEPTION PACKET ONLY**  
**Credential / launch / workflow merge / UAT / Production authorization:** **NONE**  
**Branch:** isolated draft PR #513 `cursor/adcp-bridge-contract-mock-20261025`  
**Related:** [Issue #515](https://github.com/fad16papa/Cohestra/issues/515), [#514](https://github.com/fad16papa/Cohestra/issues/514), [#512](https://github.com/fad16papa/Cohestra/issues/512), planning [PR #507](https://github.com/fad16papa/Cohestra/pull/507)

## 1. The exact problem and the narrowly proposed exception

The ADCP architecture requires an **independent selected-Grok 4.6 BMAD/security review** before final D8 architecture adoption. The production-grade automatic GitHub→Cursor dispatcher likewise requires D8 signoff and a credentialed, protected workflow. That is a bootstrap dependency, but it is **not** permission to waive the technical review.

**Proposed exceptional scope:** Once *separately authorized*, permit installation and operation of **one, human-approved, narrowly bounded GitHub Actions→Cursor API review job** even though the final D8 ADR is not yet adopted, solely to obtain technical evidence for the pending D8/dispatcher reviews. This is **not a general waiver of D8**, not feature implementation, not a privileged agent, not CI acceptance/merge authority, and not an unattended automation program.

The owner stated "ok approved lets proceed" after being asked **only** to *prepare a narrowly scoped, review-only Cursor API bootstrap exception for authorization, with no credential creation, merge, or deployment until exact controls are signed off*. Record **DESIGN PACKET PREPARATION APPROVED**, **EXCEPTION EXECUTION UNAPPROVED**. Do not treat this document's commit or any issue comment as a verified human authorization to launch.

## 2. Exact target and evidence ceiling

At preparation time, independently queried GitHub:
- **Planning PR #507** current head `8f11699d13c0dd0238d5009141908a18c6a926b3`; D18-B2's older-head Grok review was **REVIEW_FINDINGS**, not PASS. R1 corrections remain ChatGPT-authored candidates.
- **Dispatcher mock PR #513** source head before this packet `1f25a5cc60857ca81ec984197af8f02bf095c649`; 24/24 Node test cases passed previously, but additional **Composer 2.5 classifier false negatives** were found for `AuthController.cs`, `TenantResolver.cs`, `PaddleWebhookHandler.ts`, `UserAuthorizationService.cs`, `SecretManager.cs` when task-controlled impact booleans are false. Repro: [PR #513 security finding](https://github.com/fad16papa/Cohestra/pull/513#issuecomment-6400137167).
- Both PRs remain **DRAFT / UNMERGED**. All six GitHub CI/security checks were `completed/success` on their respective **pre-packet** SHAs. This packet changes PR #513's HEAD; check that new SHA separately and treat earlier CI as stale.
- `main` SHA `e962c8c3eead953a1f56f2b397b3e9d4fc669041` is **protected=true** via GitHub API. Owner created/saved GitHub Environment `adcp`: `fad16papa` required reviewer, prevent-self-review OFF, branch `main` only, no initial secrets (owner-attested via screenshots and save; connected app cannot read Environment admin API).
- There is **no trusted ADCP GitHub Actions launch workflow, no authenticated Cursor model inventory, no Cursor API key**, and no verified independent Grok review on these newest commits.

## 3. Credential feasibility gate: do not assume Enterprise entitlements

According to the current official Cursor documentation (verified 2026-10-26):
- Cloud Agents API v1 is **public beta**, supports **user API keys** and **service-account API keys**, and `GET /v1/models` supplies the actual `model.id` for `POST /v1/agents`.
- **Service accounts require Cursor Enterprise**. Their GitHub integration must be **team-level**; a personal GitHub connection alone does not make a service account capable of launching agents. Do **not** presume the owner's account can create a service account or has Enterprise.
- If Enterprise/team integration is available, evaluate a **dedicated repo-restricted service-account key**, verify actual repository permissions and an owner-selected spending limit. "Repo-restricted" must be enforced in the provider, not merely claimed in the request.
- If Enterprise service accounts are unavailable, a **user API key** is technically supported by Cursor's API, but may inherit **broader personal repository capabilities and a weaker lifecycle/isolation boundary**. This is **a different security posture** requiring fresh, explicit owner acceptance of the personal-key risk and separate revocation instructions. NEVER silently substitute a personal token for the promised dedicated service identity.
- All options require API entitlement and actual ability to access exactly `fad16papa/Cohestra`. Verify through Cursor Dashboard / authenticated read-only metadata **after** owner separately authorizes creating the key; do not demand the key value in ChatGPT.

Reference: https://prod.cursor.com/docs/cloud-agent/api/endpoints and https://prod.cursor.com/docs/account/enterprise/service-accounts

## 4. Proposed protected bootstrap workflow (NOT IMPLEMENTED)

A proposed standalone `.github/workflows/adcp-bootstrap-review.yml` on **protected main**:

1. **Trigger:** `workflow_dispatch` only. Input `review_request_id` must select exactly ONE owner-approved, immutable **trusted** review manifest. Refuse issue/PR comments, labels, `@cursor`, arbitrary branch text, or an `ownerApproved` field as authorizations. Owner enters the review request and explicitly approves access in GitHub UI. An allowlisted `github.actor` alone is insufficient because apps can act on behalf of an account.
2. **Trusted preflight job (no secrets):** `permissions: { contents: read, pull-requests: read, checks: read, actions: read }` as narrowly supported; verify the workflow `github.ref=refs/heads/main`, SHA belongs to reviewed protected main, manifest is from the trusted main workflow snapshot, both target PR head SHAs/base/state match the manifest, repository equals `fad16papa/Cohestra`, signed scope is `REVIEW_ONLY`, required exact-success checks have matching source apps and last-reviewed SHA. If anything mismatches, **HOLD** before any secret job. Do not use untrusted PR text/code as executable input.
3. **Approval + credential job:** `environment: adcp` (owner `fad16papa` review required). Token permissions default to none globally, then only specific needed read scopes for the credentialed job. **No `contents: write`, `id-token: write`, `actions: write`, deployment privileges, admin settings, or `production`/`uat` secrets. No `pull_request_target`. Checkout only protected main workflow/dispatcher code with `persist-credentials: false`; do not run PR-controlled scripts in the secret-bearing job. Ensure job logs mask credentials, and no debug logs or untrusted shell interpolation.
4. **Cursor preflight (after separately authorized secret creation):** authenticate read-only `GET /v1/me`, then `GET /v1/models`; require actual available **Grok 4.6 High Fast** ID mapped by a **human-reviewed, explicit equality rule**, not substring or Auto; if absent, STOP. Do not silently fall back to Composer. Check actual account repository access and scope (without automatically broadening provider permissions).
5. **Bounded single API create:** `POST /v1/agents` with `model: {id: <VERIFIED_MODEL_ID>}`; repo URL **literal** `https://github.com/fad16papa/Cohestra`, `repos[0].startingRef` an EXACT trusted reviewed SHA, `workOnCurrentBranch: false`, `autoCreatePR: false`, and `agentId: bc-<single preassigned UUID>` as the idempotency key, no `envVars`, extra repos, shell/MCP credentials, auto deploy, open-ended subagents, or follow-up/steer. `mode` must be explicitly reviewed; `plan` is not a guarantee that the installed BMAD review steps can run, while `agent` is not a write sandbox. **No actual POST before owner approval.**
6. **Review work request:** one immutable manifest records **two** review targets (PR #507 planning AR/ECH/IR/CAT-SEC and PR #513 code CAT-SEC/`bmad-code-review`) with separate exact SHAs and repo paths. An agent can start from one immutable SHA and inspect the other only by a separately verified read-only checkout/fetch; **do not claim that Cursor `repos[].startingRef` pins BOTH refs**. If safe two-ref inspection cannot be demonstrated, scope the first bootstrap to **only PR #513** and defer #507 to a separately approved follow-up. Stop on drift and preserve independent evidence for each reviewed SHA.
7. **Poll + bounded state:** `GET /v1/agents/{id}` and `GET /v1/agents/{id}/runs/{runId}` until a terminal documented status (`FINISHED`, `ERROR`, `CANCELLED`, `EXPIRED`). No new runs or steer; timeouts require a deliberate cancellation/archival strategy **verified against available API semantics** before live use. Do not retry ambiguous network POSTs unless the deterministic `agentId` conflict/lookup proves no duplicate. Respect `429` retry headers/bounds, pagination if used, and usage/currency limits.
8. **Sanitized report job (no Cursor key):** record owner approval event evidence, GitHub workflow run URL/id, immutable manifests and reviewed SHAs, requested/selected primary Grok model evidence, `INTERNAL_HELPER_MODELS_NOT_ATTESTED` when unavailable, Cursor agent/run URLs and statuses, actual BMAD skill execution, severity, exact-head CI/GitGuardian, any branch mutation and all unfulfilled gates. Do not present `FINISHED` as a passed code/security review. If issue comments are denied, publish the safe report to an authorized, auditable alternative rather than expanding the Cursor App's permission.
9. **Close after one run:** prevent a second bootstrap launch by a trusted one-use state marker and controller concurrency lock; fail closed if lock/state cannot be verified. Owner revokes/rotates temporary key and removes its GitHub Environment secret after pilot. Preserve audit evidence, not credentials.

**Critical limitation:** Cursor Cloud Agent API `workOnCurrentBranch=false` and `autoCreatePR=false` reduce risk but **do not guarantee filesystem/repository read-only execution**. Cursor Cloud Agents can clone and push separate branches and require repository permissions. Until the provider or integration can enforce genuinely read-only GitHub access, the exceptional run is **review-only by authorized task intent, NOT guaranteed read-only by technical sandbox**. We must either (a) explicitly obtain informed owner acceptance of that bounded branch-write risk with independent branch/permission audit, or (b) STOP and use a different verified read-only execution context. Never certify a hard read-only boundary on natural-language instructions.

## 5. Strict one-run budget and fail-closed invariants

- Single authorized task, one Cursor agent, **one initial run**. No steer, follow-up, child-agent fanout or automatic second launch.
- Duration/time upper bound, polling interval, retry budget, spending cap and secret expiry must be filled with **explicit owner-approved numeric values** before enablement; do not invent a monetary cap or promise that software timeout prevents provider billing without verifying cancellation.
- No `main` write by dispatcher, no PR auto-merge, no workflow/environment/ruleset edit by Cursor, no UAT/Production dispatch, no API keys/credentials in prompts/issues/PRs/logs.
- Exact selection of **Grok 4.6 primary engineering reviewer** (not Composer 2.5). Internal provider-helper inference models not completely observable are disclosed, not a standalone stop, per binding D7/D17 policy.
- Mock PR #513 **must not be used as the trusted live security gate**: adversarial tests expose Composer-eligibility false negatives. Live bootstrap must use a separately independently reviewed, fail-closed trusted preflight that does **not** accept user-controlled impact declarations as sole protection. Even with this review-only exception, the mock code is not adopted or merged.
- GitHub required checks can permit `neutral`/`skipped`; the later independent verifier requires `conclusion === success` on the exact tested SHA and verifies expected check-source app. No automatic merges are allowed in this exception.
- Any uncertainty in model availability, account/API support, scope, task identity, GitHub protection, runner source, credential scoping, spending budget or review result => **HOLD, not fallback**.

## 6. Bootstrap UAT side-effect, workflow merge and trust boundary

**Do not conceal the GitHub default-branch constraint:** `workflow_dispatch` triggers a workflow only after its YAML exists on the repository default branch, currently `main`. A workflow created only on PR #513's branch is NOT an installed manually runnable control plane.

Current `.github/workflows/deploy.yml` automatically deploys UAT on successful main CI. **Merging a bootstrap workflow to main can therefore redeploy UAT even if the workflow never starts Cursor.** Main protection is ACTIVE but is NOT a no-deploy switch.

Before even merging a bootstrap workflow, the owner must separately authorize **one specific merge commit and its UAT redeploy side effect**, or authorize an independently reviewed/tested deployment-trigger exclusion with its own change/risk gate. The present approval does **NOT** cover that.

A secret-bearing job must run code from a protected main workflow/immutable trusted script and must NEVER execute unchecked PR branch scripts or untrusted artifacts with the Cursor key. Also verify GitHub Actions `workflow_dispatch` can be invoked by the owner in the installed repository plan and account.

Refs: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax and https://docs.github.com/en/actions/reference/security/secure-use.

## 7. Independent Grok review and explicit owner signature checkpoints

These are **distinct gates** to prevent an approval-to-prepare from silently becoming an approval-to-execute:

| Gate | Required owner decision and technical evidence | Currently |
| --- | --- | --- |
| G0 packet preparation | Owner permits nonprivileged exception design | **APPROVED** |
| G1 Cursor account/credential feasibility | Verify user API key support, Enterprise/service account availability, team GitHub connection and actual **repo permission scope**, choose acceptable identity and numeric cost/time cap | **NOT CHECKED / NOT APPROVED** |
| G2 review-bootstrap ADR exception | Product Owner explicitly approves exception to the D8 sequencing for **one** bounded review-only API call, accepts or rejects possible *new-branch* write exposure | **NOT APPROVED** |
| G3 trusted dispatcher implementation | Selected Grok 4.6 engineering implementation + separate Grok 4.6 `bmad-code-review` + CAT-SEC, adversarial tests, validated exact workflow/run/manifest and no secret exposure | **NOT IMPLEMENTED OR REVIEWED** |
| G4 one-time main merge / UAT effect | Specific PR reviewed and owner authorizes merge + triggered UAT effect OR separately authorizes proven exclusion | **NOT APPROVED** |
| G5 D5 temporary key | Owner explicitly chooses provider credential type/scope, budget, rotation/revoke and approves creation/storage as GitHub `adcp` Environment secret only | **NOT APPROVED / NO KEY** |
| G6 single live review pilot | Owner starts `workflow_dispatch` from trusted main and separately approves `adcp` reviewer gate; preflight verifies frozen SHAs/model/identity | **NOT APPROVED / NOT RUN** |
| G7 evidence-based final D8 adoption | Exact-newest-HEAD Grok review findings closed (0 BLOCKER, 0 MAJOR), separate explicit Product Owner AD-1..AD-10/AD-12 adoption decision | **NOT APPROVED** |

**D11/D13 and D12** existing approved design/settings remain operative; this exception does not expand them. Privileged workflow/credential authority is still not granted. All Production Epic 46 work and UAT deployments remain NO-GO under this packet.

## 8. Decision-ready owner ballot (request at a later turn, NOT assumed today)

**Decision E1: Preferred credential path.** If Cursor Enterprise+team integration exist, evaluate repository-scoped service account with hard account spend limit; otherwise, either explicitly accept a short-lived personal user API key *for this single bootstrap only* or STOP without launching. No plan change or subscription upgrade is silently authorized.

**Decision E2: Acceptable review-only write exposure.** Explicitly accept separate-branch write capability as residual risk with no main writes, no auto PR/merge and post-run audit, or require a verified read-only repo integration and stop if unavailable.

**Decision E3: Workflow installation and UAT.** Separately authorize a specific reviewed workflow PR merge with its likely main-CI→UAT effect, or authorize a pre-reviewed isolation strategy and keep existing UAT unchanged until then.

**Decision E4: Numeric spend/time/retry/expiry.** Owner selects actual values after provider entitlement and cost exposure are confirmed; no unknown/unbounded cap permits the pilot.

**Decision E5: D8 one-run exception.** Approve a single scoped review and sunset of the exception only after E1–E4, independent Grok safety review of bootstrap code, and validated owner GitHub Environment approval.

**Default if any answer is missing: NO-GO.** This draft is a technical owner decision packet, not a grant of execution authority.

## 9. Sources and evidence standard

Official API docs checked 2026-10-26:
- https://prod.cursor.com/docs/cloud-agent/api/endpoints
- https://prod.cursor.com/docs/account/enterprise/service-accounts
- https://cursor.com/docs/cloud-agent
- https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- https://docs.github.com/en/actions/concepts/security/secrets
- https://docs.github.com/en/actions/reference/security/secure-use

**No `@cursor` comment, API key creation, authentication, Cursor launch, workflow YAML edit, GitHub Actions dispatch, PR merge, UAT or Production deployment was performed by preparing this packet.**
