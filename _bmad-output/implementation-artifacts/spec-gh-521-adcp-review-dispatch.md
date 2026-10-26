---
title: 'GH-521 ADCP review-only Cursor webhook dispatcher'
type: 'feature'
created: '2026-10-26'
status: 'in-review'
baseline_commit: 'e962c8c3eead953a1f56f2b397b3e9d4fc669041'
context:
  - '{project-root}/_bmad/custom/mandatory-code-review-loop.md'
  - '{project-root}/_bmad-output/project-context.md'
---

<frozen-after-approval reason="human-owned intent from GitHub issue #521 — owner-authorized implementation contract for this isolated branch; do not modify unless human renegotiates">

## Intent

**Problem:** Cohestra needs an owner-gated, review-only GitHub → Cursor Automation webhook dispatcher so a pinned Grok 4.6 review can be requested without paste-and-pray, without merging to main, and without treating HTTP 200 as review success.

**Approach:** Add a `workflow_dispatch`-only GitHub Actions workflow plus versioned trusted Node helpers that preflight on main, revalidate after the `adcp` Environment gate, and POST one sanitized JSON review request. Tests use mocked HTTP only. Live webhook, main merge, UAT, and Production stay unauthorized.

## Boundaries & Constraints

**Always:**
- Manual `workflow_dispatch` from `refs/heads/main` in `fad16papa/Cohestra` by owner `fad16papa` only.
- Inputs limited to `pr_number`, `expected_sha` (40 hex), `review_contract_issue`, `request_id`.
- Phase 1: no `adcp` environment, read-only GitHub token, trusted checkout of the dispatch SHA, never PR HEAD.
- Phase 2: `environment: adcp` only after owner gate; independently revalidate PR HEAD/CI/task immediately before HTTP; webhook URL+Authorization exclusively from `ADCP_CURSOR_WEBHOOK_URL` / `ADCP_CURSOR_WEBHOOK_AUTH`.
- Allowlist `https://api2.cursor.sh/automations/webhook/<uuid>`; no redirects, query, userinfo, or CR/LF in URL/auth; `Bearer` format; `Content-Type: application/json`; one POST; no retry on 401/403/429/5xx/timeout.
- HTTP 2xx is `DISPATCH_ACCEPTED`, never `REVIEW_PASS`. Payload is review-only, pins repo/PR/SHA/issue/Grok 4.6/BMAD/CAT-SEC, and is untrusted to the Cursor agent.
- Six named checks must be `success` on the exact PR SHA (or that open PR's merge commit): `.NET build and test`; `API integration tests`; `Next.js build`; `UAT isolation contract`; `Docker stack smoke`; `GitGuardian Security Checks`. Never accept `neutral`/`skipped`/`cancelled`/`timed_out`/`action_required`/missing/stale or the wrong app origin. Distinguish PR-head CI from later main-merge CI.
- Evidence JSON is sanitized: `review_target_pr`, `review_target_sha`, `attempt_id`, `dispatch_status`, `model_expected`, `ci_evidence`, `review_completion_status`. Never webhook URL/key.
- Compare against PR #513 FAIL (2 BLOCKER + 2 MAJOR): do not import `tools/adcp-bridge/`; no Composer routing; no trusted self-asserted `impact`.
- This implementing session must not claim independent Grok security review. Draft PR stays pending a separate Grok 4.6 reviewer.

**Ask First:**
- Any live webhook POST, credential change, main merge, UAT/Production workflow edit, or widening of host allowlist/permissions.

**Never:**
- `push` / `pull_request` / `pull_request_target` / `workflow_run` / `repository_dispatch` / cron / issue-label triggers.
- Calling the live webhook from tests or this implementation session.
- Approving/merging PRs; UAT or Production secrets, Docker, SSH, OIDC, repo push, admin, or environment alteration.
- Durable exactly-once ledger (not available without extra privilege/state): document `EXACTLY_ONCE=UNSUPPORTED` and HOLD GitHub reruns (`run_attempt > 1`).
- Publishing webhook URL or auth header in code, fixtures, logs, or PR text.
- Installing this workflow onto `main` as part of this story (cutover is owner-gated because `deploy.yml` still auto-deploys UAT on successful main CI). See #519.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Good owner dispatch | main, owner actor, same-repo open PR, base main, SHA matches, six trusted checks success | exactly one mocked POST; `DISPATCH_ACCEPTED`; `review_completion_status=NOT_CLAIMED` | N/A |
| Wrong repo/ref/actor/input | non-main, other repo, non-owner, malformed SHA/id | HOLD; zero HTTP | fail closed |
| Fork / wrong base / merged PR | fork head, base not main, merged | HOLD (`pr_is_fork` / `pr_base_not_main` / `pr_merged_main_ci_not_pr_head`) | fail closed |
| SHA drift during Environment approval | preflight SHA A, revalidate SHA B | HOLD `head_changed_during_approval`; zero HTTP | fail closed |
| Bad CI evidence | missing/failed/skipped/neutral/stale/wrong-app check | HOLD; zero HTTP | fail closed |
| Bad webhook secret | empty/malformed Bearer, CR/LF, disallowed host, redirect | HOLD; zero HTTP | fail closed |
| Replay / error HTTP | run_attempt>1, 401/403/429/5xx/timeout | fail closed; no retry | `EXACTLY_ONCE=UNSUPPORTED` |
| Trigger surface | workflow YAML | `workflow_dispatch` only; no approve/merge/UAT/Production perms | static contract test |

</frozen-after-approval>

## Code Map

- `.github/workflows/ci.yml` -- existing required checks; add dispatcher contract step to `UAT isolation contract` only (do not change UAT/Production deploy workflows).
- `.github/workflows/deploy.yml` -- UAT auto-deploy on main CI; do not modify; cutover blocker documented.
- `.github/workflows/deploy-production.yml` -- Production dispatch; do not modify.
- `deploy/validate-inspect-production-oidc-workflow.sh` -- pattern for static workflow contract tests.

## Tasks & Acceptance

**Execution:**
- [x] `.github/workflows/adcp-review-dispatch.yml` -- add manual two-phase review-only dispatcher -- privileged control plane must live in trusted workflow YAML
- [x] `tools/adcp-review-dispatch/policy.mjs` -- pin repo, actor, host/path, checks, model, BMAD skills -- policy must not load from the reviewed PR
- [x] `tools/adcp-review-dispatch/validate.mjs` -- pure offline validators for context, inputs, PR, checks, URL/auth, payload, evidence -- testable without secrets
- [x] `tools/adcp-review-dispatch/dispatch.mjs` -- preflight + revalidate + injectable transport -- tests mock HTTP; live POST only when allow-listed and flagged
- [x] `tools/adcp-review-dispatch/run.mjs` -- CLI for Actions; env-only secrets; no shell interpolation -- GHA entrypoint
- [x] `tools/adcp-review-dispatch/dispatch.test.mjs` -- positive/negative fixtures from the I/O matrix -- executable mocked tests
- [x] `tools/adcp-review-dispatch/validate-workflow.sh` -- static YAML contract including no PR-HEAD checkout in the secrets job -- CI-enforced
- [x] `tools/adcp-review-dispatch/README.md` -- owner cutover strategy, #513 comparison, exactly-once limitation, `LIVE_DISPATCH=NOT_EXECUTED` -- required owner report
- [x] `.github/workflows/ci.yml` -- run the dispatcher contract from the existing UAT isolation job -- keep the six required check names stable

**Acceptance Criteria:**
- Given a good owner main dispatch fixture, when preflight+revalidate run with mock transport, then exactly one mocked webhook POST occurs and evidence says `DISPATCH_ACCEPTED` with `review_completion_status=NOT_CLAIMED` and `live_dispatch=NOT_EXECUTED`.
- Given any negative fixture in the matrix, when the dispatcher runs, then it HOLDs or rejects closed, performs zero HTTP, and does not log URL/token.
- Given the new workflow file, when the static contract test runs, then the only trigger is `workflow_dispatch`, the secrets job uses `environment: adcp`, and that job cannot check out PR HEAD.
- Given this implementation SHA, when the implementer finishes, then a draft PR against main exists with a conspicuous no-merge notice, independent Grok 4.6 review is requested and not self-claimed, and UAT/Production workflows are unchanged.

## Spec Change Log

- 2026-10-26 — Headless cloud-agent run: GitHub issue #521 is the frozen owner implementation contract. Spec written and marked in-progress without an interactive [A]/[E] halt because the issue already authorized isolated-branch implementation.
- 2026-10-26 — Implementation complete on isolated branch. Offline `node --test` + workflow contract PASS (53 tests). Independent Grok 4.6 review is NOT claimed from this implementing session and remains required on the final SHA.
- 2026-10-27 — Correction cycle 1/3 (issue #521 owner contract; PR #522 FAIL review of `732aceae`). MAJOR-1 scanner-safe mock auth (no committed Bearer literal; do not waive GitGuardian `neutral`). MAJOR-2 bind Actions checks to `.github/workflows/ci.yml` + `pull_request` + exact HEAD SHA; reject PR-workflow spoof and head-fail/merge-pass. MAJOR-3 allowlist review contract #518, fetch issue, treat body as untrusted. MINOR-1 triggering_actor in shell guard; MINOR-2 fail-closed pagination; MINOR-3 `previous_filename`; MINOR-4 origin-allowlisted next links. Independent Grok 4.6 review is still NOT claimed from this implementing session.

## Design Notes

Do not reuse PR #513 `tools/adcp-bridge/`. That HEAD failed independent Grok review (Composer PascalCase deny-list + untrusted all-false `impact`). This dispatcher has no model router and no Composer path; model is pinned to Grok 4.6 High Fast in trusted policy.

Exactly-once delivery is **unsupported**. In-run guards: refuse `GITHUB_RUN_ATTEMPT > 1`; one POST per process; no HTTP retry. Cross-run duplicate `request_id` requires a durable ledger this story does not add. Owner must use one manual run per `request_id`.

Webhook host allowlist is the public Cursor Automation path `api2.cursor.sh/automations/webhook/<uuid>` (docs/forum). The owner-supplied URL/token must never be copied into the repo.

## Verification

**Commands:**
- `node --test tools/adcp-review-dispatch/dispatch.test.mjs` -- expected: all mocked tests pass; no live HTTP
- `bash tools/adcp-review-dispatch/validate-workflow.sh` -- expected: workflow contract + node tests pass
- `git diff -- .github/workflows/deploy.yml .github/workflows/deploy-production.yml` -- expected: empty
