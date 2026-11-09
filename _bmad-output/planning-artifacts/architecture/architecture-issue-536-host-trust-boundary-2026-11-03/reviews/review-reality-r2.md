# Reviewer — reality check (second pass)

Verdict: **revise**

Lens: every committed location, blob, pull-request head, workflow commit, role token, and `collect_app_reviews` claim was checked against this workspace, `git`, and read-only `gh`. No live repository-variable values were read. No workflow was dispatched. No secret material is recorded here.

Round-1 location errors are fixed. The cited blob SHAs, open draft heads, file absences, and workflow history match the repository. AD-3’s description of how `collect_app_reviews` sets `authentic` true does not match `deploy/lib/uat-readiness.py` at the cited PR 535 head.

## Findings

### 1. Medium — `collect_app_reviews` does not become authentic inside `parse_review_blob`

Spine AD-3: `collect_app_reviews` lists check-runs for a SHA and can store `authentic` true with source `github_app_check_run` only after `parse_review_blob` accepts `role`, `independent`, and `head_sha` from the check-run output text. `merge_review_sources` can prefer that check-run row.

Checked at PR 535 head `73c314571ef8b417cc2c981af0e3d0a7a525872b`, blob `f80884012b70e787624a2197b35f667569423649` of `deploy/lib/uat-readiness.py`.

What matches:

- `collect_app_reviews(repo, expected_sha)` calls `paginate` on `/repos/{repo}/commits/{expected_sha}/check-runs?filter=all`.
- A matching row can be stored with `"authentic": True` and `"source": "github_app_check_run"`.
- `merge_review_sources` keeps the app row when that row is authentic and the comment row is not, and when both are authentic with the same verdict.

What the sentence gets wrong:

- `parse_review_blob` returns the first JSON object after the marker `<!-- cohestra-independent-review v1 -->`. It returns that object for any JSON dict. It does not read `role`, `independent`, or `head_sha`.
- `collect_app_reviews` itself, after `parse_review_blob` returns a dict, compares the uppercased payload `role` with `BMAD` or `CAT-SEC`, requires `independent is True`, and requires payload `head_sha` to equal the requested SHA.
- Those three payload checks are not sufficient. Before them, the function requires distinct app slugs, rejects empty or forbidden slugs (`github-actions`, `github`, `cursor`, `dependabot`, `gitguardian`, `renovate`), matches `name` to the configured check name, matches app `slug`, matches app `id` when an id is configured, requires the check-run object `head_sha` to equal the requested SHA, and requires one completed conclusion. A `PASS` verdict also requires conclusion `success` and integer blocker/major counts with blocker and major at 0. After the row is built, equal app identities clear `authentic` on both rows.
- The output text is the joined check-run `output.title`, `output.summary`, and `output.text`. The field checks are not a behavior of `parse_review_blob`.

`authentic_review` has the same attribution error in the previous sentence. It returns `(True, role)` after reading `role`, `independent`, and `head_sha` from an already parsed payload. It does not write `authentic` or `source`. `collect_reviews` writes `"authentic": True` and `"source": "collaborator_comment"`, and only after `authentic_review` also accepts login, a non-author, a non-bot, `author_association` in `OWNER` / `MEMBER` / `COLLABORATOR`, integer counts, and verdict `PASS` or `FAIL`.

Role tokens in that file are the constant `REVIEW_ROLES = ("BMAD", "CAT-SEC")`. That part of AD-3 and AD-6 matches. Stored dictionary keys are `bmad` and `cat_sec`.

Disposition: autofix. Say `collect_reviews` stores `collaborator_comment` after `authentic_review` returns true, and say `collect_app_reviews` stores `github_app_check_run` only after the allowlisted check-run matches and the payload fields pass. Keep the rule that neither function is the host.

### 2. Low — “only” excludes ancestor commits that contain the same or a third blob

Among all 74 open pull-request heads, `authorization.py` blob `0ceeaaa5370813cb92ffac65e7bb357b479347a4` is present exactly on the heads AD-2 names, and absent on `main` and PR 545. The same blob is also on ancestor `61f74ca62dbeb3e68e0bc1d520000a207f8a06ac`, the parent of PR 546/547 head `379ec80a107f6730fd7d674391830e7d755f73c9`. That commit is not an open pull-request head. AD-4 says signature code exists only on the named heads.

The capability map says the recorded-envelope parser is PR 548 blob `b568f31a22c194f16e91c15eabe633028d446247` and PR 551 blob `60c5cca4937ae7e584a9aec844d097409c84bd2c` only. Those are the open heads. Parent `c4ccd6713e23593d09ceff0411222f6bd4799758` of the PR 551 head has a third blob, `53c7240301e8cd9f455c74070535acace06ad049`. It is not an open pull-request head.

Disposition: autofix. Limit “only” to open pull-request heads, or name those two ancestor commits.

## Checked and held

### Blob SHAs and file absence

| Tree | `authorization.py` | `github_readonly.py` |
| --- | --- | --- |
| `main` `9ccca77e7297dc28b0a843d3435e9603dc803da7` | absent | absent |
| PR 545 `d29a51dde67a72b4c3d7553314ac00f0cb3f70a5` | absent | absent |
| PRs 546 and 547 `379ec80a107f6730fd7d674391830e7d755f73c9` | `0ceeaaa5370813cb92ffac65e7bb357b479347a4` | absent |
| PR 548 `63e08eaa4ac0ebeaa7d6a93d927050bb2fd1938b` | same authorization blob | `b568f31a22c194f16e91c15eabe633028d446247` |
| PR 549 `79076ea2be5dfda97660d0edf0b6627563794c88` | same authorization blob | absent |
| PR 550 `e2ee0de347987f2145d6fc8a9715ceb1ff7979c2` | same authorization blob | absent |
| PR 551 `bb16fa2406dd1882be5a57b5cb48c10655cf4a11` | same authorization blob | `60c5cca4937ae7e584a9aec844d097409c84bd2c` |

The path on every tree that has the file is `_bmad-output/implementation-artifacts/cohestra-correction-controller/correction/`. The directory is absent on `main`. `git grep` on `main` finds no `verify_owner_authorization`, `OwnerKeyring`, `def authentic_review`, or `def collect_app_reviews`. `deploy/lib/uat-readiness.py` is absent on `main` and on PR 551, and present only on PR 535 among open heads.

### Pull-request heads

All cited heads were read with `gh pr view`. Each is an open draft.

- PR 551 head `bb16fa2406dd1882be5a57b5cb48c10655cf4a11`, base `9ccca77e7297dc28b0a843d3435e9603dc803da7`, review list length 0.
- PR 535 head `73c314571ef8b417cc2c981af0e3d0a7a525872b`.
- PRs 545, 546, 547, 548, 549, and 550 match the SHAs in the table above. PR 547’s head equals PR 546’s head.
- `HEAD` and `origin/main` are `9ccca77e7297dc28b0a843d3435e9603dc803da7`.
- Local `git cat-file` has no object for the prompt string ending in `da5`. GitHub returns HTTP 422, “No commit found,” for that string.
- A title search for a host-trust pull request returned no rows. No open pull request is an implementation of this slice.

### Workflow history

`git diff --name-status 9ccca77e7297dc28b0a843d3435e9603dc803da7 bb16fa2406dd1882be5a57b5cb48c10655cf4a11 -- .github/workflows/` shows one added file, `.github/workflows/correction-controller-tests.yml`, and no other workflow change. `git show --stat bb16fa2406dd1882be5a57b5cb48c10655cf4a11` does not touch that file.

- `892c00892611a804c84ab327ec2f7c7859a94ceb` is the unique commit for prefix `892c0089`. Its parent is `main`. It adds the workflow with `permissions: contents: read` and `python3 -m unittest discover`. That version has no `cryptography` pin.
- `690c787f0ef4212072df9215f374a45ba6493e6b` adds the Python 3.12 setup step and still has no pin. The spine does not mention this commit.
- `61f74ca62dbeb3e68e0bc1d520000a207f8a06ac` is the unique commit for prefix `61f74ca6`. Its diff adds `python3 -m pip install --disable-pip-version-check cryptography==50.0.2`.
- Both commits are ancestors of the PR 551 head. The file at that head still has `contents: read`, the pin, and `unittest discover`.
- `main` has no Python `cryptography` pin. `/usr/bin/python3` is `3.12.3 (main, Aug 31 2026, 10:18:26) [GCC 13.3.0]`.

### Role tokens

On PR 551, `correction/controller.py` sets `REVIEW_ROLES = frozenset({"bmad", "catsec"})`. `ReviewPolicy.role_for` returns a role only when the mapped value is in that set. Requirement rows require `evidence.source` in `{"bmad", "catsec"}`. `BMAD` and `CAT-SEC` are different strings.

On PR 535, `REVIEW_ROLES = ("BMAD", "CAT-SEC")`. `authentic_review` uppercases `role` and compares it with that tuple. `collect_app_reviews` compares the payload role with the config keys `BMAD` and `CAT-SEC`.

### Signature and recorded-envelope behavior on the cited blobs

`OwnerKeyring` keeps the 32-byte values the caller passed after they parse as Ed25519 public keys. `verify_owner_authorization` returns false when the keyring is missing, the SHA-256 fingerprint differs, or Ed25519 verify raises. It also returns false for a non-version-2 manifest, a missing key id, a signature whose length is not 64, or a key id the keyring does not hold. The package has no `os.environ` / `getenv` public-key loader.

`ReviewIdentity.authenticated` defaults to false. `parse_recorded` builds identities with that flag false and an empty authentication source. `LiveReadOnlyClient.fetch` raises `TransportHold` when the grant is missing or incomplete, and raises `TransportHold` again when the grant is complete.

`_review_disposition` accepts a port `Review` when `authenticated` is true and `authentication_source` is `host-verified`, together with the other review gates. The string is read from the caller-supplied object.

### Inherited spines and release controls

The three parent spines are absent on `main` and present on `bb16fa24`. Story AD-1, story AD-6, controller AD-8, controller AD-9, controller AD-12, and workflow AD-2 match the bind column, including story AD-1’s payload keys, `authorization` keys `key_id` and `public_key_sha256`, signature bytes outside that payload, and replay returning the stored flag.

`deploy.yml` on `main` is “Deploy UAT.” `deploy-production.yml` is “Deploy Production” `workflow_dispatch`. Both lack `verify_owner_authorization`, `owner_manifest_authorized`, and the correction-controller path. `deploy.yml` holds when `vars.UAT_DEPLOY_GATE_ACTIVE` is not the string `true` or `vars.UAT_MAIN_DEPLOY_SUPPRESSED` is not the string `true`. Live values were not read. `docs/deploy/tailscale-production-overlay.md` has a status row `Production | NO-GO`. `_bmad-output/planning-artifacts/autonomous-delivery-loop.md` states Production remains NO-GO.
