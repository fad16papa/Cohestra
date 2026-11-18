# Closeout review — Issue 536 host trust boundary

- Reviewer: closeout, amended spine
- Artifact: `ARCHITECTURE-SPINE.md` (not edited)
- Date: 2026-11-03
- Verdict: **revise**

Checked against local git objects and read-only `gh pr view`. `origin/main` and `HEAD` are `9ccca77e7297dc28b0a843d3435e9603dc803da7`. No host process is named here.

The five factual sentences match the trees. Two units can still obey every rule in this file and ship different payload bytes, accept different accounts as `bmad` and `catsec`, or write the repository from an existing file. Role-token strings do not diverge. Replay does not diverge, because both rules stay blocked.

## Sentence checks

### 1. `parse_review_blob` only extracts JSON; `authentic_review` and `collect_app_reviews` check the marker fields; `collect_reviews` stores `collaborator_comment`

Holds at PR 535 head `73c314571ef8b417cc2c981af0e3d0a7a525872b`, blob `f80884012b70e787624a2197b35f667569423649` of `deploy/lib/uat-readiness.py`.

- `parse_review_blob` returns the first JSON object after `<!-- cohestra-independent-review v1 -->`. It does not read `role`, `independent`, or `head_sha`.
- `authentic_review` checks those three fields on the parsed object (`role` uppercased against `BMAD` / `CAT-SEC`, `independent is True`, `head_sha` equal to the requested SHA).
- `collect_app_reviews` checks the same three fields inside that function, after `parse_review_blob`, and only then can store `"authentic": True` with `"source": "github_app_check_run"`.
- `collect_reviews` stores `"source": "collaborator_comment"` on the authentic row.

### 2. Authorization blob `0ceeaaa5` is at the named heads and at `61f74ca6`. `github_readonly` head blob `60c5cca4`; ancestor `c4ccd671` blob `53c72403`; PR 548 blob `b568f31a`

Holds. Path `_bmad-output/implementation-artifacts/cohestra-correction-controller/correction/authorization.py` blob `0ceeaaa5370813cb92ffac65e7bb357b479347a4` is the file at:

| Commit | Role | Blob |
| --- | --- | --- |
| `379ec80a107f6730fd7d674391830e7d755f73c9` | open draft heads of PRs 546 and 547 | `0ceeaaa5…` |
| `63e08eaa4ac0ebeaa7d6a93d927050bb2fd1938b` | open draft head of PR 548 | `0ceeaaa5…` |
| `79076ea2be5dfda97660d0edf0b6627563794c88` | open draft head of PR 549 | `0ceeaaa5…` |
| `e2ee0de347987f2145d6fc8a9715ceb1ff7979c2` | open draft head of PR 550 | `0ceeaaa5…` |
| `bb16fa2406dd1882be5a57b5cb48c10655cf4a11` | open draft head of PR 551 | `0ceeaaa5…` |
| `61f74ca62dbeb3e68e0bc1d520000a207f8a06ac` | parent of `379ec80a`, ancestor of `bb16fa24` | `0ceeaaa5…` |

The file is absent on `9ccca77e` and on PR 545 `d29a51dde67a72b4c3d7553314ac00f0cb3f70a5`.

`github_readonly.py`:

| Commit | Blob |
| --- | --- |
| `bb16fa24` (PR 551 head) | `60c5cca4937ae7e584a9aec844d097409c84bd2c` |
| `c4ccd6713e23593d09ceff0411222f6bd4799758` (parent of `bb16fa24`) | `53c7240301e8cd9f455c74070535acace06ad049` |
| `63e08eaa` (PR 548 head) | `b568f31a22c194f16e91c15eabe633028d446247` |

`gh pr view` shows those seven pulls still open drafts at those heads. PR 551’s base is `9ccca77e`.

### 3. `manifest.py` blob `ab0cd40d` at `bb16fa24`. Hexdigest compare is lowercase equality

Holds. `bb16fa24:…/correction/manifest.py` is `ab0cd40d48145fe13b047f6b4cfe5425d034b891`.

In authorization blob `0ceeaaa5`, `verify_owner_authorization` returns false when `hashlib.sha256(public_key).hexdigest() != manifest.public_key_sha256`. `hexdigest()` is lowercase hex. The compare is case-sensitive equality. `KEY_FINGERPRINT_RE` in that manifest blob is `^[0-9a-f]{64}$`, so an uppercase fingerprint never becomes the stored field.

### 4. `deploy.yml` holds on `GITHUB_REF != refs/heads/release/uat` with `CUTOVER_INCOMPLETE_MAIN_SOURCE`

Holds. `deploy.yml` at `9ccca77e` is blob `ad0ee7d1cab80169d6b755e867918edbb945913f`. The inline gate and the later hold both run `[[ "${GITHUB_REF:-}" != "refs/heads/release/uat" ]]` and record `CUTOVER_INCOMPLETE_MAIN_SOURCE`. Live variable values were not read.

### 5. Replay remains an owner conflict and blocks implementation

Holds. Story AD-1 at `bb16fa24` says replay returns the stored flag and does not verify again. AD-6 withholds implementation until that conflict is resolved. The Conflicts section says this spine does not override story AD-1 and that the conflict is not permission to build either rule. Deferred and Owner decision required say the same.

## Can two compliant units still diverge?

| Axis | Still diverges? |
| --- | --- |
| Payload bytes | Yes. String escaping is not pinned. |
| Role tokens | No. The only compliant strings are `bmad` and `catsec`. |
| Replay | No. A unit that returns the stored flag and a unit that rejects replay each break the block. |
| Identity proof | Yes. After the owner names the read source and the id form, the map from that id to `bmad` or `catsec` is still free. |
| Write path | Yes. The ban is new files and a write-capable token. An edit to an existing file can write with another credential. |

Pairs below are implementations that start only after the owner has named the process, the out-of-band public-key path, and the read source, and has picked a replay rule. Until then, AD-6 does not allow either unit to exist. No host is named.

## Findings

### 1. High — Payload bytes still split on string escaping

AD-6 binds one schema: story AD-1’s root keys, sorted keys, separators comma and colon, no whitespace, signature bytes outside the object, `authorization` exactly `key_id` and `public_key_sha256`, nested requirement and budget shapes accepted by `Manifest.from_dict` in manifest blob `ab0cd40d`, and `public_key_sha256` equal to `hashlib.sha256(public_key).hexdigest()`. That closes uppercase fingerprints, a second requirement key name, and spaces after separators.

It does not choose a JSON string encoder. `from_dict` accepts a parsed dict. `signing_payload` in blob `0ceeaaa5` re-serializes with `json.dumps(..., sort_keys=True, separators=(",", ":"))`, whose default `ensure_ascii=True` emits `\u00e9` and leaves `/` raw. The spine never cites that call as the byte string.

**Unit Dumps** emits that `json.dumps` result. **Unit Raw** uses the same object, the same key order, and the same separators, with non-ASCII left as UTF-8. For `café` the byte strings differ (`caf\u00e9` versus the two UTF-8 bytes). **Unit Solidus** escapes `/` as `\/` inside `allowed_paths`. `json.loads` accepts both, and both dicts pass the `from_dict` key set. Signatures do not.

A second schema, an uppercase fingerprint, or whitespace after a separator is non-compliant. These two encoders are not.

### 2. High — The role map is still an identity-proof choice

Role tokens are closed: `BMAD` and `CAT-SEC` fail AD-6. Login versus numeric account id is closed as a build choice: AD-6 makes that form part of the owner-named source and says neither form is the host until the source is named. Two distinct ids and author exclusion are in the Rule. Dropping controller AD-8’s other predicates would weaken a rule this spine says it does not weaken.

The map is not in that sentence. `ReviewPolicy` at `bb16fa24` is a caller-supplied `trusted_roles` dict. Controller AD-8 requires the tokens and the authenticated source. It does not name which account holds `bmad`.

**Unit Alice** and **Unit Bob** use the same owner-named read and the same id form. One allow-list maps Alice to `bmad` and Bob to `catsec`. The other swaps them. Neither copies `host-verified` from webhook, comment, or pull-request JSON, and neither adopts a PR 535 parser. The same pull is a pass for one unit and a rejection for the other.

### 3. High — A repository write can sit in an existing file

AD-6 says every new file in an implementation of this slice has no merge, deploy, Cursor dispatch, or repository-write call, and a write-capable token is HOLD. Inherited controller AD-12 adds no merge client and no deploy client. AD-5 edits no workflow, variable, secret, ruleset, or environment.

**Unit Quiet** adds read-only files and uses a read-only token. **Unit Patch** uses the same new files and the same token. It edits a file that already exists, and that edit updates a git ref with a deploy key. The new files contain no write call. There is no write-capable token, no merge client, and no deploy client. `deploy.yml` is untouched. The ref changes for one unit and does not change for the other.

## Low notes

These do not force a revise.

- `parse_review_blob` also requires the HTML comment marker and a JSON object. `authentic_review` and `collect_app_reviews` also check association, counts, verdict, and, for the app path, the allowlisted app. AD-3 does not say the three marker fields are the only gates. The attribution matches the code.
- “Sorted keys” is not explicitly recursive. The cited verifier’s `sort_keys=True` sorts nested objects. A root-only reading would be a second byte split; the ordinary reading of that phrase is recursive.
- Controller AD-8’s model, blocker, major, in-scope path, and forbidden-login checks are not restated in AD-6. The inherited-invariants prose says this spine does not weaken those rules, so a unit that drops them is non-compliant. Restating them in the Rule would make that harder to miss.

## Axes that do not yield a compliant pair

### Role tokens

A unit that accepts `BMAD` or `CAT-SEC` breaks AD-6 and the case-sensitive naming row. No second token string obeys the Rule.

### Replay

**Unit Stored-Flag** implements story AD-1’s return-the-flag rule before the owner picks. It breaks the first sentence of AD-6 and the Conflicts section. **Unit Reject** implements reject-replay and overrides story AD-1, which the Conflicts section forbids. Neither unit may be built. The conflict has to stay unresolved until the owner picks. This review does not pick.

## Close

Revise AD-6 so the three pairs above are non-compliant. Bind the signature bytes to one encoder, including non-ASCII and solidus. Keep the role-to-account map inside the owner naming, and keep both maps blocked until that naming exists. Apply the write ban to every file the implementation adds or changes, and to every credential. Leave the replay conflict blocking both rules. Do not name a host.
