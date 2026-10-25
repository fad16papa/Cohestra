---
title: ADCP Permanent Single-Owner Governance Proposal
status: PROPOSED_OWNER_REVIEW
date: 2026-10-25
owner_fact: one human Product Owner, no collaborators planned
architecture_adoption: NOT_APPROVED
github_settings_changes: NONE
implementation: NO_GO
production: NO_GO
---

# ADCP governance for a permanently single-owner Cohestra

## Confirmed operating constraint

The Product Owner has stated Cohestra is and will remain operated by **one human**, with **no additional human collaborators**. Design must not force two-human approvals or require hiring anyone. This is an **owner-supplied constraint**, not blanket approval to weaken security settings or start an agent.

## What GitHub can enforce

GitHub does **not** let PR authors approve their own pull requests: https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/approving-a-pull-request-with-required-reviews

GitHub Environments support a required owner reviewer, and separately support `Prevent self-review`. If prevent self-review is **enabled**, the triggering person cannot approve that Environment job even if they are a required reviewer: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments

### Proposed main protection

Require PRs, checked and current exact-HEAD CI/security jobs, no force push or deletion, reviewable merge history, and preservation of production two-parent ancestry rules. **Do not require 1+ approving human PR reviews** as a branch rule that would deadlock owner-authored changes. This is a deliberate tradeoff: technical independence and audit evidence can be required, but not a second-human approval.

Only the Product Owner can authorize critical design and privileged operations. **AI-created review artifacts are not human PR approvals**. Technical evidence includes Grok 4.6 independent BMAD review, GitGuardian, tests, UAT/tenant isolation and exact-HEAD checks.

Changes to policy files, GitHub workflow YAML and credential-handling surfaces require **explicit human owner gates and reviewed diffs**, even if a normal owner-authored PR lacks a second human review.

### Proposed owner-gated pilot Environment

- Environment name: `adcp` (not `production` or `uat`).
- Required reviewer: only the Product Owner (no extra GitHub identity or collaborator).
- `prevent_self_review=false` **only for `adcp`**, subject to Product Owner approval, so the initiator can also review.
- Human manually starts `workflow_dispatch` and approves the waiting Environment job. This preserves an explicit confirmation per pilot job, but **does not create independent person-to-person separation of duties**.
- Disallow admin bypass where supported and operationally practical; test the actual account/plan/reviewer behavior before any secrets are created.
- `production` Environment remains unchanged and separately owner-gated.
- Protect `main` and workflow/security config **before** creating `CURSOR_API_KEY`. Credentials are managed by owner in Environment secrets, not in ChatGPT, issues or repository files.

### Proposed full autonomy (separate security decision)

Every required-reviewer `adcp` job needs approval, which would negate true unattended routine execution. Therefore do **not** mislabel owner-approved per-run deployment as full autonomy.

Before P5, design an **independent limited execution channel** for approved low-risk task classes. Options requiring owner choice:
1. A separate restricted GitHub Environment with the minimum necessary execution secret and hardened trusted workflow, no routine human approval, scoped to pre-approved tasks, branch, cost and frequency.
2. Short-lived brokered credentials through an owner-reviewed secure service rather than distributing persistent tokens to agent code (would add infrastructure and require a separate security ADR).

Either option must stop on material architecture, data, authentication, GitHub workflow changes, new secrets, security policy, billing/monetary operations, Production/UAT deployment and unknown effects. It must also guard against an AI/bot or GitHub comment masquerading as owner approval.

### Identity integrity

Connected GitHub operations from ChatGPT may appear in GitHub as the authenticated owner's login. Such comments can carry the audit attribution `submitted_by=chatgpt_for_owner`, but **cannot themselves be treated as proof that the human authorized a new material architecture decision**. For privileged gates, use verifiable human interaction (e.g. directly approving Environment job, GitHub UI action with context) or a separately approved authenticated decision mechanism. A raw `OWNER_APPROVE` phrase in an issue comment is insufficient when the same principal can be used by an automated advisor.

### Residual risk and mitigation

| Risk | Realistic control |
| --- | --- |
| Compromised sole-owner GitHub account | Phishing-resistant MFA/passkeys or security keys; recovery codes and recovery procedures; notifications and audit |
| No independent human approvals | Strict CI/GitGuardian and Grok 4.6 review evidence; mandatory risk/decision log; sensitive paths owner gated |
| Same-person Environment initiation/approval | Explicit user interaction, event audit, effective least-privilege token, no unattended privileged dispatch; no assertion of two-person approval |
| Agent exfiltration through workflow changes | Branch/path protections, trusted `main` workflow, no PR-code access to keys, audited secret classes, dedicated service identity |
| Full autonomy recurring key access | Separate owner-approved trust boundary with bounded task allowlist and least-privilege credentials; never equate unattended with unrestricted |
| AI review and classification mistakes | Fail closed on unclear changes; human owner architecture decision, independent exact-HEAD checks |

## Owner decision packet

- **D15:** Confirm permanent single-owner structure. **FACT PROVIDED**, proposed enforcement not yet adopted.
- **D4:** Approve `adcp` required-reviewer configuration with sole owner and `prevent_self_review=false` **only** for the controlled pilot. **OWNER_GATE OPEN**.
- **D10:** Approve exact `main` protections and CI rules without second-human PR approval and without breaking Production two-parent provenance. **OWNER_GATE OPEN**.
- **D8/D12:** Adopt this as an amendment to existing ADCP governance and privileged-control design only after Grok 4.6 security/adversarial review. **OWNER_GATE OPEN**.
- **D16:** Full unattended low-risk runtime noninteractive approval architecture. **OWNER_GATE OPEN FOR FUTURE P5**, not approved by this document.

No settings, secrets, workflow execution, merge or Production action is authorized here.
