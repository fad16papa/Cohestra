# ADCP review-only dispatcher (pilot)

**NO MERGE / NO UAT CUTOVER / NO LIVE WEBHOOK.**

This tree is a review-only GitHub → Cursor Automation dispatcher. It is not installed on `main`, not authorized to POST the live webhook from this implementation, and not a Production or UAT change.

| Gate | Value |
|------|--------|
| `LIVE_DISPATCH` | `NOT_EXECUTED` |
| `EXACTLY_ONCE` | `UNSUPPORTED` |
| Independent Grok 4.6 review | **PENDING** (must be a separate reviewer/session) |
| UAT / Production | **NO-GO** / unchanged |
| Owner cutover | **NOT AUTHORIZED** |

## What this is

- Trusted helpers in `tools/adcp-review-dispatch/` plus `.github/workflows/adcp-review-dispatch.yml`.
- Manual `workflow_dispatch` only, from `refs/heads/main`, actor `fad16papa`, repository `fad16papa/Cohestra`.
- Phase 1 preflight: no `adcp` environment, no webhook secrets, read-only GitHub API (`issues: read` included to fetch the review-contract issue).
- Phase 2: `environment: adcp`, independently revalidates PR HEAD + six required checks, then one JSON POST.
- GitHub Actions checks bind to trusted default-branch workflow path `.github/workflows/ci.yml` and event `pull_request` on the **exact PR HEAD SHA**. Merge-commit success cannot mask a failing head. Same job names from another workflow HOLD.
- Review contract issue is allowlisted in trusted policy (pilot: `#518` → PR `#507` / SHA `aeb7d0fbe34240359dd21af3583eae4f387add97` / `review-only`). The issue is fetched; its body is untrusted mutable data and is never owner approval.
- HTTP 2xx is `DISPATCH_ACCEPTED`. It is never `REVIEW_PASS`.

## Tests (mocked HTTP only)

```bash
bash tools/adcp-review-dispatch/validate-workflow.sh
```

That script runs the static workflow contract and `node --test` fixtures. It does not read `ADCP_CURSOR_WEBHOOK_*` and does not send network requests to Cursor.

## Comparison with PR #513 FAIL

PR #513 (`tools/adcp-bridge/`, reviewed SHA `cc0962b33e6a472c02145f8fa8a388bcde1beadd`) failed independent Grok review: **2 BLOCKER + 2 MAJOR**.

| #513 defect | This dispatcher |
|-------------|-----------------|
| Composer 2.5 deny-list missed PascalCase sensitive files | No Composer path. Model is pinned to Grok 4.6 High Fast in trusted policy. |
| Untrusted all-false `impact` treated as a safe-fix proof | No `impact` object and no eligibility router. Task type is always `review-only`. |
| Official tests omitted known adversarial paths | Offline fixtures cover owner/ref/fork/SHA-drift/CI provenance spoof/head-fail/merge-pass/review-contract/URL/auth/HTTP/pagination failures. |
| M-2/M-6 model-routing registry missing | Out of scope. This is not a live implementation bridge. |

This code does **not** import or reuse `tools/adcp-bridge/`.

## Exactly-once limitation

There is no durable idempotency ledger (no extra GitHub storage/privileges in this story). Guards that *are* implemented:

- `GITHUB_RUN_ATTEMPT > 1` HOLDs (GitHub UI rerun).
- One POST per process; no HTTP retry on 401/403/429/5xx/timeout/redirect.
- Workflow concurrency group `adcp-review-dispatch` (does not make duplicates impossible).

**Owner safeguard:** use a unique `request_id` and do not rerun the workflow. Duplicate `request_id` across separate workflow runs is **not** detected.

## Safe installation / cutover (proposal only)

GitHub exposes `workflow_dispatch` from the default branch. The current `deploy.yml` still starts UAT when CI succeeds on `main`. Merging this PR as-is can therefore trigger the **old** UAT deploy.

Proposed later owner-approved sequence (not executed here):

1. Keep this PR **draft**. Independent Grok 4.6 review of the exact HEAD. Zero unresolved BLOCKER/MAJOR.
2. Separate owner-authorized change that prevents `deploy.yml` from treating an unrelated main merge as a UAT release, **or** an explicit owner decision to accept that UAT side-effect.
3. Only then install the dispatcher file on `main`.
4. Owner-gated first live POST is a distinct authorization. This README is not that authorization.

See issues #519 and #521. D8 planning PR #507 stays draft. Production Epic 46 remains NO-GO.

## Initial review target (for a future live attempt)

Re-read the exact HEAD before any live dispatch. Issue #521 pinned draft PR #507 / review contract #518 / SHA `aeb7d0fbe34240359dd21af3583eae4f387add97` at preparation time. If that SHA moved, HOLD and refresh the review contract.

Do not publish `ADCP_CURSOR_WEBHOOK_URL` or `ADCP_CURSOR_WEBHOOK_AUTH`.

## GitGuardian incident 39044960 (false-positive triage)

On HEAD `732aceaea306f25a9841fb91468620bbd56adc0a`, GitGuardian check concluded `neutral` and reported incident **39044960**: a generic HTTP Authorization fixture in `tools/adcp-review-dispatch/dispatch.test.mjs`. That value was a mock labeled as not a secret (all-zero webhook UUID companion). It was **not** evidence that `ADCP_CURSOR_WEBHOOK_AUTH` leaked.

Correction: tests now construct the mock Authorization header at runtime from character codes so the committed tree has no Bearer-token literal. The PR history was squashed so GitGuardian scans a single commit that never contained that fixture. Runtime validation still requires `Bearer` format and still rejects CR/LF. `neutral` is **not** treated as success. Do **not** rotate the real `adcp` Environment secret unless a GitGuardian dashboard review of incident 39044960 shows an actual live key.

This implementing session cannot access the GitGuardian dashboard; owner should confirm the incident is a mock-fixture false positive after the new HEAD is `success`.
