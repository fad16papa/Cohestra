# Security review r2 — Issue 536 host trust boundary

- Reviewer: security, second pass
- Artifact: `ARCHITECTURE-SPINE.md` (read only; this review does not edit it)
- Date: 2026-11-03
- Verdict: **revise**

Lens: fail-closed host trust. Round 1 (`reviews/review-security.md`) asked for a revise. This pass re-reads the amended spine and checks the same boundary against the trees it cites: `main` `9ccca77e7297dc28b0a843d3435e9603dc803da7`, PR 551 `bb16fa2406dd1882be5a57b5cb48c10655cf4a11`, and PR 535 `73c314571ef8b417cc2c981af0e3d0a7a525872b`. Blobs were read locally. No live GitHub read, no repository-variable read, no workflow dispatch, and no secret value is recorded here.

Round 1’s missing classifications are now in the Rule text: the caller-built key’s true return, the check-run output marker, the `bmad` / `catsec` tokens, the story AD-1 payload, and a write-capable token. Those sentences describe the unmerged code correctly. They still leave two authorization bits a later unit can set from simulated inputs and then treat as the decision: a caller-set `host-verified` string, and a stored `owner_manifest_authorized` flag minted by a caller-built key.

## Criterion check

| Fail-close check | Result |
| --- | --- |
| Caller-built keys | The true return is named and cannot by itself authorize a live action (AD-2). The stored flag that the unmerged controller writes from that return is still replayed as the decision (finding 2). |
| Caller-set `host-verified` | Does not hold. The controller accepts the literal, and the spine does not turn that acceptance into HOLD (finding 1). |
| Comment markers | Holds as an identity source. `authentic_review` is refused for this boundary. A saved `authentic: true` row can still be copied onto the port in finding 1. |
| Check-run markers | Holds as an identity source. `collect_app_reviews` stores `authentic` true only after `parse_review_blob` accepts `role`, `independent`, and `head_sha` from check-run output, and an epic must not adopt that function. Same copy path as finding 1. |
| No live read | Holds. This decision does not call `paginate`, does not read live gate variables, does not dispatch Production, and does not query live deployment status. |
| No write path | Holds for merge, deploy, Cursor dispatch, and any write-capable token (AD-5, AD-6, inherited controller AD-12). The local ledger write of the owner flag is finding 2, not a second GitHub client. |
| No secret storage | Holds for this decision’s own text. The future host is not held to the parent drop rule (finding 3). |
| Simulated evidence cannot authorize a live action | Holds for opening UAT or Production. Does not hold for the READY predicate or the stored owner flag (findings 1 and 2). |

## Findings

### 1. High — A caller-set `host-verified` string still satisfies the READY predicate

AD-3 records the right fact: on PR 551 the controller accepts a `Review` whose `authentication_source` is the string `host-verified` when the caller of the port sets that field, and that field is not a host check. The consistency table repeats that a caller-supplied `authentication_source` is not host verification. Neither sentence says the decision that follows from the string is HOLD.

In `correction/controller.py` at `bb16fa24`, `_review_disposition` returns `unauthenticated` only when `review.authenticated` is not true or `authentication_source` is not exactly `host-verified`. Both fields are constructor arguments on `Review`. The same literal is the pass condition for requirement rows (`authentication_source != "host-verified"`) and for usage (`usage.authentication_source != "host-verified"`). `ReviewPolicy.trusted_roles` is the caller’s dict. When two caller-chosen ids map to `bmad` and `catsec` and both reviews carry the caller-set pair, `_decide` returns `READY_FOR_OWNER_MERGE_DECISION`. The tests construct that pair in `tests/support.py` with the default `authentication_source="host-verified"`. No host check runs.

Parent controller AD-8 makes that pair the READY predicate and forbids copying it from webhook, comment, or pull-request JSON. This spine’s bind keeps the role tokens and the copy ban. It does not say an in-process write of the same literal is unauthenticated. A unit can obey “the field is not a host check,” set the field because the controller requires it, and emit READY.

Comment and check-run markers are closed as functions. `authentic_review` and `collect_app_reviews` on PR 535 at `73c31457` can still store `authentic: true` (`collaborator_comment` and `github_app_check_run`). AD-3 forbids adopting those functions as the identity proof. It does not say the stored row is HOLD. A caller can copy `authentic: true` onto a `Review` with `authentication_source="host-verified"` and never call the PR 535 function. `merge_review_sources` prefers the check-run row; the adopt-ban names the two collectors.

`OwnerTransportGrant.owner_signed`, `recorded_outside_cursor`, and `DispatchReceipt.live_dispatch` are the same shape of caller flag. AD-3 correctly says `LiveReadOnlyClient.fetch` raises for a missing grant and again for a complete grant. The inherited workflow AD-2 cell keeps only “fetch raises” and “a grant object is not a network client.” A receipt or a grant boolean read by some other function is not in the AD-6 list of evidence that cannot authorize a live action. That list is a mock, a recorded envelope, `SIMULATED_PASS`, and a test key.

Required change: on this boundary, `Review`, `RequirementEvidence`, and `UsageEvidence` are unauthenticated no matter what the caller passed. The literal `host-verified` does not satisfy controller AD-8. A caller-built `ReviewPolicy` is not the host roster. READY reached from those values is HOLD. A comment row, a check-run output marker, `owner_signed`, `recorded_outside_cursor`, `live_dispatch`, and a `DispatchReceipt` do not authorize a live action.

### 2. High — Replay returns an owner flag that a caller-built key can mint

AD-2 now says the true return of `verify_owner_authorization` means the caller-supplied key matched, that this is not an out-of-band host, and that the true return cannot authorize a live action. That matches the function. Blob `0ceeaaa5370813cb92ffac65e7bb357b479347a4` stores the bytes the caller passed and returns true when the fingerprint matches and Ed25519 verify accepts the payload. There is no trust-store path and no environment loader.

The unmerged controller writes that boolean into the decision. `Controller.__init__` sets `self.owner_authorized = verify_owner_authorization(manifest, keyring)` with the keyring argument the caller passed to `open_controller`. `_owner_flag` is true for version 2 when that value is true, and `_commit` stores `owner_manifest_authorized`. `_replay` returns the stored flag and does not verify again.

AD-6 adopts that replay rule unless the owner replaces it: return the stored flag and do not verify again. The conflict section blocks implementation until the owner picks a replay rule. It does not say a stored true flag is HOLD when a caller-built key produced it. Parent story AD-1, which this spine says it does not weaken, sets `owner_manifest_authorized` true if and only if verify succeeded. The verify that exists succeeds for a caller-built key. A unit can refuse to call the true return a live action, persist it, and on the next call return it as the stored authorization bit.

`SIMULATED_PASS` and a test key are forbidden from authorizing a live action, and AD-5 forbids a simulated pass from opening UAT or Production. `deploy.yml` on `main` does not read `owner_manifest_authorized`. “Live action” is not defined to include the flag. A consumer that is allowed to act on a host-minted owner flag cannot tell this bit from that one, because replay does not re-verify and the keyring has no out-of-band origin.

Required change: until verification used the owner-named out-of-band public key, the true return, the stored `owner_manifest_authorized` bit, and a replay of that bit are HOLD. A caller-built `OwnerKeyring`, a test key, and an in-repo key file do not mint a flag that replay may return. Resolving the replay conflict does not by itself mark a caller-minted flag as host authorization.

### 3. Medium — Secret handling and the deploy-gate sentence are still narrower than the closed boundary

Inherited controller AD-9 binds here as “This decision stores no token, key, or secret value.” The parent rule is a sticky hold: matches for `ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_`, `github_pat_`, `AKIA`, `ASIA`, private-key banners, Slack tokens, and `sk_live_` are dropped, the reason is a fixed string, and the matched text is not stored. The bind covers storage by this decision. It does not cover the future host reading, logging, or forwarding a private key or a workflow secret, and it does not keep the sticky hold.

AD-5 still describes the UAT hold as two variables: `deploy.yml` holds unless `vars.UAT_DEPLOY_GATE_ACTIVE` and `vars.UAT_MAIN_DEPLOY_SUPPRESSED` are the string `true`. On `9ccca77e`, the inline suppressor at lines 461–468 also holds unless `GITHUB_REF` is `refs/heads/release/uat` (`CUTOVER_INCOMPLETE_MAIN_SOURCE`). The workflow is unchanged, and the live values were not read. The two-variable sentence is a partial open condition. A later edit that aligns a gate to that sentence drops the ref hold.

Required change: restate the parent drop rule for the host and for every artifact it writes. The host loads a public key only and does not read, log, store, or forward private keys or workflow secrets. Describe `deploy.yml` as unchanged, with live values unread. Do not restate a partial open condition as the gate.

## What already fail-closes

- AD-1 matches `main` `9ccca77e`. `_bmad-output/implementation-artifacts/cohestra-correction-controller/` is absent. No file on that commit defines `verify_owner_authorization`. `deploy.yml` and `deploy-production.yml` do not verify a manifest signature. No substitute host is added.
- AD-2’s blob and path match the open drafts. `0ceeaaa5370813cb92ffac65e7bb357b479347a4` is the authorization file at `379ec80a`, `63e08eaa`, `79076ea2`, `e2ee0de3`, and `bb16fa24`. It is absent on `main` and on PR 545. A true return is explicitly not out-of-band host control.
- AD-3 matches the read-only client. `ReviewIdentity.authenticated` defaults to false. `parse_recorded` appends identities with that flag false and an empty source. `LiveReadOnlyClient.fetch` raises for a missing grant and raises again for a complete grant. `github_readonly.py` blob `60c5cca4937ae7e584a9aec844d097409c84bd2c` is PR 551; blob `b568f31a22c194f16e91c15eabe633028d446247` is PR 548. This decision performs no live GitHub read.
- Comment JSON and check-run output markers are classified. Role strings `BMAD` and `CAT-SEC` are not the controller tokens `bmad` and `catsec`. An epic must not adopt `authentic_review` or `collect_app_reviews` as the identity proof.
- AD-4 refuses an implementation pull request and leaves PR 551 unmerged and unedited.
- AD-5 does not edit a workflow, variable, secret, ruleset, or environment. A simulated pass cannot open UAT or Production. `deploy.yml` does not read the correction ledger. Production dispatch was not run.
- AD-6 names one payload, the story AD-1 key set at `bb16fa24`, and says a write-capable token is HOLD. The future adapter file has no merge, deploy, Cursor dispatch, or repository-write call. `SIMULATED_PASS`, a mock, a recorded envelope, and a test key cannot authorize a live action. The head SHA is recorded as outside the signature, with exact-head evidence left on story AD-2 and controller AD-4.
- The prompt string ending in `da5` is not a commit. SHAs in the spine are 40 lowercase hex characters.

## Close

Do not mark the spine final while findings 1 and 2 remain. Finding 3 belongs in the same edit: a host that may read secrets, or a gate sentence that drops `GITHUB_REF`, is not this boundary. No production behavior was weakened by this review. The spine file was not changed.
