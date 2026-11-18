# Rubric review — Issue 536 host trust boundary

- **Verdict:** revise
- **Spine:** `_bmad-output/planning-artifacts/architecture/architecture-issue-536-host-trust-boundary-2026-11-03/ARCHITECTURE-SPINE.md`
- **Checklist:** real divergence points for the level below; every AD Rule enforceable and preventive; Deferred cannot let two units diverge; named tech verified-current; brownfield ratification; every feature-altitude dimension decided, deferred, or an open question (deployment, environments, infra/provider, operations).
- **Method:** spine read against `origin/main` `9ccca77e7297dc28b0a843d3435e9603dc803da7`, PR 551 `bb16fa2406dd1882be5a57b5cb48c10655cf4a11`, and PR 535 `73c314571ef8b417cc2c981af0e3d0a7a525872b`. Versions checked against this machine and current public releases. No host process is proposed.

## Findings

### high — The GitHub App check-run path is unclassified, so two epics can pick different identity proofs

**Where:** AD-3, AD-6, Deferred (“The authenticated GitHub read…”), infra/provider.

**Evidence:** On PR 535, `deploy/lib/uat-readiness.py` `authentic_review` does read `role`, `independent`, and `head_sha` from a comment-body payload. The same file’s `collect_app_reviews` is a second path. It calls `paginate("/repos/{repo}/commits/{expected_sha}/check-runs?filter=all")`, filters by allowlisted app slug and optional app id, and on a match sets `authentic: True`, `source: "github_app_check_run"`, and `identity: "app:{slug}:{id}"`. `merge_review_sources` prefers that row when both a comment and a check-run look authentic.

AD-3’s Rule only classifies `authentic_review` and says that comment object is not authenticated GitHub evidence. The AD title says neither draft adapter authenticates a GitHub identity. The check-run function is never named. AD-6’s denylist is webhook, comment, Cursor output, and caller flag. Deferred disclaims “comment association” only. None of those phrases cover `github_app_check_run`.

**Divergence:** One epic can treat the unmerged check-run collector as the authenticated read. Another can keep waiting for the owner to name a source. Both can cite this spine. That is the identity-proof split AD-6 says it prevents.

**Disposition:** discuss. Classify this existing function in an AD Rule as not the authenticated read for this boundary, and say the owner-named source is still required. Do not name a host, a GitHub App, or a credential path.

### high — AD-6’s future verifier contract is not an enforceable predicate

**Where:** AD-6 Rule, after the hold-until-named sentence. Inherited controller rule on `bb16fa24` uses different role tokens.

**Evidence:** The hold is enforceable: no implementation until the owner names the host process, the out-of-band public-key path, and the authenticated GitHub read source. The sentences after that are not. “Binds … required scope” and “rejects a … replay” do not define scope or replay. A unit cannot fail a review for the wrong field list.

Role tokens conflict with the draft this spine inherits. PR 551 `correction/controller.py` sets `REVIEW_ROLES = {"bmad", "catsec"}`. `role_for` returns none for any other string. PR 535 sets `REVIEW_ROLES = ("BMAD", "CAT-SEC")`. AD-6 says “BMAD and CAT-SEC”. Those strings are not in the controller set. Two epics can require different tokens and both claim compliance. Inherited controller AD-8 already fixed `bmad` and `catsec` with `authentication_source` exactly `host-verified`. This rule does not carry those identifiers, so it does not prevent the divergence it names.

**Disposition:** discuss. Keep the hold. Make the post-hold rule checkable by binding the inherited role tokens and by defining replay and the bound fields, or by pointing at the parent rule that already defines them. Do not invent the host.

### medium — Live-operation bullets under Deferred do not carry the hold

**Where:** Deferred: “Live GitHub reads, Cursor dispatch, merge, UAT activation, and Production deployment.”

**Evidence:** AD-5 and the first sentence of AD-6 forbid this slice from starting that work. The Deferred bullets do not. In this template, Deferred is what the level below may decide. An epic that reads only those bullets can add a live read or a UAT activation while another epic stays on HOLD.

**Disposition:** autofix. Put the same hold on those bullets: they stay closed until the owner names the three sources, and this spine still adds no client. Do not choose the sources.

### medium — Inherited signature shape is narrowed, so canonical payloads can diverge

**Where:** Inherited Invariants, story AD-1 “Binds here”; AD-6 “canonical payload”.

**Evidence:** The parent story spine on `bb16fa24` fixes the version-2 signed JSON: sorted keys, comma-colon separators, an exact key set, signature bytes outside the payload, and `public_key_sha256` as hex SHA-256 of the 32-byte key. This spine’s bind cell keeps only “a content digest is not owner authorization” and “the private key stays outside the repository.” AD-6 then says the future verifier binds “canonical payload” without that shape. The intro says parent rules are not weakened, but the enforceable text in this file does not state the payload. Two epics can sign different JSON and both match this spine.

**Disposition:** autofix. Bind the parent payload rule by its original id and the commit that contains it, in the Rule a builder must follow. Do not re-specify a second payload.

### low — Stack names the lint interpreter’s patch, which is not the current 3.12 release

**Where:** Stack, “Python used to lint this spine | 3.12.3”.

**Evidence:** `python3 --version` on this machine is 3.12.3, so the row matches the lint run. The current 3.12 security release is 3.12.16 (2026-10-25). `cryptography` 50.0.2 is the current PyPI release (2026-09-30) and matches the pin in PR 551 `.github/workflows/correction-controller-tests.yml`. Main `9ccca77e` has no `cryptography` import. The spine does not adopt that pin. The Python row is labeled as the lint interpreter, so it does not by itself choose a host runtime.

**Disposition:** ignore for the host decision. If the Stack table stays, label 3.12.3 as the observed lint interpreter only, not a runtime pin.

## Checklist

### Real divergence points for the level below

The location gate is real and mostly fixed. On `9ccca77e`, `_bmad-output/implementation-artifacts/cohestra-correction-controller/` is absent. No file there verifies an Ed25519 manifest signature. PR 551’s `verify_owner_authorization` takes a caller-built `OwnerKeyring` and returns false when the keyring is missing, the fingerprint differs, or Ed25519 verify fails. The package has no trust-store path and no public-key environment loader. The only workflow added on that commit is `.github/workflows/correction-controller-tests.yml` with `contents: read`. `LiveReadOnlyClient.fetch` raises for a missing grant and raises again for a complete grant. `parse_recorded` appends `ReviewIdentity` with `authenticated` false. `9ccca77e…da5` is not a commit. Those facts stop the obvious false hosts: the product tree, the unit-test workflow, the signature function, the recorded envelope, and the comment parser.

Missed: `collect_app_reviews` (high) and the `bmad`/`catsec` versus `BMAD`/`CAT-SEC` token split (high). Canonical payload shape is inherited in prose and dropped in the binding cell (medium).

### Every AD Rule is enforceable and prevents its stated divergence

| Rule | Judgment |
| --- | --- |
| AD-1 | Enforceable on `9ccca77e`. The named directory is absent. Deploy workflows are release workflows. The rule blocks treating them as the manifest host. |
| AD-2 | Enforceable against `authorization.py` and the test workflow. A caller-built keyring is not an out-of-band host. |
| AD-3 | The sentences about `parse_recorded`, `LiveReadOnlyClient.fetch`, and `authentic_review` match the code. The title overclaims. The check-run path is outside the Rule, so the stated divergence is not prevented. |
| AD-4 | Enforceable as a stop: do not edit PR 551 and do not open an implementation pull request for this slice. “Cannot represent the missing host without adding it” is the same stop, not a second design. |
| AD-5 | Enforceable. `deploy.yml` on `9ccca77e` reads `vars.UAT_DEPLOY_GATE_ACTIVE` and `vars.UAT_MAIN_DEPLOY_SUPPRESSED` and holds unless each is the string `true`. `docs/deploy/tailscale-production-overlay.md` and `_bmad-output/planning-artifacts/autonomous-delivery-loop.md` both say Production NO-GO. This decision edits no workflow, secret, ruleset, or environment. |
| AD-6 | The hold-until-named sentence prevents starting. The verifier sentence does not prevent different identity proofs, role tokens, replay definitions, or scope fields. |

### Deferred

Safe holds: owner names the host process and until then no module is the verifier; test keys are not the production key; a stacked pull request waits and must not edit PR 551; ATDD binds to a host module that is not in the tree.

Not safe: the authenticated-read bullet excludes only comment association (high, same finding as AD-3). The live-operations bullet has no holding sentence (medium).

### Named tech

`cryptography` 50.0.2 is verified current and is correctly left on the unmerged workflow. Python 3.12.3 is the real lint interpreter and is not the current 3.12 release (low). “Host verifier package on main | not present” matches the tree.

### Brownfield ratification

The snapshot claims that were checked match `main` and the two cited heads. SSH Ed25519 text on `main` is deploy-host key material, not a manifest verifier; AD-1 still holds for the trust host. No contradiction found in the cited gate logic, NO-GO lines, signature function, or closed live client. The ratification gap is omission of `collect_app_reviews`, not a false claim about the functions the spine does name.

### Dimensions this feature altitude owns

| Dimension | State |
| --- | --- |
| Deployment | Decided for this slice: topology unchanged; `deploy.yml` gate logic cited; Production dispatch not run; Production deployment deferred. |
| Environments | Decided: no environment edited. Live variable values are explicitly unread, not invented. |
| Infra/provider | Incomplete. “No GitHub App and no Actions permission is added” covers this decision’s diff. The existing unmerged check-run app path is neither decided, deferred, nor an open question. |
| Operations | Decided: no live operation; missing or invalid trust material returns HOLD; a mock cannot authorize a live action. |
| Naming, data, state | Decided in Consistency Conventions: HOLD, 40 lowercase hex SHAs, caller-supplied `authentication_source` is not host verification, comment JSON is not an identity. |
| Stack and tree | Decided: no `correction/`, workflow, or `deploy/` edit; structural seed is the architecture folder only. |

## Gate

Revise. The fail-closed location result is supported for the signature library, the test workflow, and the comment parser. It is not closed for reviewer identity until the check-run path and the role-token conflict are written as rules. Do not fill that gap by naming a host.
