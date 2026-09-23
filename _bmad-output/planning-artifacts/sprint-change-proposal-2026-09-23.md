---
generated: 2026-09-23
project: cohestra
author: Amelia (bmad-correct-course)
status: approved-for-implementation
awaiting_approval: false
baseline: main @ 4528eb12fddffa53bc0e6b0175eebde67331ba82
change_scope: minor
issue_type: ci-reliability-flake
trigger: Story 38.3 post-merge close block
approval: Product-owner STEP 2B — if rerun cannot clear the flake, create a narrowly scoped CI reliability correction from current main. Do not merge automatically. Do not start Story 38.4.
---

# Sprint Change Proposal — Outbox enqueue CI reliability

## Checklist

### 1. Trigger and context

- [x] 1.1 Triggering story: **38.3** E2E tenant and theme isolation. Story remains `review`. This correction is not 38.4.
- [x] 1.2 Issue type: **technical limitation discovered during close** — flaky integration assertion, not a product defect.
- [x] 1.3 Evidence recorded below.

### 2. Epic impact

- [x] 2.1 Epic 38 can still complete as planned after 38.3 close + later 38.4.
- [x] 2.2 No epic scope / AC change. No new epic.
- [x] 2.3 Remaining epics unchanged.
- [x] 2.4 No future epic invalidated.
- [x] 2.5 No resequence.

### 3. Artifact conflicts

- [x] 3.1 PRD: no conflict. MVP unchanged.
- [x] 3.2 Architecture: outbox enqueue + hosted dispatcher stay as designed. Production `Outbox:Enabled` default remains `true`.
- [x] 3.3 UX: N/A.
- [x] 3.4 Secondary: integration test host + enqueue assertions only. CI workflow unchanged.

### 4. Path forward

- [x] 4.1 Direct Adjustment — **Viable**. Low effort, low risk. Test-host control via existing `Outbox:Enabled`.
- [x] 4.2 Rollback — **Not viable**. 38.3 merge is correct; outbox code was not changed by 38.3.
- [x] 4.3 MVP review — **Not viable**. Product outbox guarantees are not the defect.
- [x] 4.4 Selected: **Option 1 — Direct Adjustment**.

### 5–6. Proposal and handoff

- [x] Issue summary, impact, path, MVP (unaffected), Developer-agent handoff.
- [x] Approval: product-owner STEP 2B instruction.
- [x] sprint-status: no epic add/remove. 38.3 stays `review`. Epic 38 stays `in-progress`.
- [x] Success: enqueue tests prove durable record+payload without racing the processor; no production behavior change; PR not auto-merged.

## Section 1: Issue Summary

Post-merge `main` CI run `35860436546` on `4528eb12` failed one integration test:

`OutboxIntegrationTests.RegistrationSubmit_EnqueuesOperatorNotifyOutboxMessage`

Expected `OutboxMessageStatus.Pending`, actual `Processing` at line 89. Logs show `OutboxDispatcherHostedService` claimed the row and `RegistrationOperatorNotifyOutboxHandler` sent it before the assertion.

Authorized targeted rerun of job `107179042490` was rejected:

- `gh run rerun --job` → `job cannot be rerun`
- `gh run rerun --failed` and full rerun API → `403 Resource not accessible by integration`

Same tree passed PR CI (`35857001016` on `76f5c274`) and the test passed locally. Story 38.3 did not change outbox code.

Classification (mandatory-code-review-loop test-failure law): **D flaky / F unrelated pre-existing**.

## Section 2: Impact Analysis

| Area | Impact |
| --- | --- |
| Epic 38 | Close of 38.3 blocked until `main` CI is green. Epic stays in progress. |
| Story 38.3 | Status stays `review`. No product AC change. |
| Story 38.4 | Not started. |
| PRD / architecture / UX | None. |
| Production outbox | **No change.** Dispatcher stays enabled by default. Delivery guarantees unchanged. |

## Section 3: Recommended Approach

**Direct Adjustment — deterministic test-host control.**

Semantic contract of `RegistrationSubmit_EnqueuesOperatorNotifyOutboxMessage`:

> After a public registration, the API writes one durable outbox row for operator notify: correct `MessageType`, `DedupeKey`, `TenantId`, `RegistrationId` payload, unclaimed `Pending` status. That is enqueue. Claiming and sending is `OutboxProcessor` / handler lifecycle, already covered by Infrastructure unit tests.

Selected option: disable the hosted dispatcher in the integration test host (`Outbox:Enabled=false`). Then assert durable enqueue evidence. `Pending` is now a stable enqueue fact, not a race with an independently tested processor.

Rejected:

| Option | Why not |
| --- | --- |
| Accept any status | Hides whether enqueue wrote an unclaimed row |
| Sleeps / timeout inflation | Non-deterministic |
| Disable dispatcher in production | Weakens delivery |
| Remove assertion / retry-until-green | Hides the contract |
| Fake `IOutboxPublisher` | Would not prove the real registration path wrote the row |
| Split into a new processor integration | Out of this close-block scope; unit tests already cover claim/complete |

## Section 4: Detailed Change Proposals

### Test host

`IntegrationTestWebApplicationFactory.ApplyDefaultSettings`:

```
UseSetting("Outbox:Enabled", "false")
```

Uses the existing dispatcher gate. No production default change.

### Enqueue tests

`RegistrationSubmit_EnqueuesConfirmationOutboxMessage` and `RegistrationSubmit_EnqueuesOperatorNotifyOutboxMessage` assert:

- message type
- dedupe key
- default tenant
- `Pending`
- `AttemptCount == 0`
- `ClaimedAt` / `ProcessedAt` null
- payload `RegistrationId`

### Tracker

- Story 38.3 remains `review`
- Epic 38 remains `in-progress`
- No 38.4 story created

## Section 5: Implementation Handoff

- **Scope:** Minor — Developer agent (Amelia / `bmad-dev-story` + `bmad-code-review`)
- **Success:** Outbox integration tests pass locally; independent adversarial review has no unresolved BLOCKER/MAJOR; PR opened against `main`; not merged
- **Next PO gate:** Review and merge this reliability PR, then re-verify `main` CI and close Story 38.3
