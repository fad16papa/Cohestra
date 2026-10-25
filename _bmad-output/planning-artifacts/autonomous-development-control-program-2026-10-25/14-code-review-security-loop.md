---
title: CAT-SEC mandatory BMAD code review with security and iterative correction
date: 2026-10-25
methodology_approval: OWNER_APPROVED
approval_scope: PROCESS_DESIGN_ONLY
review_executed: NO
D17_task_routing_policy: OWNER_APPROVED
D17_dispatcher_enforcement: NOT_IMPLEMENTED
architecture_adoption: NOT_APPROVED
production: NO_GO
---

# Owner-approved CAT-SEC: BMAD code review, security and repeat-until-clean methodology

## Authorization and constraints

Product Owner explicitly instructed on 2026-10-25: "yes we can use bmad-code-review skills when it catches some bug and issue, inspect the code an rerun code review again until it pasess all required test."

**Interpretation:** This approves the method to be used by future already-authorized engineering stories. It is not an authorization to run another Cursor agent, begin implementation of ADCP, expand privileges, merge a PR or deploy Production. D17 now requires **correct selected main/reviewer model** rather than exhaustive hidden-helper inference attestation. Grok 4.6 owns all technical code/security reviews; Composer 2.5 may implement only narrowly qualified simple bug fixes. The D18-A review yielded `MODEL_USAGE_UNVERIFIED` under the old policy and executed no BMAD skills, so no PASS is inherited.

`bmad-code-review` (`CR`) is present in `_bmad/_config/bmad-help.csv`. There is no installed `bmad-security-review` skill. The security review requirements become an **explicit rubric inside the existing cataloged `bmad-code-review`**, with written results per criterion. This does not replace still-required BMAD adversarial (`AR`), edge-case hunter (`ECH`), or implementation readiness (`IR`) reviews in the architecture acceptance program.

## Mandatory future execution loop

```text
Owner-approved story + Grok 4.6-selected main model (or qualified Composer 2.5 simple-fix implementer) + Grok 4.6-selected reviewer
    ↓
IMPLEMENT (authorized story scope only)
    ↓
BUILD + TEST (unit, integration, contract, security, applicable E2E)
    ↓
Grok 4.6 bmad-code-review with explicit security rubric on exact HEAD
    ├─ 0 BLOCKER + 0 MAJOR, applicable security rubric all satisfied
    │     ↓
    │   Exact-HEAD CI + GitGuardian + isolation and owner gates
    │     ├─ all required evidence PASS and no changes since review: ELIGIBLE FOR STORY ACCEPTANCE
    │     └─ any failure or changed HEAD: inspect → fix → new tests → NEW review
    └─ BLOCKER / MAJOR / failing test / security finding
          ↓
       Inspect concrete source and root cause; capture file/line + impact
          ↓
       If material architecture/privilege/Production: OWNER_GATE and STOP
          ↓
       Otherwise FIX within approved scope; rerun affected + regression tests
          ↓
       NEW HEAD ⇒ fresh code review and exact-HEAD CI; prior PASS is STALE
          ↓
       Repeat while within 3-cycle budget
```

A code review that finds no issues does not mean tests or mandatory independent approval were completed; those require their own evidence.

### Security / threat-model rubric (mandatory N/A rationales)

The reviewer must explicitly check and record **PASS / FINDING / NOT_APPLICABLE with explanation** for:

1. Authentication, RBAC, role/session boundaries, JWT and token handling.
2. Authorization, multi-tenant isolation, tenant scoping and object-level access.
3. Secrets/credentials: source, logs, envVars, MCP headers, CI artifacts and key exfiltration pathways.
4. Input validation, injection, XSS, SSRF, redirect/CORS/reCAPTCHA and external API trust.
5. Billing/Paddle payment idempotency, signature validation, webhooks, retry and financial effects where relevant.
6. Database changes, migrations, concurrency, tenant data safety, destructive operations and rollback.
7. GitHub Actions security: PR trust boundaries, script/workflow injection, token permissions, protected-path tampering and provenance.
8. UAT/Production isolation, runtime network exposure/ports, hardening and deployment controls.
9. Dependency and supply-chain integrity, pinned actions/packages, least privilege.
10. Sensitive observability / PII logging, error messages, reports and retention.

Use the **actual diff and affected call paths**, not generic "security reviewed" text. Tests for affected behavior must pass. Any material design shift requires Product Owner architecture approval before modifying production-sensitive code.

### Findings and review cycle ledger

For every review/fix attempt, preserve:
- `PR`, `HEAD_SHA` (full 40 hex), `REVIEWER_MODEL_REQUESTED` and `MODEL_ACTUALLY_VERIFIED` with evidence
- `BMAD_SKILL=bmad-code-review` and actual execution logs/artifact link
- Findings `BLOCKER/MAJOR/MINOR` with file and line, failure scenario, root cause, selected remediation
- Affected paths and changes applied; material-design owner gate check
- Local unit/integration/contract/security/E2E test commands, counts and logs
- GitHub Actions check names, URLs and exact HEAD results; GitGuardian check conclusion
- `REVIEW_CYCLE_INDEX`, overall review/fix budget and elapsed/cost caps
- Security rubric results and any documented N/A reasons
- On a fix, note old review `STALE`, run new review on **new HEAD**
- Final severity `BLOCKER=0` and `MAJOR=0`; unresolved minor items need documented acceptance within existing policy, not silent waiver

### Bounded cycles and escalation

**Maximum: 3 authorized inspect/fix/test/re-review cycles per run.** If findings or required test failures remain, report `INCOMPLETE/RETRY_BUDGET_EXHAUSTED` and the exact remaining deficiencies; do not treat as PASSED and do not spin endlessly. The owner may independently authorize another bounded cycle after a targeted review. If a material design or privilege boundary arises at any point, HALT immediately even on cycle 1.

**Story acceptance is separate from merging.** Existing approved Epic 45 non-Production merge requirements remain applicable; this methodology does not grant auto-merge on PR #507, Production changes or control-plane privileges.

## Exact boundary

This methodology is **APPROVED** because the owner explicitly selected it. No implementation, security-runner credential, Cursor model-policy exception, final D8 architecture adoption, or CI workflow change was approved. Current PR #507's historical D18-A attempt remains `MODEL_USAGE_UNVERIFIED` under a **superseded evidence rule** and did not run BMAD. The revised D17 task routing policy is owner-approved, but no new run has been authorized; its prior launch was consumed and needs separate authorization for a repeat.

