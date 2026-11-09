# Security review — Issue 536 host trust boundary

Verdict: **revise**

Lens: fail-closed host trust. Checked the spine only as a build contract (the spine file was not edited). Cited behavior of `main` `9ccca77e7297dc28b0a843d3435e9603dc803da7`, PR 551 `bb16fa2406dd1882be5a57b5cb48c10655cf4a11`, and PR 535 `73c314571ef8b417cc2c981af0e3d0a7a525872b` was re-read to see whether a later builder can obey the Rule text and still treat simulated evidence as live authorization.

The present slice does not add a verifier, a trust store, a merge client, a deploy client, a dispatch, a secret, or a live GitHub identity read, and it does not call unmerged PR code the host. Those negatives are real. They are not enough. AD-2, AD-3, the inherited-invariant table, and AD-6 leave a compliant path from a caller-built key, a recorded envelope, `SIMULATED_PASS`, or a caller-set `host-verified` flag to a later authorization decision.

## Criterion check

| Fail-close check | Result |
| --- | --- |
| No invented trust store on this decision | Holds for the current slice (AD-2, AD-4). Does not hold for the post-naming host (finding 3). |
| No trust of comment, webhook, or caller flags | Holds as a Prevents line and for `authentic_review` comment JSON. Does not hold for a caller-built `ReviewIdentity` or grant flag (finding 2). |
| No live GitHub read on this decision | Holds. AD-3 and AD-5 refuse a live identity read, a live variable read, and a live deployment query. |
| No merge, deploy, or dispatch path on this decision | Holds for this slice (AD-4, AD-5, inherited controller AD-12). The future write ban is scoped only to "the adapter" (finding 3). |
| No secret handling | Holds only as "no secret is edited." No rule forbids reading, logging, or forwarding secret material (finding 4). |
| Unmerged PR code is not the host | Holds (AD-1, AD-2, AD-4, and the inherited-invariant preface). The same rules still specify that unmerged code's success return in a way a builder can promote (finding 1). |
| Simulated evidence cannot become live authorization | Does not hold. |

## Findings

### 1. High — A true return from the unmerged verifier is still usable as owner authorization

AD-2 Prevents only this speech act: calling `verify_owner_authorization` with a caller-built key and reporting that an out-of-band host verified the manifest. The Rule then states the false cases only: missing keyring, fingerprint mismatch, or Ed25519 failure. It never says a true return is not authorization.

On PR 551, `OwnerKeyring` stores caller-supplied 32-byte keys, and `verify_owner_authorization` returns true when that caller key matches the manifest fingerprint and the signature verifies (`correction/authorization.py`). There is no trust-store path. A unit that obeys AD-2 can take that true result, set `owner_manifest_authorized`, and avoid the forbidden sentence.

The parent story rule this spine claims to inherit says the opposite: verify succeeds only for the host key, and for version 2 `owner_manifest_authorized` is true if and only if that host verify succeeded (story-acceptance AD-1 at `bb16fa24`). This spine's "Binds here" cell replaces that with "A content digest is not owner authorization. The private key stays outside the repository." Digest-is-not-authorization is true and weaker. It does not stop a caller-key verify from setting the owner flag. The preface says the spine does not weaken inherited rules. This cell does.

The same hole applies to replay. The parent stores the flag and returns it without verifying again. This spine never says a stored true flag that was produced by a test key, a fixture, or `SIMULATED_PASS` is re-read as HOLD.

Required change: the Rule must say that true, false, and a stored flag from `verify_owner_authorization` are all HOLD for this boundary. A caller-built `OwnerKeyring`, a test-generated key, and an in-repo key file are not the host key. Reporting "signature valid" or setting `owner_manifest_authorized` is the same failure as claiming an out-of-band host verified it.

### 2. High — AD-3 freezes a default, not the authentication bit

AD-3 Prevents a recorded envelope, a webhook, a comment body, or a caller flag from becoming reviewer authentication. The Rule that a builder will implement is narrower:

- `ReviewIdentity.authenticated` defaults to false.
- `parse_recorded` keeps it false.
- `LiveReadOnlyClient.fetch` raises for both a missing grant and a complete grant.
- `authentic_review` on PR 535 reads `role`, `independent`, and `head_sha` from a comment-body object and "is not authenticated GitHub evidence for this boundary."

`ReviewIdentity` on PR 551 is a public frozen dataclass. The default does not stop a caller from constructing `authenticated=True` and `authentication_source="host-verified"`. Parent controller AD-8 makes that pair the READY predicate: two distinct reviewer ids, `authenticated` true, and `authentication_source` exactly `host-verified`. The consistency table only says a caller-supplied `authentication_source` is not host verification. It does not say the boolean, alone or paired with the literal `host-verified`, is HOLD. A second unit can read the parent READY predicate off the object and ignore the string disclaimer.

`authentic_review` returns `(True, role)` when the comment JSON carries a known role, `independent: true`, and a matching `head_sha`. The spine correctly refuses to call that GitHub authentication, and it does not say a true return is consumed as HOLD. A later gate can branch on the true tuple and still claim it did not treat the comment as GitHub evidence.

`OwnerTransportGrant.owner_signed` and `recorded_outside_cursor` are caller flags. Fetch raises, including for a complete grant, which is the right closed live client. Nothing says those fields are untrusted if some other function reads them and skips fetch. Workflow AD-2's inherited cell keeps only "fetch raises; a grant object is not a network client." It drops the parent facts that a recorded envelope leaves authentication false, that a simulated dispatcher receipt is not a live dispatch, and that callback authentication stays false.

Required change: any `ReviewIdentity`, whatever the constructor arguments, is unauthenticated on this boundary. `authentication_source="host-verified"` written by the caller, a fixture, a recorded envelope, or a comment parser is not host verification. A true result from `authentic_review` is HOLD. `owner_signed`, `recorded_outside_cursor`, and `live_dispatch` on a caller-built grant or receipt are not authorization. A `DispatchReceipt` is not a completed dispatch.

### 3. High — AD-6 lets the owner "name" simulated evidence into the live verifier

AD-6 blocks implementation until three names exist, then builds one verifier. Naming is not an authenticated act. The rule does not say where the names come from, so a comment, a story file, a Cursor note, or a fixture path satisfies the gate that AD-3 just refused to trust.

After naming, the exclusion list is only "not from a webhook, a comment, Cursor output, or a caller flag." These existing simulations are absent from that list and can be named as the authenticated GitHub read source or the public-key path:

- a recorded envelope (`delivery` `github-api-recorded`) and the identities `parse_recorded` returns
- `verification_plane == "SIMULATED_PASS"`
- a true `verify_owner_authorization` against a test key
- `SimulatedCursorDispatcher` receipts (`dispatcher` `simulated`, `live_dispatch` false)
- an `OwnerTransportGrant` or `OwnerDispatchGrant`

The convention "`SIMULATED_PASS` is not a live flag" does not close this. Parent story acceptance says `SIMULATED_PASS` must not set a live flag. Parent workflow AD-4 says `assess` stays ineligible even when the plane is `SIMULATED_PASS` and `owner_manifest_authorized` is true, and that `merge_feature`, `deploy_uat`, and `deploy_production` raise. This spine does not inherit that rule. A new gate can treat the missing reason "controller readiness is not verified" as a pass, or treat `eligible` as a decision rather than a "live action," and still obey "A mock cannot authorize a live action."

The write ban is attached to one noun: "The adapter exposes no merge, deploy, dispatch, or other write." `cursor_dispatch.py` and `release_gate.py` are not that adapter. A verifier, a workflow, or a second client can dispatch, merge, or deploy without breaking the sentence. Inherited controller AD-12, as rebound here, only says no merge client and no deploy client are added. It does not cover a dispatch client or a flag writer.

The signature binding does not pin the reviewed commit. The listed binds are key id, fingerprint, canonical payload, signature, repository, task, pull request, base ref, and required scope. The version-2 payload on PR 551 includes `base_sha` and `base_ref` and does not include the head SHA. "Rejects a replay" does not define the replay tuple. A signature over one base and pull number can be reused for a later head. Reviewer roles are bound to "the exact source SHA"; the owner signature is not. "Distinct non-author roles" is also weaker than parent AD-8's two distinct reviewer ids, both non-authors, both `host-verified`. One person, or two role strings on one recorded object, fits the new wording.

The out-of-band key path can be invented at naming time. AD-4 stops a stacked draft from adding a trust store now. AD-6 does not say a path inside the repository, a test key, a workflow variable, or a store this decision creates fails the naming. "Test keys are not that key" is only a Deferred sentence, not a rule that blocks implementation.

Required change: implementation stays closed until the named key path is outside the repository and is not a test fixture, and the named identity source is a GitHub-authenticated read-only API rather than a recorded envelope, comment, webhook, grant object, or caller flag. The owner signature and both reviewer identities bind the exact head SHA, and replay is any reuse against a different head, repository, pull, task, or scope. `SIMULATED_PASS`, a mock, a receipt, and a true verify from a caller-built key all return HOLD and cannot set a live flag or open a gate. Merge, deploy, dispatch, flag writes, and any other write are forbidden on the host, the verifier, and every adapter, not only on one adapter. BMAD and CAT-SEC are two distinct GitHub users, each different from the author and from each other, each `host-verified` for that head.

### 4. Medium — Secret handling is closed only for edits

AD-5 forbids editing a workflow, variable, secret, ruleset, or environment. It does not forbid a future host from reading `GITHUB_TOKEN`, a private key, or deploy secrets, or from copying them into a ledger, log, or artifact. Parent controller AD-9 (secret-shaped material is a sticky hold and the matched text is not stored) is not inherited. AD-6's public-key path does not say the process loads a public key only.

`deploy.yml` on `main` does hold when `UAT_DEPLOY_GATE_ACTIVE` or `UAT_MAIN_DEPLOY_SUPPRESSED` is not the string `true`. That part of AD-5 matches the inline suppressor. The same step also holds unless `GITHUB_REF` is `refs/heads/release/uat`, and later steps still depend on the predeploy script, evidence files, and secrets. The spine's two-variable sentence is not the whole gate. A later edit that "aligns" the workflow to that sentence would drop controls this decision said it would not touch.

Required change: the host and any artifact it writes must not read, log, store, or forward private keys or workflow secrets. Inherit the parent secret-drop rule, or restate it. Leave the deploy-workflow description as "unchanged; live values were not read," and do not restate a partial open condition as the gate.

## What already fail-closes

- AD-1 matches `main`: the correction-controller tree is absent, and the deploy workflows are not an Ed25519 manifest verifier. No substitute host is added.
- AD-4 refuses an implementation pull request and refuses to merge or edit PR 551. A stack that invents the missing host is out of contract.
- AD-5 does not read live gate-variable values, does not dispatch production, and does not query live deployment status. Documented Production NO-GO is not presented as a live status.
- The truncated prompt SHA ending in `da5` is correctly not a commit. The format convention requires 40 lowercase hex characters.
- Unmerged `correction/authorization.py`, `github_readonly.py`, and `deploy/lib/uat-readiness.py` are labeled as drafts, not as the host.

## Close

Do not mark the spine final while findings 1–3 remain. Finding 4 should land in the same edit because a host that may read secrets is not a closed trust boundary. No production behavior was weakened by this review. The spine file was not changed.
