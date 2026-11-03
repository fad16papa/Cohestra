# Rubric review — Issue 536 host trust boundary (round 2)

- **Verdict:** accept
- **Spine:** `_bmad-output/planning-artifacts/architecture/architecture-issue-536-host-trust-boundary-2026-11-03/ARCHITECTURE-SPINE.md`
- **Prior:** `reviews/review-rubric.md` (verdict revise)
- **Checklist:** real divergence points for the level below; every AD Rule enforceable and preventive; Deferred cannot let two units diverge; named tech verified-current; brownfield ratification; inherited rules not weakened or contradicted; every feature-altitude dimension decided, deferred, or an open question (deployment, environments, infra/provider, operations).
- **Method:** amended spine read against `origin/main` `9ccca77e7297dc28b0a843d3435e9603dc803da7`, PR 551 `bb16fa2406dd1882be5a57b5cb48c10655cf4a11`, and PR 535 `73c314571ef8b417cc2c981af0e3d0a7a525872b`. Parent story AD-1, controller AD-8, and the PR 535 review functions were read from those commits. `python3 --version` is 3.12.3. PyPI `cryptography` is 50.0.2. No host process is proposed.

## Round-1 holes

| Hole | Result |
| --- | --- |
| `collect_app_reviews` classified as not the host | Closed |
| Role tokens `bmad` / `catsec` versus `BMAD` / `CAT-SEC` | Closed |
| Canonical payload bound to story AD-1 | Closed |
| Deferred live operations still held | Closed |
| Replay conflict surfaced instead of overridden | Closed |

### `collect_app_reviews`

AD-3 names `collect_app_reviews` on PR 535 at `73c31457`. The rule says it can store `authentic` true with source `github_app_check_run`, that `merge_review_sources` can prefer that row, and that neither `authentic_review` nor `collect_app_reviews` is the host. An epic must not adopt either function as the correction-controller identity proof. The paradigm calls a check-run parser not the host. Deferred says comment association, check-run output markers, and `collect_app_reviews` are not the authenticated read. The structural seed says the unmerged PR 535 check-run parser is not selected as a provider.

On `73c31457`, `deploy/lib/uat-readiness.py` `collect_app_reviews` calls `paginate` for check-runs at the SHA, filters by configured app slug and optional app id, and sets `authentic: True` with `source: "github_app_check_run"` only on a completed run whose output blob also passes the role, `independent`, and `head_sha` checks. `merge_review_sources` keeps the app row when that row is authentic. Neither function is on `9ccca77e`. The classification matches the code.

### Role tokens

Controller `REVIEW_ROLES` on `bb16fa24` is `frozenset({"bmad", "catsec"})`. `role_for` returns none when the mapped role is outside that set. PR 535 sets `REVIEW_ROLES = ("BMAD", "CAT-SEC")` and uppercases the payload role before that compare. Inherited controller AD-8, AD-3, AD-6, and the naming row now say the controller tokens are exactly `bmad` and `catsec`, and that `BMAD` and `CAT-SEC` are different strings and are not those roles. A unit cannot satisfy this spine by accepting the PR 535 spellings.

### Canonical payload

Story AD-1 at `bb16fa24` is cited in the inherited table and in the AD-6 Rule as the only canonical payload. The inline key list matches that rule: `acceptance_criteria`, `allowed_paths`, `author_id`, `authorization`, `base_ref`, `base_sha`, `budget`, `manifest_id`, `manifest_version`, `model`, `pull_number`, `repo`, `required_checks`, `requirements`, `task_id`. `authorization` is `key_id` and `public_key_sha256`. `public_key_sha256` is the hex SHA-256 of the 32 public-key bytes. Signature bytes stay outside the payload. Required scope is `allowed_paths` in that object, not a token grant. This is the parent payload, not a second envelope.

### Deferred live operations

The live-operations bullet now says those operations stay closed, this spine adds no client for them, and they do not become selectable work while the host is unnamed. AD-5 still edits no workflow, secret, ruleset, or environment. AD-6 still starts no implementation until the owner names the host process, the out-of-band public-key path, and the authenticated GitHub read source. The bullet does not choose those sources.

### Replay

Story AD-1 says replay returns the stored flag and does not verify again. The inherited cell repeats that sentence. AD-6 says replay follows story AD-1 unless the owner explicitly replaces that rule, and that no implementation starts until the conflict is resolved. The Conflicts section states the task text says reject replay, says this spine does not override story AD-1, and says the conflict is not permission to build either rule now. The owner-decision line asks the owner to choose. The parent rule remains the standing rule. Reject-replay is not adopted.

## Findings

No high or medium findings.

### low — The inline payload sentence omits the parent's "no whitespace"

**Where:** AD-6, the clause that restates story AD-1.

**Evidence:** Story AD-1 says the signed payload uses separators comma and colon, no whitespace. AD-6 cites that rule, then says "separators comma and colon" and does not repeat "no whitespace." The key set matches. A unit that opens story AD-1 at `bb16fa24` still has one byte string. A unit that copies only the inline separators clause can emit a space after the comma.

**Disposition:** ignore. The binding predicate is story AD-1 at `bb16fa24`, and the restatement does not add or drop a key. Copying "no whitespace" into the inline sentence would remove the shorthand gap. Do not re-specify a second payload, and do not name a host.

### low — `parse_review_blob` does not itself accept the three marker fields

**Where:** AD-3, the `collect_app_reviews` sentence.

**Evidence:** `parse_review_blob` returns a dict when the marker and a JSON object parse. It does not inspect `role`, `independent`, or `head_sha`. `collect_app_reviews` checks those fields on that dict before it sets `authentic` true. The spine attributes those accepts to `parse_review_blob`. The following sentences still say the function is not the host and must not be adopted as the identity proof. Deferred says the same.

**Disposition:** ignore. The prohibition is enforceable without that clause. The clause is a looser mechanism than the function boundary, and it does not make the check-run parser the host.

## Checklist

### Real divergence points for the level below

The location gate still holds on `9ccca77e`. The correction-controller directory is absent. No file there defines `verify_owner_authorization`. `9ccca77e…da5` is not an object. PR 551 `verify_owner_authorization` is blob `0ceeaaa5370813cb92ffac65e7bb357b479347a4` on the heads AD-2 names, and that path is absent on `main` and on PR 545 `d29a51dd`. `github_readonly.py` blob `60c5cca4937ae7e584a9aec844d097409c84bd2c` is the PR 551 file. Blob `b568f31a22c194f16e91c15eabe633028d446247` is the PR 548 file. The file is absent on PRs 545, 546, 549, and 550. `LiveReadOnlyClient.fetch` raises for a missing grant and raises again for a complete grant. `parse_recorded` appends `ReviewIdentity` with `authenticated` false. The only workflow added on PR 551 versus `main` is `.github/workflows/correction-controller-tests.yml`, with `contents: read`. Commit `892c0089` added that file. Commit `61f74ca6` added the `cryptography==50.0.2` pin. `bb16fa24` does not touch the file.

The two identity forks from round 1 are now rules. `collect_app_reviews` is not the host. Controller roles are `bmad` and `catsec`. The payload fork is closed by story AD-1's key set. Replay is one surfaced conflict, not two buildable results.

### Every AD Rule is enforceable and prevents its stated divergence

| Rule | Judgment |
| --- | --- |
| AD-1 | Enforceable on `9ccca77e`. The named directory is absent. The named deploy workflows do not verify a manifest signature. The rule blocks treating them as the trust host. |
| AD-2 | Enforceable. The blob and the heads match. A caller-built keyring and a true verify result are not an out-of-band host and cannot authorize a live action. The test workflow is not a host. |
| AD-3 | Enforceable. Recorded envelopes, the port flag, comment JSON, and the check-run parser are each named and refused as the identity proof. The `parse_review_blob` attribution is loose (low) and does not reopen the refusal. |
| AD-4 | Enforceable as a stop. The host process, the out-of-band key path, and the authenticated identity source are on none of the named heads and not on `main`. PR 551 is not edited. No implementation pull request is opened. |
| AD-5 | Enforceable. `deploy.yml` on `9ccca77e` holds unless `vars.UAT_DEPLOY_GATE_ACTIVE` and `vars.UAT_MAIN_DEPLOY_SUPPRESSED` are the string `true`. It does not read `owner_manifest_authorized` or a correction ledger. The two cited documents still say Production NO-GO. This decision edits no workflow, secret, ruleset, or environment. |
| AD-6 | The hold is enforceable: no implementation until the three names and the replay choice. The payload is story AD-1's key set. Scope is `allowed_paths`. Role tokens are the controller pair. Replay follows story AD-1 and cannot be built until the owner resolves the conflict. The future adapter has no merge, deploy, Cursor dispatch, or repository-write call. |

### Deferred

The verifier stays unnamed until the owner names the host process and the replay conflict is resolved. Test keys are not the production key. The authenticated read excludes comment association, check-run markers, and `collect_app_reviews`. A stacked pull request waits and must not edit PR 551. Live GitHub reads, Cursor dispatch, merge, UAT activation, and Production deployment stay closed, with no client added, and are not selectable while the host is unnamed. ATDD binds to a host module that is not in the tree.

None of these bullets lets one epic start a live read or a UAT activation while another epic stays on HOLD. None of them names a host, a key path, or a GitHub read source.

### Named tech

Python 3.12.3 is the interpreter that printed `Python 3.12.3` on this machine. The Stack row labels it as that lint interpreter and says it is not a selected host runtime. `cryptography` 50.0.2 is the current PyPI release and is the pin in the unmerged PR 551 workflow. The spine does not adopt that pin. "Host verifier package on main | not present" matches the tree.

### Brownfield ratification

The snapshot claims that were re-checked match `main` and the two cited heads: absent controller directory, authorization blob, github-readonly blobs, closed `fetch`, false `authenticated` on recorded reviews, deploy-gate strings, Production NO-GO lines, workflow pin commits, and the PR 535 role constants and check-run collector. The check-run collector is now included. The one loose sentence is the `parse_review_blob` attribution above. It does not contradict the refusal.

Inherited story AD-1 is not replaced. The inline payload uses that rule's keys. Controller AD-8's role tokens are repeated rather than swapped for the PR 535 spellings. Workflow AD-2's closed `fetch` is repeated. Controller AD-12's refusal to add a merge or deploy client is repeated. No new AD tells a unit to reject replay, to accept `BMAD` / `CAT-SEC`, or to treat `collect_app_reviews` as the authenticated read.

### Spec

No spec file is a source of this spine. Companions is empty. The bound question is the location check for issue 536. There is no uncovered spec capability inside that scope.

### Dimensions this feature altitude owns

| Dimension | State |
| --- | --- |
| Deployment | Decided for this slice: topology unchanged; `deploy.yml` gate logic cited; Production dispatch not run; Production deployment deferred and held. |
| Environments | Decided: no environment edited. Live variable values stay unread. |
| Infra/provider | Decided and deferred. This decision adds no GitHub App and no Actions permission. The unmerged check-run parser is not the provider. The owner still names the authenticated read. |
| Operations | Decided: no live operation; missing or invalid trust material returns HOLD; a mock, a recorded envelope, `SIMULATED_PASS`, and a test key cannot authorize a live action. |
| Naming, data, state | Decided: HOLD for this slice; case-sensitive role tokens; 40 lowercase hex SHAs; caller-supplied `authentication_source` is not host verification; comment JSON and check-run markers are not an identity; one signature payload. |
| Stack and tree | Decided: no `correction/`, workflow, or `deploy/` edit. The structural seed is this architecture folder. |

## Gate

Accept. The five round-1 holes are closed in the rules a later epic has to follow. `collect_app_reviews` is not the host. Controller roles stay `bmad` and `catsec`. The canonical payload is story AD-1 at `bb16fa24`. Live operations stay closed. Replay is a surfaced conflict with story AD-1, and neither replay rule may be built now. The two low notes do not reopen a divergence. Do not fill any remaining shorthand by naming a host.
