# Cohestra execution bridge: exact owner security-activation decision packet

Date: 2026-10-25 (Asia/Singapore)
Status: **PROPOSED FOR EXPLICIT PRODUCT OWNER APPROVAL**
Applies to: Public GitHub repository fad16papa/Cohestra
Owner: Single human Product Owner, GitHub account fad16papa
Code branch: cursor/adcp-bridge-contract-mock-20261025
Live dispatcher: **NOT IMPLEMENTED / NOT ENABLED**
Cursor API credentials: **NONE CREATED BY THIS PROGRAM**
Production: **NO-GO**

## 1. Verified baseline and non-negotiable risk

The current main SHA at review was e962c8c3eead953a1f56f2b397b3e9d4fc669041. Main reports protected=false and the repository's ruleset list is empty. Merge commits, squash, and rebase are all enabled. The repository is public.

.github/workflows/ci.yml runs CI on pushes to main as well as pull requests to main. .github/workflows/deploy.yml listens to successful CI completion on main and deploys the accepted SHA to the uat GitHub Environment. Thus **any new main merge can cause a UAT deployment**, including merges of planning or dispatcher-only documents. Do not mistake successful PR CI for permission to merge.

The exact required checks were retrieved from existing GitHub check runs on the P0 mock PR SHA 8643e724dcd1f8dba435e3ac997c6a56ed22fdb5:
- .NET build and test — github-actions
- API integration tests — github-actions
- Next.js build — github-actions
- UAT isolation contract — github-actions
- Docker stack smoke — github-actions
- GitGuardian Security Checks — gitguardian

All six concluded success on that P0 SHA in GitHub. Those checks **do not** establish a Grok 4.6 BMAD independent review or a passed, installed Node mock test suite.

GitHub treats skipped and neutral as acceptable for standard required status checks. A separate trusted exact-SUCCESS check is needed before any autonomous merge. Main rules **do not** stop owner-authorized merges from triggering existing UAT.

Environment reviewer and admin-bypass settings could not be read from the connected GitHub app. They must be inspected in the actual GitHub administrative UI before configuration; never assume the environment's existing settings.

## 2. D10 exact main protection (candidate settings, NOT APPLIED)

| Control | Proposed setting | Important preflight |
| --- | --- | --- |
| Target | Branch main, no other branches | Preserve existing feature branches |
| Require pull request | ON | Prevent normal unreviewed writes |
| Human approvals | 0 required GitHub reviews | Exactly one human owner; required 1 would deadlock owner-authored PRs |
| Required status checks | ON, exact six names above, expected source applications | Verify the selected app identity for each |
| Branch up-to-date | ON initially | Test CI SHA/stale-merge interactions before activation |
| Conversations resolved | ON | No unresolved actionable threads |
| Force push | OFF | Reject non-fast-forward rewrite of main |
| Branch deletion | OFF | Main remains present |
| Linear history required | OFF | Epic 46 Production provenance requires two-parent merge history |
| Merge queue | OFF initially | Current CI does not include merge_group |
| Signed commits | DEFER | Cursor/bot signing not established |
| Successful deployment required before merge | OFF | UAT deployment follows main CI; avoid circular gate |
| Merge commits | KEEP ENABLED | Preserve two-parent history for Production provenance |
| Squash/rebase merge methods | Prefer OFF after compatibility check | Check existing integrations/owner habits first; do not change silently |
| Administrator bypass | No routine bypass, but recovery plan must be verified | Solo-owner lockout/incident risks; controlled recovery only |
| Workflow/policy-sensitive files | Treat .github/workflows, deploy, provenance, secrets, ADCP/architecture governance as MATERIAL OWNER GATES | Branch rule alone does not enforce semantic trust |

**Strict-success gap:** GitHub required checks can accept neutral/skipped. Cohestra's future trusted merge/release verifier must fetch CURRENT tested SHA, six exact check names, trusted source apps, and require conclusion == "success" for each. Failed, missing, pending, skipped, neutral, stale, duplicated or wrong-source is HOLD. Required status checks alone are not sufficient for privileged automatic action.

**Source-trust gap:** A verifier defined only in PR-editable files is not independent of the untrusted PR. Run the final privileged check from a protected main workflow or owner-approved isolated installation; do not run PR-controlled code in a secret-bearing job. Verify main-branch workflow source, pull request commit and head/base/merge SHA semantics against current CI.

**Preflight:** Capture existing rules, preserve a rollback/recovery procedure, test equivalent protections on a disposable non-default branch if supported, verify owner can still repair a blocked check without giving routine bots broad main-write bypass, and explicitly understand that a subsequent main merge triggers UAT.

## 3. D4 exact isolated GitHub Environment (candidate settings, NOT CREATED)

| Control | Proposed value |
| --- | --- |
| Environment name | adcp |
| Required reviewers | fad16papa ONLY |
| Prevent self-review | OFF for adcp ONLY |
| Wait timer | 0 |
| Permitted deployment branches | Only main trusted workflow |
| GitHub tokens/secrets | None initially |
| Later environment secret | Dedicated Cursor service-account CURSOR_API_KEY only after D5 |
| Production / UAT access | NEVER inherit secrets or approve deployment there via adcp |
| Approval type | Actual owner GitHub Environment reviewer UI confirmation per pilot invocation |
| Unattended operation | NOT claimed; P5 requires separate approval and hardened credentials |

This is not independent-human approval. The owner can initiate and approve the same pilot job, an acknowledged single-owner compromise. It is a materially privileged access gate, not a setting ChatGPT may apply on its own.

## 4. D11/D13 owner-authenticated dispatch and decisions (candidate design)

- The first live task begins through an explicit GitHub workflow_dispatch action on a trusted main workflow, with allowlisted github.actor == fad16papa and Environment adcp owner approval before the Cursor key can be read.
- **github.actor alone is not sufficient human approval**, because a connected app or other delegated credentials might act under the owner's identity. Require the actual protected Environment review as the second control for each pilot.
- Comments such as "OWNER_APPROVE", labels, issue body, PR author display name, AI-generated docs, and connected ChatGPT comments are UNTRUSTED as standalone privileged authorization.
- A separate owner-confirmed architecture decision ID must be recorded in a trusted registry only AFTER owner approval; do not let a task contract self-attest privileged scope.
- Semantic impact assessment is a conservative two-stage proposal: structured, schema-validated risk flags PLUS deterministic protected-path/service/API-contract detectors. Unknown material impacts HOLD for owner review; do not claim a complete AI semantic oracle.
- Follow-up steering of a running Cursor agent remains disabled until the main assigned model-selection behavior and budget can be proven. Never silently fall back to Auto.

## 5. D12 GitHub Actions job permissions (candidate design)

Workflow-level permissions: empty by default.

| Job | Minimum permissions | Secrets |
| --- | --- | --- |
| Trusted preflight | contents:read, issues:read, pull-requests:read if required | NONE |
| CI / required check inspector | actions:read, checks:read, contents:read if needed | NONE |
| Cursor dispatcher | contents:read for trusted contracts, optional actions:read | CURSOR_API_KEY only from adcp after owner UI approval |
| Sanitized evidence reporter | issues:write only if required; pull-requests:write only if needed, never broad mixed scopes by default | NONE |

Every checkout uses persist-credentials: false. Do not grant contents:write, actions:write, id-token:write, repository administration, or Production/UAT Environment access to the model-invoking job. The Cursor GitHub app (separate identity) creates a draft feature PR after execution, not a token with main write authority.

**Critical:** Do not place Cursor credentials in Cursor prompt text, agent envVars, MCP environment/headers, issue comments, logs, artifacts, public PRs or source files. Do not execute untrusted PR-controlled scripts on the adcp secret-bearing runner.

## 6. D8 and inherited Epic 45 model law (NOT YET ADOPTED)

The Product Owner has already approved task-based Grok 4.6/Composer 2.5 model routing:
- Grok 4.6 is the assigned primary for architecture, planning, substantive code, security/review, release technical decisions.
- Composer 2.5 may implement only an already-classified, narrowly scoped simple low-risk bug fix. A separate Grok 4.6 cataloged bmad-code-review must approve that fix's latest code SHA.
- Auto/default task model routing is forbidden. Resolve current supported model IDs from authenticated GET /v1/models. The Cursor API is public beta.
- Unknown hidden provider-helper model IDs are disclosed as NOT_ATTESTED, not alone a reason to halt a correctly selected main Grok reviewer.

**Unresolved D8:** Current ADCP planning PR #507 has Grok review findings BLOCKER=1, MAJOR=6, MINOR=7. Owner-approved Phase R1 Issue #512 is not yet executed by an autonomous Cursor dispatcher. Until revised planning contracts obtain clean current-HEAD Grok review and the owner adopts the exact ADR, **do not claim full ADCP architecture adoption**. Prepare AD-12 Composer clarification, semantic detector and owner-attestation alternative choices for owner approval instead of silently treating them as decided.

## 7. D5 and P4: separate live credential and pilot gates

1. After the complete security/architecture preflight and explicit owner settings authorization, create main protection and adcp Environment (initially WITHOUT a Cursor key). Verify no UAT/Production regression and sole owner approval viability.
2. Merge a reviewed/trusted workflow only after the owner explicitly authorizes a specific main merge and understands the resulting UAT redeploy, or after separately approving a tested docs/workflow path exclusion. Never silently disable UAT deployments.
3. After a fresh Grok security review of the dispatcher, owner separately approves a dedicated service-account Cursor API key, budget, permissions and expiry/rotation, then places it ONLY into protected adcp Environment secrets via trusted UI. Do not paste key in chat.
4. Authenticated GET /v1/models must return intended Grok 4.6 model ID. Composer 2.5 IDs require a separately eligible simple-fix task. Never invent an ID, default to Auto, or send undocumented model params.
5. First live pilot: **one harmless non-Production documentation/test task**, no automatic merge; observe accepted task→agent/run IDs→draft PR→exact-head CI/GitGuardian→actual Grok BMAD review and report. Enforce bounded retries, concurrency, cancellation, stale SHA refusal and owner escalation.
6. Fully unattended low-risk P5 is a **later separately authorized** architecture, not the manual-adcp-reviewer P4 pilot.

## 8. Owner decision request: exact authority, not another direction poll

D7/D17 task model policy and CAT-SEC methodology are already owner approved. D8/D10/D4/D12 have preliminary direction only. This packet makes the actual privileged change set explicit.

Decision S1: **Approve exact D10 main protections above** after preflight and an owner-approved UAT-impact plan, or request a narrow alteration. Do not automatically apply without this decision.

Decision S2: **Approve D4 isolated adcp** sole reviewer fad16papa, prevent_self_review OFF in adcp only, main-only deployments, no keys at creation; or choose a more restrictive alternative.

Decision S3: **Approve D11/D13 owner UI Environment confirmation + fail-closed risk assessment**, or propose another human-authenticated control. An issue comment alone is not a verified approval.

Decision S4: **Approve D12 least-privilege split-job permissions** (with no initial secrets), or request a change.

Decision S5: **Retain D8/AD-12 final adoption pending clean Grok planning re-review and your explicit final ADR vote**. No hidden adoption.

Decision S6: **Defer D5 key creation, live dispatch, main merge and Production** until later distinct approvals and tested preconditions.

Recommended overall decision: accept S1-S4 as the settings blueprint, S5-S6 as hard stops. A single owner approval to apply settings must be recorded explicitly and identify whether it covers S1-S4 only; do not infer it from a generic "proceed".

## 9. Practical rollback/recovery and proof

- Capture main/head, existing rules and UAT baseline before changes.
- Separate owner-only admin settings privilege from model/dispatcher service identities.
- Test that required checks run on a disposable PR, that no independent second human is required, and that main cannot be force-pushed.
- Reconfirm only owner can release adcp without giving access to production/uat.
- Simulate: missing key, wrong model, model unavailable, malformed task, PR-modified workflow, skipped/neutral security check, wrong source app, race between checked HEAD and dispatch, two simultaneous tasks, $/usage cap breach.
- Revert a faulty ruleset using an explicitly recorded owner administrative recovery action; record the audit event. NEVER disable other environments to make the pilot work.
- Preserve both existing draft PR #507 and mock draft PR #513 until clean review and owner merge authorization.
- No scheduled/live rollout was started by drafting this document.

Official references:
- GitHub protected branches: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- GitHub required-check semantics: https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks
- GitHub Environment controls: https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments
- Cursor Cloud Agents API: https://prod.cursor.com/docs/cloud-agent/api/endpoints
