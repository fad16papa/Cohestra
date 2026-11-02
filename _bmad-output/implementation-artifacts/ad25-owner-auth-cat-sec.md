---
label: AD25-OWNER-AUTH
status: cat-sec
head: cursor/ad25-owner-auth-incident-c2e5
also_reviewed: pr-542-ade3c828
as_of: 2026-11-02T19:40:00+08:00
---

# CAT-SEC + BMAD Security Architecture Review

Independent pass over PR #541 facts, Draft PR #542 `ade3c828`, and the owner-policy design. No GitHub settings changed. Nothing merged, installed, or deployed.

Review layers: Blind Hunter, Edge Case Hunter, CAT-SEC attack questions. Acceptance Auditor skipped — no story spec file for this incident task.

## Triage

| ID | Source | Title | Severity | Bucket | Action |
| --- | --- | --- | --- | --- | --- |
| 1 | cat-sec | `login=fad16papa` attestation is not Cursor-unforgeable | BLOCKER (design honesty) | patch | Design now states residual user-token risk; Invariant 7 rewritten |
| 2 | cat-sec | Layer B unpinned / missing `statuses: write` is spoofable | BLOCKER (if installed as previously written) | patch | Design requires `statuses: write` + live `integration_id` pin; abort if 15368/1210556/null |
| 3 | cat-sec | Required workflow is still 15368 | MAJOR | patch | Design forbids required workflow as the owner-policy gate |
| 4 | cat-sec | Layer A checklist omitted `actions` / `merge_queues` | MAJOR | patch | Phase 0 now includes the full table |
| 5 | cat-sec | `exec` of git blob is RCE; expansion vs dest-sync mixed | MAJOR | patch | App-bundled code only; Verdict A vs B split |
| 6 | cat-sec | Optional `deployments: write` is repo-wide | MAJOR | patch | `deployments: none` |
| 7 | cat-sec | No `issue_comment` re-evaluation | MINOR | patch | Events include `issue_comment` |
| 8 | cat-sec | Strict ≠ pin | NIT | patch | Checklist states it |
| 9 | blind | REST vs GraphQL merger identity “unresolved” | — | dismiss | Same Bot: REST `cursor[bot]`, GraphQL `cursor`, App 1210556 |
| 10 | blind | Auto-merge might have been the mechanism | — | dismiss | Repo `allow_auto_merge: false` |
| 11 | blind | `pull_requests: write` is the merge permission | — | dismiss | Merge requires `contents: write` |
| 12 | blind | Calling it a policy violation contradicts 0-review ruleset | — | dismiss | Organizational policy vs live ruleset; incident now distinguishes both |
| 13 | blind | Trusted-ref bootstrap poisoned because #541 is on main | — | dismiss | #541 merged to `release/uat`; `main` remains `9ccca77e` |
| 14 | edge | #542 pre-hardening fallback skips ancestor check | MAJOR (if trusted-ref treated as a gate) | defer | #542 already sets `independent_authorization: false`; HEAD pinned `ade3c828`; do not retarget this incident PR |
| 15 | edge | #542 CI YAML is PR-head 15368 | MAJOR (authorization claim) | defer | Finding 2 confirmation; not a #542 merge |
| 16 | edge | Hardening contract not in 21-path set | MAJOR (dest sync) | patch (follow-on doc) | Extra four files listed; 21-path-only copy aborted |

Dismissed: 4. Deferred (542 HEAD frozen): 2. Patched in this HEAD: 8.

## Finding 2 — PR #542 independent validation (`ade3c828`)

Re-verified:

- Exact-HEAD CI `41381583654` **SUCCESS**
- Native GitGuardian Security Checks **SUCCESS** (`gitguardian`)
- `deploy/ad25-owner-policy.json` `"independent_authorization": false`
- Fixture default `TRUSTED_SHA=9ccca77e7297dc28b0a843d3435e9603dc803da7`; refuses `TRUSTED_SHA == PRD_SHA`
- `deploy/validate-ad25-hardening.test.sh` mandatory in `ci.yml` uat-isolation; missing is HOLD
- Local worktree contract: `AD25_HARDENING_CONTRACT=PASS` (55)
- Native PR reviews on #542: **[]** (Draft; not owner approval)
- Fail-closed allowlist (canonicalize, secrets, Production, ADCP, git mode 120000, Unicode/duplicates) **when this module runs**

Trusted-ref is **not** an independent authorization root:

- `ci.yml` is PR-head YAML, GitHub Actions integration **15368**
- `authorize_from_trusted_ref` against `9ccca77e` takes the **pre-hardening fallback** in the PR-head wrapper because `9ccca77e` has no `authorize_sync`. Path-set authority is the trusted allowlist **blob**, but ancestor (`merge-base --is-ancestor`) is skipped on that branch. Docstring “never this process’s PR-head copy” is overstated for that fallback.
- A rewritten PR-head `ci.yml` can omit the call and still green `UAT isolation contract`

**#542 technical verdict:** in-repo fail-closed allowlist **PASS**. Owner-authorization **FAIL**. Draft **HOLD**. Do not merge. Do not treat CI/GG/BMAD green as owner approval.

## Attack-question answers (Finding 3)

1. Comment attestation mintable by an agent as fad16papa? **Yes.** #541 `ready_for_review` is the existence proof.
2. Environment approval mintable the same way? **Yes** (`pending_deployments` + reviewer user token). Design therefore does not grant the App `deployments: write` and does not claim Environment UI is human-presence.
3. Layer A contents:read stop the observed #541 path? **Yes, that path only** (installation token). Residual: user-token merge.
4. Ruleset required workflow source-bound? **No.** Still 15368. Spoofable by name if unpinned.
5. `checks: write` without `statuses: write` block ruleset pin? **Likely yes per GitHub docs.** Design now includes `statuses: write`.
6. Name-only check spoofable? **Yes** (15368 and Cursor 1210556). Pin required.
7. `authorize_from_trusted_ref` from PR-head CI an authorization root? **No.**
8. Residual user-OAuth merge after Layer A? **Yes.**
9. Fail-closed gaps: timeout must be failure not neutral; re-eval on comments; no pre-hardening ancestor skip in the App.
10. Evaluator UAT/Prod secrets? **Not if permissions stay as designed.** `deployments: write` would couple to uat/production objects — forbidden.
11. Single-owner deadlock vs Cursor substitution? Deadlock analysis correct. Escape via author attestation is the substitution channel. Honest residual.
12. Overclaim? Original design overclaimed Invariant 7. This HEAD removes that overclaim.

## Pass 2 (this HEAD, after honesty patches)

Re-read of the four design/incident docs plus checklist. Remaining design **BLOCKER=0**, **MAJOR=0**. Residual user-token merge/attestation is documented as accepted single-owner GitHub-identity risk, not as independence. Live `OWNER_CONTROL_READY` remains **false** because Layer A/B are not installed. #542 HEAD is unchanged (`ade3c828`).

## Verdicts

| Question | Verdict |
| --- | --- |
| #541 authorization-policy violation? | **Yes** (organizational owner-merge policy). Live ruleset was satisfied. |
| #541 deployment incident? | **No.** HOLD, SSH never attempted. |
| Live ruleset prevent #541-class merges today? | **No** |
| #542 owner authorization? | **No** |
| Owner-policy App design directionally correct after honesty patches? | **Yes**, as a cursor[bot]+15368-spoof control. Not human-presence. |
| `OWNER_CONTROL_READY` | **false** |
| Final | **HOLD** |

Do not merge #542 or #543. Do not install apps. Do not change rulesets from this agent. Do not activate UAT. Do not touch Production.
