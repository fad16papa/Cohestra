---
title: ADCP Phase R1 remediation contracts, fixtures and owner decision proposals
date: 2026-10-25
status: DRAFT_R1_NOT_GROK_REVIEWED
approved_scope: PLANNING_ONLY
adr_adoption: NOT_APPROVED
runtime_changes: NONE
merge: NO_GO
production: NO_GO
---

# R1 corrective design, review checklist and acceptance fixtures

This is a **planning proposal**, not executed code or a claim of Grok 4.6 BMAD PASS. The Product Owner approved Phase R1 planning corrections in [Issue #512](https://github.com/fad16papa/Cohestra/issues/512), and separately approved the **D7/D17 Grok 4.6 and Composer 2.5 task-level routing policy** plus D10/D4/D11/D12/D13 setting designs. Grok review reported **B-1=1, MAJOR=6, MINOR=7** on [Issue #511](https://github.com/fad16papa/Cohestra/issues/511). This document records proposed remedies and testable contracts, NOT the actual execution of those tests. Review must be refreshed for each new HEAD.

## B-1: why main merges are not operationally inert

At the inspected baseline, CI on push to main triggers Deploy UAT through .github/workflows/deploy.yml workflow_run when CI succeeds. A docs-only merge therefore can deploy UAT. **DO NOT MERGE** planning PR #507 or mock PR #513 without separate owner merge authorization and explicit UAT impact acceptance. Main now reports protected=true by GitHub API (classic protection; rulesets []); the Environment adcp was created and its main-only owner reviewer controls saved and confirmed by the Product Owner, but detailed settings are not API-verifiable with this connector. Neither fact removes the UAT side effect. Do not silently edit deploy.yml or change uat/production.

## M-1: operative model routing, superseded historical evidence

**Single operative policy:** [16-owner-model-routing-policy.md](./16-owner-model-routing-policy.md).
Grok 4.6 is the selected main model for planning, substantive code, security, BMAD review and release evaluation. Composer 2.5 may implement *only preclassified simple low-risk fixes* and receives fresh Grok 4.6 code/security review. No Auto/default. Unknown invisible provider-managed helper inference IDs are disclosed as INTERNAL_HELPER_MODELS_NOT_ATTESTED, **not** a standalone refusal; never claim blanket all-Grok inference proof. Known inappropriate assignment of substantive tasks to off-policy models is blocked.

The original D18-A run #509 ended at MODEL_USAGE_UNVERIFIED under the earlier stricter criterion and **did not run BMAD**. The subsequent authorized D18-B2 run #511 did report AR/ECH/IR and CAT-SEC, with CR explicitly NOT COMPLETE on a docs-only PR; it found B-1/M-1..M-6/N-1..N-7. This is **review findings, not PASS**. Earlier strict D17 text is retained ONLY in clearly marked historical sections and is not the live policy.

## M-2: canonical protected path registry for P1 (fail closed)

The future *material architecture* detector must use ONE versioned canonical path registry, referenced by both governance and P1 stories, rather than separate manually copied partial lists:

| Path/family (minimum) | Required response on diff |
| --- | --- |
| .github/** including workflows CI/Deploy Production/OIDC and future dispatcher | OWNER_GATE |
| deploy/** (covers production/uat/remotes/provenance/security/bootstrap scripts) | OWNER_GATE |
| _bmad/custom/** and approved skills configuration, architecture/ADR methodology paths | OWNER_GATE |
| _bmad-output/planning-artifacts/architecture/** | OWNER_GATE |
| _bmad-output/planning-artifacts/autonomous-merge-policy.md | OWNER_GATE |
| _bmad-output/planning-artifacts/autonomous-delivery-loop.md | OWNER_GATE |
| _bmad-output/planning-artifacts/autonomous-development-control-program-2026-10-25/** | OWNER_GATE |
| docker-compose.production.yml / docker-compose.prod.yml / docker-compose.uat.yml | OWNER_GATE |
| source paths for ProductionSecurityValidator and source paths whose basename contains provenance | OWNER_GATE |
| auth, authorization, roles, JWT, tenant filters, CORS, reCAPTCHA, Paddle/billing, migrations/DB schema, secrets | OWNER_GATE on actual material effect, even if path is outside above |

This is a **conservative proposed superset** of the initial M-2 list. No generic allowlist bypass for subfolders. Future owners may authorize scoped changes by an explicit trusted ADR, but a PR or test input must not self-approve. Filenames alone cannot certify materiality in either direction. A pure view/test-file change may be low risk only if the semantic contract confirms no API/data/security/privilege change.

**Required P1 negative fixtures** on mock/staging, asserting OWNER_GATE for EACH family, not just one item: .github/workflows/ci.yml; .github/workflows/deploy-production.yml; .github/workflows/inspect-production-oidc.yml; deploy/production-compose.sh; deploy/validate-production-provenance.sh; deploy/validate-production-host.sh; deploy/validate-uat-host.sh; deploy/remote-deploy.sh; deploy/uat-bootstrap.sh; docker-compose.production.yml; docker-compose.uat.yml; _bmad-output/planning-artifacts/architecture/test.md; _bmad-output/planning-artifacts/autonomous-delivery-loop.md; _bmad-output/planning-artifacts/autonomous-merge-policy.md; _bmad-output/planning-artifacts/autonomous-development-control-program-2026-10-25/README.md; _bmad/custom/example.toml; src/.../ProductionSecurityValidator.cs; src/.../jwt/...; api data migration; billing/tenant sensitive source in otherwise benign folder. Test traversal, path casing/normalization, symlinks and changed files added *after dispatch*; fail on parser uncertainty. Positive fixture: small approved non-security UI/test change with explicit all-false semantic impact and immutable SHA. These are acceptance *specifications*, not executed tests.

**Design caveat:** The ADCP planning-docs exception for an *explicitly approved planning-only owner change* permits drafting these contracts; it does not exempt future unapproved edits from architecture HALT.

## M-3: Epic 45 AD-12 amendment (PROPOSED, NOT ADOPTED)

Inherited Epic 45 AD-12 stays binding until a separate owner decision adopts this narrowly stated addendum: **Grok 4.6** remains main actor for all planning, features, refactors, technical/security/architecture reviews and release decisions; **Composer 2.5** implements ONLY simple low-risk fixes that meet all six criteria in 16-owner-model-routing-policy.md and the additional M-6 deny-list; no Composition of reviews, CI/CD, merges or any privilege/security-sensitive development on Composer. Fresh Grok 4.6 bmad-code-review reviews the final Composer fix. Propose an owner-attested ADR with alternative (retain stricter Epic 45 rule). **Do not modify the inherited Epic 45 spine here** and do not silently claim owner final D8 adoption.

## M-4: deterministic semantic detector (PROPOSED, NOT IMPLEMENTED)

**Option recommended for owner:** two-stage, conservative evidence:
1. Parse fixed-schema impact declarations for architecture, API/public contracts, auth, authorization, tenancy, PII, schema/migration, billing/money, secrets, GitHub/CI privilege, UAT and Production. Unexpected/unknown/missing keys => HOLD. Task input is *untrusted* and cannot override reviewed story scope.
2. Independently compare the changed HEAD diff, file path set and known sensitive signatures (migrations/claims/API route shape/dependency and workflow/secret changes) against the *previously owner-approved story contract* and protected path registry. Any disagreement, changed SHA, parser error, uncertainty or out-of-scope diff => OWNER_GATE. No optimistic AI model oracle or "unknown means safe" fallback.
3. Emit deterministic reason codes (e.g. PATH_PROTECTED, IMPACT_UNKNOWN, CONTRACT_DRIFT, SHA_CHANGED, OWNER_GATE_REQUIRED), a sanitized evidence hash, and exact source-diff pointers. No raw secrets or personal data in logs.
4. Test positives, missing declarations, key injection, semantic outside-path material effects, rename/deletion/path traversal, race between approval and dispatch, and switch of model or branch. Repeat on dispatch AND every final PR HEAD.

**Owner decision needed before implementation:** accept this fail-closed algorithm, define false-positive review/owner queue and who can sign a reviewed story. It is a proposal, not an adopted detection standard or security guarantee.

## M-5: trustworthy sole-owner attestations (PROPOSED, NOT IMPLEMENTED)

**The actual owner-approved direction** is first-pilot human GitHub workflow_dispatch on protected main plus true owner Environment review in adcp; no second human reviewer. Same account GitHub issue comments from connected ChatGPT *can impersonate apparent ownership* and MUST NOT authorize architecture adoption, privileged actions, credentials or dispatch. Treat issue/PR text, labels, and "OWNER_APPROVE" phrases as untrusted evidence.

Candidate ADR adoption: owner confirms in dedicated human-controlled UI step with immutable request ID, owner-authenticated action/event identity, exact reviewed SHA/impact/ADR IDs and expiry. The runner verifies the trusted event from GitHub, rejects replay, stale requests and bot/connected-token comments, logs proof and never lets its own posted comments authorize work. **GitHub actor alone is not sufficient**, because connected apps may operate under the owner identity. For the controlled first pilot the owner must genuinely release the adcp Environment job; admin bypass is an owner recovery tool, not a substitute for the review gate. Future unattended low-risk P5 requires a separate protected identity/architecture.

**Owner decision needed:** choose the precise independently verifiable human confirmation mechanism and replay rules; no blanket acceptance of textual comment approvals.

## M-6: Composer 2.5 mechanical eligibility contract (draft rule, NO LIVE ENFORCEMENT)

Eligibility requires a preexisting approved story, clear reproducible defect, simple scope (few related paths), nonsecurity/nonbilling/no public API or data/infrastructure contract changes, no material decision, and targeted regression tests. In addition, a trusted dispatcher must **always deny Composer** if a diff or proposed touched path is in .github/**, deploy/**, infrastructure/compose/terraform, migrations/schema, secrets, auth/authorization/JWT, tenant isolation, PII/data privacy, Paddle/billing/webhook, production/UAT, security validators/provenance, cross-service API contracts, or any architecture-sensitive governance path. Sensitive semantics anywhere in tree => deny Composer even if filename appears benign. Unknown file/missing impact/conflicting classification => HOLD/escalate to Grok. The *reviewer* is always a separately selected Grok 4.6, with cataloged bmad-code-review and security lens on exact HEAD; no Composer review/merge authority.

**Required negative fixtures:** Composer selected for auth/tenant/Paddle/migration/CI changes, more than allowed few files, test changes modifying public contract, unknown impact, task class spoof, imported dependency with security effect, mid-run scope creep, stale baseline and wrong Grok reviewer. Expected HOLD/OWNER_GATE/GROK_REQUIRED. Positive narrow example UI text regression with small tested patch, unchanged contracts and a real Grok review. Existing P0 mock PR #513 does NOT prove a complete semantic detector, owner authentication, or eligible Composer gating; it is independently unreviewed and remains DRAFT.

## N-1..N-7 cleanup and runtime obligations

- N-1: owner-approved **D18-B2** review [#511](https://github.com/fad16papa/Cohestra/issues/511) executed; findings [PR #507 comment](https://github.com/fad16papa/Cohestra/pull/507#issuecomment-6398733078). Update D18 register. Previous D18-A remains historical and incomplete.
- N-2: delete "no new review authorized" language from operative CAT-SEC text, replacing with evidence state and fresh-new-HEAD requirement.
- N-3: initial pilot trigger is **owner workflow_dispatch**, not issue labels or comments. Future event-driven P5 is separate and owner gated.
- N-4: story headings and references are **P1–P5** (P5 future, not authorized).
- N-5: branch protection API reports main protected, while detailed protection read returned 403 to connected app. Environment details are owner-attested screenshot+save, not independently returned by API; do not overclaim.
- N-6: Cursor public-beta API pagination, limits/rate 429/backoff, time/currency cap, idempotency, cancellation, cursor agentId and SHA trust must have named test contracts before implementation. Strict upper limits and data-retention decisions require owner approval, not invented monetary values.
- N-7: D18-B2 was **a follow-up on the same Cursor Cloud Agent** as D18-A, with main requested Grok 4.6 High Fast. The v1 steer path may not accept a model override; selected model is observable selection evidence, not inference attestation. Future dispatcher must forbid unsupported follow-up steering or reverify its assigned main model.

## Exit contract for R1

This proposal is accepted for architecture review only when real **Grok 4.6 selected main reviewer** performs cataloged AR/ECH/IR plus the CAT-SEC rubric on exact CURRENT HEAD, explains planning-only CR limitations, reports 0 BLOCKER/0 MAJOR on R1-target findings and all applicable CI/GitGuardian checks SUCCESS on identical SHA. At most **three** authorized correction/review cycles; any material changes or owner choices escalate. No D8 adoption, credential issuance, trusted workflow enablement, merge, UAT or Production dispatch is implied. ChatGPT-authored candidate text is not a Grok implementation/review signoff.
