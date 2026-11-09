# Reviewer — reality check

Verdict: **revise**

Lens: every committed decision was checked against this workspace, `git`, and read-only `gh`. No live repository-variable values were read. No workflow was dispatched. No secret material is recorded here.

The spine’s SHAs, Python interpreter, and `cryptography` pin match the repo and PyPI. Two location claims do not. AD-2 and AD-4 say the signature module exists only on PR 551, at `correction/authorization.py`. That path is absent on the cited commit, and the same file blob is on other open drafts. AD-3 records only the comment-body fields in a file that also has a GitHub App check-run path.

## Findings

### 1. High — the signature module is not only on PR 551, and the written path is absent

Spine AD-2: `correction/authorization.py` exists only on unmerged PR 551 at `bb16fa2406dd1882be5a57b5cb48c10655cf4a11`. AD-4 repeats that the host-verification code exists only on that pull request. The capability map cites `correction/github_readonly.py` as PR 551 only.

Checked at those commits:

| Tree | `correction/authorization.py` | Nested `authorization.py` | Nested `github_readonly.py` |
| --- | --- | --- | --- |
| `main` `9ccca77e7297dc28b0a843d3435e9603dc803da7` | absent | absent | absent |
| PR 551 `bb16fa2406dd1882be5a57b5cb48c10655cf4a11` | absent | blob `0ceeaaa5370813cb92ffac65e7bb357b479347a4` | blob `60c5cca4937ae7e584a9aec844d097409c84bd2c` |
| PR 546 and PR 547 `379ec80a107f6730fd7d674391830e7d755f73c9` | absent | same authorization blob | absent |
| PR 548 `63e08eaa4ac0ebeaa7d6a93d927050bb2fd1938b` | absent | same authorization blob | different blob `b568f31a22c194f16e91c15eabe633028d446247` |
| PR 549 `79076ea2be5dfda97660d0edf0b6627563794c88` | absent | same authorization blob | absent |
| PR 550 `e2ee0de347987f2145d6fc8a9715ceb1ff7979c2` | absent | same authorization blob | absent |
| PR 545 `d29a51dde67a72b4c3d7553314ac00f0cb3f70a5` | absent | absent | absent |

The nested path on every tree that has the file is `_bmad-output/implementation-artifacts/cohestra-correction-controller/correction/`. AD-1 already uses that directory for the `main` absence claim. AD-2 and the capability map drop the prefix, so the names as written do not resolve.

PRs 546, 547, 548, 549, and 550 are open drafts. Each of 546–551 also contains `.github/workflows/correction-controller-tests.yml` with `cryptography==50.0.2`. PR 548’s read-only adapter is an earlier blob than PR 551’s.

Disposition: autofix. Name the implementation-artifacts path. Say the authorization blob is on those open draft heads, and that `github_readonly.py` is on PR 548 and PR 551 with different blobs. Keep the conclusion that `main` has neither file.

### 2. Medium — the test workflow is in the PR 551 tree, and commit `bb16fa24` did not add it

AD-2 calls `.github/workflows/correction-controller-tests.yml` the only workflow added on commit `bb16fa2406dd1882be5a57b5cb48c10655cf4a11`.

`git diff --name-status 9ccca77e7297dc28b0a843d3435e9603dc803da7 bb16fa2406dd1882be5a57b5cb48c10655cf4a11 -- .github/workflows/` shows one addition, that file. The head commit itself does not touch it. `git show --stat bb16fa24` changes `cursor_dispatch.py`, `github_readonly.py`, `release_gate.py`, and three tests. The workflow file was added in `892c0089`. The `cryptography==50.0.2` pin landed in `61f74ca6`.

The tree at the PR head does match the rest of the sentence: `permissions: contents: read`, `python3 -m pip install cryptography==50.0.2`, and `python3 -m unittest discover` under the nested tests directory.

Disposition: autofix. Attribute the workflow to the PR 551 tree versus `main`, and name `892c0089` and `61f74ca6` if the spine keeps commit-level history.

### 3. Medium — `deploy/lib/uat-readiness.py` has a second identity path AD-3 does not record

On PR 535 at `73c314571ef8b417cc2c981af0e3d0a7a525872b`, `authentic_review` does read `role`, `independent`, and `head_sha` from the parsed comment payload (`deploy/lib/uat-readiness.py` around line 433). The same function also requires `user.login`, `user.type`, and `author_association` on the comment row, and rejects the PR author and bot logins. `collect_reviews` then stores `source: collaborator_comment` and `authentic: True`.

`collect_app_reviews` (around line 576) documents that it accepts allowlisted GitHub App check-runs bound to the exact SHA. On a slug match, and an id match when an id is configured, it sets `authentic: True` and `source: github_app_check_run`. The capability map says authenticated read-only GitHub evidence is absent. This function is on the cited PR 535 file. It is absent on `main` and on PR 551. It is not an owner-key host. It is still an identity path in the file the spine cites.

Disposition: autofix. Record `collect_app_reviews` beside `authentic_review`, and keep the rule that neither path is the host for this boundary.

## Checked and held

### Commits and pull requests

- `HEAD` and `origin/main` are `9ccca77e7297dc28b0a843d3435e9603dc803da7`.
- PR 551 is an open draft. Head `bb16fa2406dd1882be5a57b5cb48c10655cf4a11`. Base `9ccca77e7297dc28b0a843d3435e9603dc803da7`. Review list length 0.
- PR 535 is an open draft. Head `73c314571ef8b417cc2c981af0e3d0a7a525872b`.
- Local `git cat-file` has no object for the prompt string ending in `da5`. GitHub returns HTTP 422, “No commit found,” for that string. The full `da7` main SHA returns a commit.
- Open draft heads 545, 546, 548, 549, and 550 match the recorded SHAs. PR 547 is also open and points at the same SHA as PR 546. The spine does not claim otherwise.
- No open pull request is titled as an implementation of this host-trust slice.

### Inherited spines

These files are absent on `main` and present on `bb16fa24`:

- `_bmad-output/planning-artifacts/architecture/architecture-issue-536-story-acceptance-2026-11-03/ARCHITECTURE-SPINE.md` — AD-1 “An owner signature is the only version-2 authorization”; AD-6 “This feature does not operate the live loop.”
- `_bmad-output/planning-artifacts/architecture/architecture-issue-536-correction-controller-2026-11-02/ARCHITECTURE-SPINE.md` — AD-8 “Independent review is two authenticated roles”; AD-12 “This feature does not ship or merge.”
- `_bmad-output/planning-artifacts/architecture/architecture-issue-536-autonomous-workflow-2026-11-03/ARCHITECTURE-SPINE.md` — AD-2 “Live clients stay closed,” including `LiveReadOnlyClient.fetch` raising for a complete grant.

The bind column matches those rules. This spine does not restate a weaker substitute.

### AD-1 on main

`_bmad-output/implementation-artifacts/cohestra-correction-controller/` is absent at `9ccca77e`. A search of that commit finds no `OwnerKeyring`, `Ed25519PublicKey`, or `verify_owner_authorization`. Ed25519 strings that do appear are SSH host-key instructions in deploy docs and scripts. `.github/workflows/deploy.yml` is “Deploy UAT.” `.github/workflows/deploy-production.yml` is “Deploy Production” `workflow_dispatch`. Neither workflow verifies a manifest signature.

### AD-2 behavior on the PR 551 blob

In the nested `authorization.py`, `OwnerKeyring` stores the 32-byte values the caller passed. `verify_owner_authorization` returns false when the keyring is missing, when the SHA-256 fingerprint differs, and when Ed25519 verify raises. The nested package has no `os.environ` / `getenv` public-key loader and no trust-store path. Ledger file IO in `controller.py` is a decision store.

### AD-3 behavior on the PR 551 blob

`ReviewIdentity.authenticated` defaults to false. `parse_recorded` builds identities with that flag false and an empty authentication source. `LiveReadOnlyClient.fetch` raises `TransportHold` when the grant is missing or incomplete, and raises `TransportHold` again when the grant is complete.

### AD-5 release controls

`deploy.yml` reads `vars.UAT_DEPLOY_GATE_ACTIVE` and `vars.UAT_MAIN_DEPLOY_SUPPRESSED`. The inline hold runs when either value is not the string `true` (lines 461–468, with the same comparison repeated on later jobs). This review did not read the live variable values. `docs/deploy/tailscale-production-overlay.md` states Production NO-GO in its status table. `_bmad-output/planning-artifacts/autonomous-delivery-loop.md` states Production remains NO-GO. This spine does not edit workflows, variables, secrets, rulesets, or environments.

### Versions

- `/usr/bin/python3` is Python 3.12.3 (`3.12.3 (main, Aug 31 2026, 10:18:26) [GCC 13.3.0]`). That matches the stack row for the lint interpreter. The unmerged workflow pins the broader `python-version: "3.12"`.
- `cryptography==50.0.2` is the pin in the unmerged workflow. PyPI publishes `50.0.2` (uploaded 2026-09-30, not yanked). It is also the current PyPI release. The spine does not add that pin to `main`.
- `main` has no Python requirements file and no Python `cryptography` dependency. `.NET` files import `System.Security.Cryptography`. That is the platform namespace, and the stack row is the Python package.

### AD-6

The future-host rule names no library version. It leaves the host process, the key path, and the GitHub read source as an owner decision.
