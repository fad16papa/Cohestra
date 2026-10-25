# Cohestra ADCP Bridge, credential-free prototype

STATUS: MOCK / NOT INSTALLED / NOT LIVE / NO MERGE AUTHORIZATION

This is the first executable, deliberately offline portion of the GitHub-to-Cursor bridge.
It performs static task routing, conservative impact and protected-path checks,
duplicate/occupied-HEAD checks, and emits an explicit MOCK_ACCEPTED_NO_DISPATCH result.

Run on Node 20+:

    node --test tools/adcp-bridge/dispatch.test.mjs
    node tools/adcp-bridge/dispatch.mjs mock tools/adcp-bridge/example-task.json

Safety boundaries:
- No GitHub Actions workflow, Cursor API call, credentials, GitHub permissions, secrets, or environment.
- Does not accept an owner-approved flag as evidence of authorization.
- All evaluated tasks use immutable SHA and allowlisted repository; unknown impacts fail closed.
- The primary assigned model is Grok 4.6 for engineering or Composer 2.5 ONLY for low-risk simple bug fixes.
- This static classifier is a conservative mock and cannot replace independent semantic review.
- Internal helper models are disclosed as not attested, as approved in D7/D17.
- Neither passing mock tests nor green PR CI proves a live dispatcher is secure.

Separate mandatory owner gates BEFORE activating a live execution bridge:
(1) Final ADCP architecture D8, source and permission design D12/D13.
(2) Protected main/privileged files D10, GitHub actor verification D11.
(3) Isolated adcp Environment D4, and separately approved dedicated Cursor API key D5.
(4) A reviewed workflow_dispatch, authenticated model catalog GET /v1/models,
    explicit approved model.id, POST /v1/agents, run poll/cancel/idempotency;
    default-deny permissions and never pass keys to agent prompts/envVars.
(5) First approved pilot in an isolated non-Production branch, exact-head Grok BMAD review,
    CI/GitGuardian, bounded costs/loops. No merge or UAT/Production deploy.

The repo is currently public, main unprotected, and a successful CI run on main
triggers UAT deploy. This draft is intentionally isolated, never merge without owner gate.
See ADCP planning PR #507 and Issues #508, #512.
