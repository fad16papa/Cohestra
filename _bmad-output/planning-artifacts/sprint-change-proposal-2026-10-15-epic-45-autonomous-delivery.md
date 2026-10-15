---
workflow: bmad-correct-course
date: 2026-10-15
change_trigger: Story 19.3 UAT acceptance still assumes owner SSH, droplet rebuild, human CAPTCHA, and OTP inbox
scope_classification: Major
selected_approach: Hybrid — new enabling Epic 45 + direct adjustment of Story 19.3/19.5 acceptance evidence
owner_authorization: "Owner intent 2026-10-15: create Epic 45, pause manual 19.3 execution, replace manual evidence with stronger machine-verifiable evidence, do not weaken security"
---

# Sprint Change Proposal — Epic 45 Autonomous Delivery & UAT Acceptance

## 1. Issue Summary

Story 19.3 (reCAPTCHA production enablement) cannot close through the current Cloud Agent loop. The story file and enterprise AC still assume:

- owner SSH onto the droplet
- owner edits `.env` and runs classify / preflight / compose rebuild
- owner (or agent-guided owner) solves a real Google CAPTCHA
- owner reads an OTP email
- owner pastes stdout/screenshots back into chat

The owner has now forbidden that as the normal path. The repository already has CI, `remote-deploy.sh`, UAT isolation guards, smoke, and recaptcha code — but GitHub Deploy is mis-named (`deploy-production`), secretless, and produces no machine-readable evidence.

This is a **failed evidence approach**, not a failed product requirement. Signup abuse protection on real UAT must get stronger, not weaker.

## 2. Impact Analysis

### Epic Impact

| Epic | Impact |
| ---- | ------ |
| Epic 19 | Stays in-progress. 19.1/19.2/19.4 remain done. 19.3 stays ready-for-dev (not `done`). 19.5 stays ready-for-dev after 19.3. Production remains NO-GO. |
| Epic 45 (new) | Enabling control/execution/evidence plane. Number 45 is free (highest tracker epic is 44). |
| Epic 33 | 33.7 remains in `review`. Not this change. Do not divert into Cinema. |
| Epic 44 | Done. Unchanged. Platform ops console is not a substitute for UAT deploy. |

### Story Impact

| Story | Change |
| ----- | ------ |
| 19.3 | Replace “human solves live CAPTCHA + owner paste” with dual-layer machine contract (Layer A real UAT keys/widget/negatives; Layer B official Google test keys on isolated automation only). |
| 19.5 | Keep operator/core-flow matrix. After 45.4+, machine-verify everything that is machine-verifiable. Stop only for genuine subjective/product/business judgment. |
| 45.1–45.8 | New stories. See epic file. |

### Artifact Conflicts

- `epics-cohestra-enterprise.md` Story 19.3 AC — update via this proposal; do not shrink security.
- `docs/deploy/github-actions-cd.md` — stop recommending “do not put any deploy key in GitHub”; instead require a *dedicated* key on Environment `uat` (not the owner workstation key, not Cursor).
- Architecture — new Epic 45 spine; inherit enterprise isolation / no-impersonation / no live Paddle on UAT.
- UX — no product UI redesign. Playwright viewports 1440×900 and 390×844 are acceptance surfaces.

### Technical Impact

GitHub Actions becomes the execution plane. Droplet remains the deploy target. Cursor/BMAD/Grok 4.6 remains the control plane and consumes artifacts. No Cursor SSH. No production deploy automation in this epic.

## 3. Recommended Approach

**Hybrid: Option 1 Direct Adjustment + new epic.**

- Option 1 alone (only rewrite 19.3) would still leave no execution plane.
- Option 2 Rollback is not viable — 19.1/19.2/19.4 live evidence stays.
- Option 3 MVP reduction is rejected — do not defer public-signup abuse protection.

**Rationale:** The product AC (real UAT recaptcha enabled; empty/invalid rejected; signup+OTP works) stays. The *method of proof* changes from owner theater to artifacts. That requires an enabling epic.

**Risk:** Low if secrets stay in GitHub Environment `uat` and test keys never enter UAT compose. High if anyone “just disables recaptcha on UAT” or solves live CAPTCHA via a third-party service — both forbidden.

## 4. Detailed Change Proposals

### Story 19.3 — Acceptance Criteria

**OLD:**

- Owner installs keys on the droplet, rebuilds web/api by hand.
- Apex `/signup` shows the widget (human eyeball).
- Legitimate UAT signup + OTP verify completes (human CAPTCHA + human inbox).
- Missing/invalid token rejected (optional manual probe).

**NEW (stronger, machine-verifiable):**

Layer A — real UAT keys on `https://uat.cohestra.app` (do not solve the challenge):

- Server and web recaptcha enabled; site key and secret configured (presence/boolean only).
- Bypass tokens absent.
- Google script loads; widget/iframe renders; no domain-key error.
- CSP permits required recaptcha resources.
- Empty token rejected server-side.
- Invalid token rejected server-side.
- Shared CRM remains Healthy; production NO-GO.

Layer B — official Google reCAPTCHA v2 *test* keys on an isolated CI/automation stack only:

- Valid test CAPTCHA → signup → OTP retrieve → OTP verify → auth handoff → onboarding.
- Test keys never substituted into normal UAT or production compose.

**Rationale:** Removes an unavoidable human gate without disabling real-domain protection.

### PRD / MVP

MVP public-signup abuse protection is unchanged. Evidence method is upgraded. Production cutover stays out of MVP for this change.

### Architecture

New spine: `_bmad-output/planning-artifacts/architecture/architecture-cohestra-epic-45-2026-10-15/ARCHITECTURE-SPINE.md`.

### UI/UX

No marketing/operator visual redesign. Add automated viewports for UAT acceptance.

### Secondary artifacts

- `.github/workflows/deploy.yml` → `deploy-uat` + `environment: uat` + fail-closed
- `deploy/uat-acceptance.sh` (45.2)
- Playwright UAT project (45.4)
- Acceptance summary schema (45.7)
- Autonomous loop policy (45.8)
- One-time secret bootstrap matrix (names only)
- One-time autonomous merge policy (not assumed approved)

## 5. Implementation Handoff

**Scope:** Major planning, then Developer execution of 45.1 immediately (in-repo, no droplet).

| Role | Responsibility |
| ---- | -------------- |
| Grok 4.6 / Architect | Spine, security boundaries, recaptcha dual-layer, secret matrix |
| Grok 4.6 / PM | Epic 45 stories, 19.3/19.5 AC correction, sprint-status |
| Grok 4.6 / Dev | Implement 45.1–45.8 in order; resume 19.3 through pipeline |
| Composer 2.5 | Light tasks only after Grok design |
| Owner | (1) Populate GitHub Environment `uat` secret *names* listed in the bootstrap matrix. (2) Approve or reject autonomous merge policy once. (3) Later: mailbox provider for 45.5. Never paste secret values into chat. |

**Success criteria**

- No standing owner SSH loop.
- 19.3 closes only with Layer A + Layer B artifacts on an accepted SHA.
- Production remains owner-gated.

## Checklist record

1. Understand trigger — [x] Done
2. Epic impact — [x] Done
3. Artifact conflicts — [x] Done
4. Path forward — [x] Hybrid selected
5. Proposal components — [x] Done
6. Owner approval — [x] Authorized by the 2026-10-15 autonomous-delivery intent (create Epic 45; correct 19.3; do not weaken AC)

Correct Course workflow complete.
