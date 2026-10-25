---
title: ADCP mandatory milestone reports
status: draft
created: 2026-10-25
---

# Mandatory milestone reports

A milestone is **not complete** without the required evidence, exact-current-HEAD validation and required approvals. Missing evidence or an unresolved OWNER_GATE is FAIL/HOLD. Reports must serve both an executive summary and a detailed engineering decision record. **Agent narrative is never equivalent to independent verification.**

## Evidence vs claim

| Label | Meaning |
| --- | --- |
| **EVIDENCE** | Independently retrievable: GitHub check-run URL, Actions run URL, `gh` JSON, file path + SHA, contract script exit code captured in CI |
| **CLAIM** | Agent or ChatGPT prose with no URL or log. Useful context; cannot close a gate |

Every status line must start with `EVIDENCE:` or `CLAIM:`.

## Standard template

Copy this into the authorizing issue or PR when a milestone is offered.

```markdown
# ADCP milestone report

PROGRAM: Autonomous Development Control Program
MILESTONE:
TASK / STORY:
DATE: (Asia/Singapore)
AUTHOR_ROLE: owner | chatgpt | cursor-agent | orchestrator

## 1. Executive summary
(5–8 lines. GO / NO-GO / OWNER_GATE.)

## 2. Deliverables and progress
- Planned:
- Done:
- Not done:

## 3. Implementation details
- Skills invoked (closed-set names only):
- Branch:
- Files changed (paths only):

## 4. System / code / infrastructure impact
- Runtime / UAT / Production touched? yes/no + paths
- Material architecture? yes/no
- If yes: impact assessment link + ADR id

## 5. Security and testing evidence
- EVIDENCE: unit / integration / contract / CI URLs
- EVIDENCE: GitGuardian conclusion + check-run URL
- EVIDENCE: tenant-isolation if applicable
- CLAIM: anything not backed by a URL

## 6. Risks and unresolved findings
- BLOCKER / MAJOR / MINOR
- Deferred items and why they are not material

## 7. Architecture decisions and alternatives
- New ADs proposed
- Alternatives considered
- Owner approval status per AD

## 8. Owner approval status
- Required gates:
- Recorded approvals (quote + URL + timestamp):
- Missing:

## 9. Recommended next steps
- Numbered. Stop if any item is OWNER_GATE.

## 10. Exact references
- PR:
- HEAD SHA (40 hex):
- Base SHA:
- CI run URL:
- Cursor agent id / run id (or explicitly NOT_STARTED):
- Requested Grok 4.6 model ID + model catalog evidence; actual model usage attestation (or NOT_VERIFIED):
- Orchestrator workflow run URL (or NOT_STARTED):
- Authenticated github.actor (human who authorized the run):
- Idempotency / task key, retries, timeout, usage/budget:
- Grok 4.6 review evidence + reviewer/run identity (or NOT_RUN):
- Environment name actually used:
- Follow-ups / steers (ids or "none"):
- Cancels (ids or "none"):
```

## Completeness rule

The orchestrator must refuse `MILESTONE=complete` unless **all** of the following are present (`and`, not `or`):

1. Section 10 has a PR number **and** a 40-hex HEAD that still matches that PR **and** a CI run URL
2. Required CI jobs are `SUCCESS` **EVIDENCE**
3. BMAD review on that HEAD has 0 BLOCKER / 0 MAJOR **EVIDENCE** (review artifact or PR comment)
4. Architecture halt is either not applicable or an approved ADR exists **EVIDENCE**
5. Production-related tasks additionally have GitGuardian `success` **EVIDENCE** (Layer B). Neutral is not success
6. `github.actor` of the authorizing human is recorded. `AUTHOR_ROLE` is not a substitute
7. Follow-ups, steers, and cancels are listed (or explicitly `none`)
8. Environment name actually used is recorded and is not `production` or `uat`
9. For Cursor-executed work, model pin and authenticated availability have evidence, and any unknown subagent-model usage is explicitly described rather than implied verified
10. Architecture impact assessment covers semantics as well as protected paths; Product Owner's required decision is recorded before any material design change proceeds
11. Separate milestones exist for controlled pilot and full event-driven autonomy; do not mark full autonomy complete using a manual-only trial

For UAT/non-prod merge, GitGuardian NEUTRAL is recorded as a risk in section 6, not treated as SUCCESS evidence.

## Impact-assessment addendum (material architecture)

Required before implementation continues:

- What invariant would change
- Planes affected (dev / UAT / Production / control-plane)
- Alternatives (at least one)
- Privilege or secret-class expansion? yes/no
- Rollback
- Requested owner decision

## Notification

Pilot: post the report as a PR or issue comment without requiring the Product Owner to transfer prompts. Notify the owner of any gate, operational failure or unresolved security risk; the approved notification channel is an owner decision. Slack/email integrations are not installed by this document.

## Executive recommendation at each milestone

- **GO / NO-GO / OWNER_GATE** for the specific milestone; do not conflate code readiness, merge approval, pilot activation and Production authorization.
- Top outcomes, important design changes, unresolved BLOCKER/MAJOR/MINOR risks, dependency state, required owner decisions, and next autonomous action.
- Separate *confirmed by direct GitHub/CI evidence*, *Cursor-reported but not independently verified*, and *proposal/assumption*.
- If evidence is on a previous HEAD, label **STALE**. If any required check is pending, label **INCOMPLETE**, not PASS.
- Preserve a report's exact PR/commit/check-run links in the GitHub task record to make audits possible after the conversation ends.
