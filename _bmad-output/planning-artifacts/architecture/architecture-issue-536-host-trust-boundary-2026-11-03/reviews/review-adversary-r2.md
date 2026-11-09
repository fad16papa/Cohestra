# Adversarial divergence review — Issue 536 host trust boundary (round 2)

- Reviewer: adversarial divergence, second pass
- Artifact: `ARCHITECTURE-SPINE.md`
- Date: 2026-11-03
- Verdict: **revise**

## Verdict

Round 1's role-token pair and its replay pair do not survive. `BMAD` and `CAT-SEC` are now a broken implementation. Building either replay rule is also a broken implementation: the conflict blocks the slice. Two later units can still obey every rule in this file and ship different payload bytes, accept different people as `bmad` and `catsec`, and perform a repository write the other unit never does. This review does not name a host.

The units below are the implementations that start only after the owner has named the process, the out-of-band public-key path, and the authenticated read source, and has picked a replay rule. Until that pick, neither unit is allowed to exist. The pairs are what remains on the day that gate opens. Parent spines and `authorization.py` at `bb16fa24` were read as evidence of what this file incorporates. They are not given force beyond the sentences this file actually states.

## Findings

### F1 — Critical. The cited payload is still not one byte string

AD-6 says the only canonical payload is story AD-1 at `bb16fa24`, then restates root keys, sorted keys, separators comma and colon, signature bytes outside the payload, and `public_key_sha256` equal to the hex SHA-256 of the 32 public-key bytes. Story AD-1 adds "no whitespace", Ed25519, and the same hex phrase. It names no nested requirement keys and no hex alphabet. `Requirement.to_dict` at `bb16fa24` is one encoder sitting in the file AD-2 says is not the host. `KEY_FINGERPRINT_RE` there is `^[0-9a-f]{64}$`. The convention in this file forces lowercase only for 40-character SHAs.

**Unit Hex-Lower** signs UTF-8 JSON, root keys sorted, no whitespace, separators comma and colon, signature outside the object. `authorization` is exactly `key_id` and `public_key_sha256`. The fingerprint is `hashlib.sha256(public_key).hexdigest()`. An uppercase hex string is invalid trust material and returns HOLD. Ed25519 covers those bytes. Required scope is `allowed_paths`. The head SHA is not in the object.

**Unit Hex-Fold** uses that same object and the same algorithm. It treats "hex SHA-256" as either alphabet and compares the fingerprint case-insensitively. An uppercase `public_key_sha256` verifies. Because that field is inside the signed object, the uppercase document is a different byte string. Hex-Lower returns HOLD for a document Hex-Fold accepts. Neither unit adds a root key, a token grant, or a head SHA.

A second pair differs with the fingerprint held in lowercase. Story AD-2 says each requirement has a stable id, expected behavior, evidence kind `test` or `review`, evidence name, and that one requirement is mandatory. It does not name JSON keys. Story AD-1's key list stops at the root key `requirements`.

**Unit Code-Shape** emits each requirement with the keys `Requirement.to_dict` uses at `bb16fa24`: `evidence_kind`, `evidence_name`, `expected_behavior`, `mandatory`, `requirement_id`.

**Unit Noun-Shape** emits `evidence_kind`, `evidence_name`, `expected_behavior`, `id`, and `mandatory`.

Both arrays satisfy the English requirement. Sorted root keys, no whitespace, and the AD-6 key list do not select between them. A signature from one does not verify on the other.

The same encoder hole remains when the keys match. Story AD-1 does not choose a JSON string encoder. **Unit Raw-Slash** writes an allowed path as `src/Api`. **Unit Escaped-Slash** writes `src\/Api`. Both are UTF-8 JSON with sorted keys, comma and colon, and no whitespace. A non-ASCII `expected_behavior` splits the same way under `\u` escapes versus raw UTF-8. Ordinary manifests already contain `/`.

Importing the rest of story AD-1 removes spaces after separators, a second signature algorithm, and a signature placed inside `authorization`. It does not make these three pairs the same bytes.

### F2 — Critical. Identity proof still has two accept sets

AD-6 fixes the tokens: exactly `bmad` and `catsec`, and `BMAD` and `CAT-SEC` are refused. The controller AD-8 cell in this file stops at those tokens and at not copying `host-verified` from webhook, comment, or pull-request JSON. Exact-head evidence is delegated to story AD-2 and controller AD-4. Story AD-2 binds the current head for requirement rows. Controller AD-4 says an assigned head is not graded again. Neither sentence is the review-head rule in controller AD-8 at `bb16fa24` (two distinct reviewer ids, author login excluded, current head, model, blocker and major bounds, an in-scope path, claimed role text ignored). That rule is not restated here. The preface says this spine does not weaken it. No Rule carries the dropped predicates, so a unit that follows the Rules never has to.

**Unit Cell** reads reviewers only from the owner-named authenticated source. It sets `host-verified` from that read. It does not copy the flag from webhook, comment, or pull-request JSON, and it does not adopt either PR 535 parser. Role tokens are exactly `bmad` and `catsec`. One account may hold both tokens. The manifest author may hold `bmad`. A review whose commit is an ancestor of the current head still counts. Requirement rows still require the current head, and an assigned head is not re-graded. A pending required-check row still passes, because controller AD-7 and story AD-3 are not rules of this file.

**Unit Parent** applies the controller AD-8 predicates and counts a required check only when every row on the current head has conclusion `success`. Tokens, source, and the ban on copied `host-verified` match Unit Cell.

The same pull is a pass for one unit and a rejection for the other: the author holding `bmad`, one account holding both tokens, an ancestor review commit, or a `pending` required check.

Pasting controller AD-8 back into the Rule removes that pair and leaves another. `Review.reviewer_id` is an unconstrained string. Controller AD-8 says "reviewer ids" and, separately, "author login". `ReviewIdentity` at `bb16fa24` stores `login.strip()` and is not the host.

**Unit Login** uses the login from the named read as `reviewer_id` and as the policy-map key. **Unit Account** uses the numeric account id for both, and still excludes the author login. Claimed role text is ignored. Tokens are exactly `bmad` and `catsec`. Both require two distinct ids, the current head, and `success` checks. A renamed login is a new reviewer for Unit Login and the same reviewer for Unit Account. The owner is asked to name the read source, not this identifier and not the map from that identifier to `bmad` or `catsec`.

### F3 — High. The write ban is one file and one kind of credential

AD-6 says the future adapter file has no merge, deploy, Cursor dispatch, or repository-write call, and a write-capable token is HOLD. The controller AD-12 cell says no merge client and no deploy client are added. The story AD-6 cell says a test key and a true verify result cannot authorize a live action. `deploy.yml` on `main` does not read the correction ledger.

**Unit Quiet** keeps a read-only token. Its adapter file only reads. No other module writes a ref. A true verify result does not merge, deploy, dispatch, or open UAT or Production.

**Unit Sibling-Ref** uses the same adapter file and the same read-only token, so no write-capable token exists to force HOLD. A second module in the owner-named process updates a git ref with a credential that is not a token. The adapter file contains no write call. The ref is not a merge client and not a deploy client. `deploy.yml` does not read it. The true verify result is not what opens UAT or Production.

Quiet and Sibling-Ref disagree on whether a successful read leaves the repository unchanged. The Prevents line names a write-capable client. The Rule names the adapter file and a token. A second module and a non-token credential satisfy the Rule and still write.

A write-capable GitHub token used by that adapter is HOLD. That round-1 pair is now non-compliant. A Cursor dispatch module is the same file-shaped hole: the ban is a call inside the adapter file, and the inherited cell does not restate story AD-6's "no Cursor client". Dispatch that runs because verify returned true is separately barred by the live-action cell. The ref write above does not need that excuse.

## Axes that do not yield a compliant pair

### Role tokens

**Unit Upper** accepts `BMAD` and `CAT-SEC`. It breaks AD-6 and the consistency rule that role tokens are case-sensitive. **Unit Exact** accepts only `bmad` and `catsec`. There is no second token string that obeys the Rule. The remaining split is who is assigned those tokens, which is F2.

### Replay

Story AD-1 returns the stored flag and does not verify again. The task text says reject replay. AD-6's first sentence withholds implementation until the owner resolves that conflict, in addition to naming the process, the key path, and the read source. The Conflicts section says this spine does not override story AD-1, that implementation stays blocked until the owner picks one rule, and that the conflict is not permission to build either rule now. Deferred and Owner decision required say the same block. The sentence "Replay follows story AD-1 unless the owner explicitly replaces that rule" states the inherited rule. It is not the owner's pick.

**Unit Stored-Flag** implements return-the-flag after the three names and treats the inherited sentence as the resolution. It breaks the first sentence of AD-6 and "not a permission to build either rule now".

**Unit Reject** implements reject-replay and treats the task text as the pick. It overrides story AD-1, which the Conflicts section forbids, and it starts implementation before the owner picks.

Neither unit obeys every AD. No compliant verifier returns the stored flag, and no compliant verifier rejects the replay. The unresolved conflict is the block. It must stay unresolved until the owner picks. Choosing either rule in this spine would remove the block.

## Pairs that still do not survive

- Two units that record this slice and add no module both stop on AD-1 through AD-5. They build the same absence.
- A unit that merges PR 551, or that opens an implementation pull request before the four preconditions, breaks AD-4 or AD-6.
- A unit that uses a write-capable token for the adapter is HOLD.
- Naming the process, the public-key path, and the read source stays deferred. Absence of those names is not a hole. This review does not supply them.

## Close

Revise the post-gate sentences so the pairs in F1, F2, and F3 become non-compliant. The payload rule has to fix hex case, the JSON string encoder, and the requirement-object keys. The identity rule has to state the reviewer identifier, the map that yields `bmad` and `catsec`, the dropped controller AD-8 predicates, and the check conclusion. The write rule has to cover every module of the named process and every credential, not only the adapter file and a token. Leave the replay conflict blocking both rules.
