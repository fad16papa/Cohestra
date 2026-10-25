---
title: ADCP exact owner security configuration review packet
date: 2026-10-25
status: PROPOSED_FOR_FINAL_REVIEW_AFTER_GROK
prior_owner_preferences: D8 D10 D4 D12 preliminary-direction-only
approval: NOT_RECORDED
implementation: NO_GO
secrets: NONE_CREATED
production: NO_GO
---

# ADCP Owner Review — Exact GitHub protection, permissions, and single-owner pilot

**This is a reviewable PROPOSAL, not an adopted security design.** Do not apply GitHub settings or create tokens from this document. The sole Product Owner has preliminarily agreed with D8/D10/D4/D12 direction, **not** their final settings or any implementation.

## 0. Evidence and review scope (2026-10-25)

Repository: `fad16papa/Cohestra`, **public**, default branch `main`. GitHub repository inspection shows: `main` **unprotected**, **no rulesets**. Repository currently permits merge commit, squash merge and rebase merge. Base `main` inspected at `e962c8c3eead953a1f56f2b397b3e9d4fc669041`.

ADCP PR #507 was DRAFT, base `main`; preliminary decision register HEAD `e7705cde8ccaab44da510096670516c922705b59`. Latest CI run for that HEAD `40189731641` was still underway when preparing this packet; later exact-HEAD status must be rechecked. Five jobs in current `.github/workflows/ci.yml` are named:
- `.NET build and test`
- `API integration tests`
- `Next.js build`
- `UAT isolation contract`
- `Docker stack smoke`

GitGuardian app adds check `GitGuardian Security Checks`. `CI` runs on `push(main)` and `pull_request(main)`. **A successful CI run on main triggers existing UAT deployment** through `deploy.yml`; never treat a main merge as operationally inert. Production provenance requires **two-parent merge history** in `deploy/validate-production-provenance.sh`.

**Review missing:** independently authenticated Grok 4.6 BMAD current-HEAD adversarial, edge-case, security and implementation-readiness review, and exact final architecture owner adoption. Therefore **NO-GO to apply settings / secrets / live dispatch / merge**.

Relevant GitHub technical documentation:
- Branch protection: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- Required check semantics: https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks
- Environment policies: https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments

## D10 — Exact proposed `main` branch rules (NOT APPLIED)

| Setting | Proposed value | Reason / caveat |
| --- | --- | --- |
| Target | Default branch `main` only | Avoid altering Cursor feature branches or UAT flow inadvertently |
| Require pull request before merge | **ON** | Protect default branch from routine direct writes |
| Required human approving PR reviews | **0** | Permanent one-owner team; owner cannot approve own PR |
| Require status checks | **ON** | Enforce verified exact-head build/test gates |
| Required GitHub Actions jobs | The five names above | Source `github-actions` where supported; verify names from actual GitHub check runs |
| GitGuardian check | `GitGuardian Security Checks` from `gitguardian` app | **NOT by itself strict success**, because GitHub can count NEUTRAL as satisfying normal required checks |
| Supplemental exact-success security gate | **REQUIRED as a separate trusted check before auto-merge and Production provenance** | Must distinguish `success` from `neutral`/`skipped`/`missing`/`pending`/`failure`; fail closed on current SHA. Do not rely solely on GitHub required check |
| Require branch up-to-date | **ON, subject to CI/merge contract test** | Avoid stale base; can increase reruns. Verify exact approved head/merge commit contracts |
| Require conversation resolution | **ON** | No unresolved actionable review threads |
| Block force push | **ON** | Protect merge history and provenance |
| Block branch deletion | **ON** | Avoid accidental base deletion |
| Require linear history | **OFF** | Two-parent Production provenance requires merge commits |
| Merge queue | **OFF initially** | Existing `ci.yml` does not trigger `merge_group` |
| Require signed commits | **DEFER** | Cursor bot signing configuration unverified; enabling could deadlock automation |
| Require successful deployment before merge | **OFF** | Avoid circular dependence: UAT deploy follows successful CI on `main` |
| Restrict direct pushes / enforce on administrators | **DESIGN REVIEW NEEDED** | Desired fail-closed protection but owner recovery/bot writes/ability to amend rules must be tested; no speculative setting applied |
| CODEOWNERS | Optional advisory in solo-owner repo; do **not** enforce additional human review requirement | CODEOWNERS alone is not a substitute for a trusted branch/ruleset/owner decision policy |
| Repository merge methods | **Keep merge commits enabled**; consider disabling squash/rebase only after evaluating pre-existing non-Production workflows | PR #505 / Epic 46 two-parent history must not be accidentally broken |

**Critical security nuance:** GitHub's required status check accepts some `neutral`/`skipped` outcomes as successful. Cohestra's stricter merge/security and Production provenance contracts require verified `conclusion == "success"`. A supplemental verifier **must** check GitGuardian and required jobs on the exact current commit through a trusted route, with source-app verification, not just assume branch rules cover it.

**Trust-boundary nuance:** A repo-local workflow can be weakened by a malicious or mistaken change to `.github/workflows/**` if the same principal may merge changes. For a single-owner repo, this cannot be solved by inventing a second human reviewer. Require explicit owner material-change approval plus trusted fail-closed verification, and keep token scopes minimal. Evaluate whether a separate GitHub App check or externally trusted verification is necessary for credential-bearing automation.

**Transition risk:** If these rules apply to `main`, some previously allowed merge methods/direct writes will be blocked; successful PR merges will still trigger existing UAT deployment. Verify owner recovery behavior and run a safe staging/preflight on a non-default test branch before enforcing if practical.

## D4 — Exact proposed `adcp` Environment (NOT CREATED)

| Setting | Proposed value | Reason |
| --- | --- | --- |
| Name | `adcp` | Separate from `production` and `uat` |
| Required reviewer | Sole Product Owner `fad16papa` | No second person exists or is planned |
| Prevent self-review | **OFF for `adcp` only** | Owner-started `workflow_dispatch` would otherwise deadlock |
| Admin bypass | Disable only after checking owner's recovery path and GitHub plan support | Avoid unsafe deadlock or emergency bypass |
| Branch policy | Allow default `main` only for trusted runner; no arbitrary PR ref | Disallow credential job from untrusted PR branches |
| Environment secrets | Future service-account `CURSOR_API_KEY` only, owner-created after D5 | No personal key, Production/UAT keys or optional OpenAI key in first pilot |
| Deployment jobs | ADCP dispatcher only; do not attach `adcp` to `ci.yml` or untrusted PR jobs | Protect secrets from branch changes |
| Approval cadence | Separate owner click for **each controlled pilot run** | This is not full autonomy; don't claim it is independent-human review |

**Owner must review:** Disabling prevent-self-review in the **pilot's** `adcp` means the same person initiates and confirms the job. This is acceptable only as an explicitly owner-approved compromise for solo operations. It does **not** authorize changing `production` Environment or allow recurring low-risk automation without a separate, hardened design.

## D12 — Exact proposed dispatcher permissions (NOT APPLIED)

Workflow defaults `permissions: {}` and `persist-credentials: false` on checkout.

| Capability | Scope | Proposed |
| --- | --- | --- |
| Read source and trusted contracts | `contents: read` | YES |
| Post issue milestone updates | `issues: write` | ONLY if necessary; isolate in post-processing job when possible |
| Post PR milestone updates | `pull-requests: write` | ONLY if necessary; avoid granting write to the model-calling job if split-job design permits |
| Read Actions/check runs | `actions: read`, `checks: read` | Grant only for specific consumer job with tested API need |
| Direct source push to `main` | `contents: write` | NO |
| Dispatch arbitrary Actions | `actions: write` | NO |
| Cloud identity token | `id-token: write` | NO |
| Production/UAT access | GitHub Environments `production`/`uat` | NO |
| Modify repository rules/secrets | GitHub admin settings | NO |
| Invoke Cursor | Dedicated service-account `CURSOR_API_KEY` from approved `adcp` | AFTER owner D5, exact Grok 4.6 model verification and trusted branch |
| OpenAI advisor API | Not included in controlled pilot | FUTURE owner gate only |
| Cloud Agent prompt / `envVars` / MCP | Any secret or dispatcher key | NEVER |

**Required design improvement:** The earlier proposal used `issues:write`, `pull-requests:write` and `actions:read` as fixed defaults. These must be **minimized by job** and `checks:read` evaluated for exact-HEAD check inspection. Prevent any credential-bearing job from running arbitrary PR code, executing untrusted fork branches or reflecting secrets into logs.

## D8 — Architecture adoption boundaries (STILL PROPOSED)

AD-1..AD-10 cover owner authority, ChatGPT on-demand coordination, Grok 4.6 executor/review model, GitHub-native pilot, isolated secrets, semantic+path material architecture gate, bounded loops, independent evidence, genuine installed BMAD skills, Epic 46 separation.

**Current model evidence gate:** `GET /v1/models` has **not** been invoked with authenticated Cursor credentials, so the exact Grok 4.6 `model.id` is unknown. No Cursor API `POST /v1/agents` may be launched without explicit model-id verification, all required protections and an approved non-main story. v1 follow-up/steer model inheritance remains unverified: disable that path pending proof.

**Important ownership semantics:** ChatGPT-issued GitHub comments may appear under owner `fad16papa`; they are not proof of the owner's actual privileged approval. The owner must approve material decisions explicitly in this chat or a verified owner-operated GitHub UI, with a robust human-authorization model for the eventual dispatcher.

## Owner review status and exact choices (NOT REQUESTING FINAL APPROVAL YET)

| Decision | Recommended choice | Evidence needed before FINAL approval | Alternatives and tradeoff |
| --- | --- | --- | --- |
| D10 | Main PR/check/anti-force rules as above; strict success verifier; no 2nd human | Repo-specific branch-rule preflight, no disruption to UAT or two-parent provenance, Grok security review | Fewer rules is easier but materially weaker |
| D4 | Solo reviewer, `prevent_self_review=false` **adcp only**, branch-restricted | Settings capabilities + reviewer approval test without keys, owner confirms self-approval tradeoff | Required second human impossible; ungated secrets too permissive |
| D12 | Default-deny permissions and split jobs; no repo/UAT/Production secret access | Exact Workflow YAML with permission/secret contract tests and owner audit | Broad token easier to implement but unsafe |
| D8 | Adopt reconciled AD-1..AD-10 after model/review evidence | Fresh **current-HEAD** Grok 4.6 BMAD adversarial, edge, security and readiness PASS; owner separately signs | Partial adoption may be possible with more design gates |
| D5 | Later dedicated Cursor service credential | D4/D8/D10/D12 approved, protected environment, model id verified and no key-exfil path | Do not create key yet |
| P5 | Later limited unattended low-risk execution with different trust boundary | Separate data/identity/cost/incident/approval design and owner authorization | Pilot stays manual approval per run |

**No changes requested by Product Owner on preliminary direction**; these are the exact settings proposed for review, **not** confirmed operational controls.

## Explicit exclusions

- No GitHub branch protection or ruleset changed.
- No `adcp` Environment created, no review rule toggled, no secret created.
- No `.github/workflows/**` or deploy code changed.
- No Cursor agent launched, no Grok review falsely claimed, no PR merged.
- No UAT/Production deployment, secrets, cloud resource changes or Epic 46 mutation.
