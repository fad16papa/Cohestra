# Adversarial divergence review — Issue 536 host trust boundary

- Reviewer: adversarial divergence
- Artifact: `ARCHITECTURE-SPINE.md`
- Date: 2026-11-03
- Verdict: **revise**

## Verdict

Two later units can each obey every rule in this file and still ship verifiers that disagree on the signed bytes, on who counts as BMAD or CAT-SEC, and on whether the host can write. AD-6 states those three forks as closed. They are open. The unnamed host process, the public-key path, and the GitHub read source stay owner decisions. This review does not name a host.

Altitude is feature. The units one level down are the two implementations that start after the owner has named those three things. AD-1 through AD-5 keep both of them from adding a host on this slice. The clashes below are all in the post-naming contract AD-6 already claims to bind.

Parent spines were read only as evidence of what this file says it inherits (`story-acceptance` and `correction-controller` at `bb16fa24`). Their sentences are not copied into this spine. The "Binds here" cells replace them with shorter rules.

## Findings

### F1 — Critical. Key binding is two signed documents

AD-6 says one verifier binds key id, public-key fingerprint, canonical payload, signature, repository, task, pull request, base ref, and required scope, and rejects a mismatch. The inherited story AD-1 cell says a content digest is not owner authorization and the private key stays outside the repository. Neither sentence fixes the bytes.

**Unit Key-Envelope** signs a UTF-8 JSON object whose keys are the AD-6 nouns spelled as `key_id`, `fingerprint`, `payload`, `repository`, `task`, `pull_request`, `base_ref`, and `required_scope`. Sorted keys, separators comma and colon. The fingerprint is base64 of SHA-256, SSH style. `required_scope` is the read credential's permission set. `base_sha` is absent because AD-6 does not list it. The signature covers that object. A mismatch of any of those fields fails verify. A missing key or a bad signature returns HOLD.

**Unit Key-Parent** signs the version-2 object already fixed on the story-acceptance spine: keys exactly `acceptance_criteria`, `allowed_paths`, `author_id`, `authorization`, `base_ref`, `base_sha`, `budget`, `manifest_id`, `manifest_version`, `model`, `pull_number`, `repo`, `required_checks`, `requirements`, and `task_id`, with `authorization` holding `key_id` and `public_key_sha256`. The fingerprint is lowercase hex SHA-256 of the 32 public-key bytes. The signature sits outside the payload. Repository, task, pull request, and base ref are the fields `repo`, `task_id`, `pull_number`, and `base_ref`. Required scope is `allowed_paths`. A digest match is ignored as authorization. The private key stays outside the repository.

Both units wait for the three owner names. Both reject mismatch, malformed data, a missing key, and an invalid signature. Both refuse a caller-built key as the host. Their signatures do not verify under each other. A manifest Unit Key-Parent accepts is malformed to Unit Key-Envelope.

Importing the parent story AD-1 in full removes the fingerprint and key-set fork. It leaves a second pair, because "required scope" is not a field on that object:

- **Unit Scope-Paths** treats required scope as `allowed_paths` inside the signed object.
- **Unit Scope-Grant** treats required scope as the live credential's granted permissions, checked beside a valid signature, and rejects when the grant differs.

Both still verify the parent object and reject a scope mismatch of the kind they chose. A signed manifest with a legal path list and a broader grant is a pass for one and HOLD for the other.

"Binds" is also free. One unit puts repository, task, pull request, and base ref inside the signature. The other checks them as unsigned equality against caller context after a payload-only verify. AD-6 accepts both readings. The preamble says this spine does not weaken the parent rules, and the parent byte contract is the one that would close this. That contract is not an enforceable sentence of this file, and it is not on `main`.

### F2 — Critical. Identity proof still splits after the read source is named

AD-6 says reviewer identity comes from the authenticated source the owner names, and that BMAD and CAT-SEC are distinct non-author roles bound to the exact source SHA, together with required checks. Webhook, comment, Cursor output, and a caller flag are refused. Controller AD-8's cell in this file adds only: `host-verified` is not copied from webhook, comment, or pull-request JSON.

**Unit Roster** uses two GitHub numeric user ids from the named read. Policy roles are exactly `bmad` and `catsec`. The same person cannot fill both. The pull author cannot fill either. Each review's `head_sha` equals the pull's current head. Claimed role text is ignored. Role membership comes from an allow-list delivered with the public key. Required checks count only when every row on that head is `success`.

**Unit Labels** uses the role strings written in AD-6, `BMAD` and `CAT-SEC`. "Distinct non-author roles" means two role labels, so one GitHub login can hold both, and the pull author can hold one, because the adjective describes the roles. The bound SHA is the commit id on the review record when that commit is an ancestor of the current head. Required checks are stored on the decision and a `pending` check still passes. Identity is still taken from the named authenticated source. Nothing is copied from a webhook, a comment, Cursor output, or a caller flag.

Both units satisfy every identity sentence in this file. They disagree on the author-as-reviewer case, on one person holding both roles, on an older review commit, and on a pending required check. Those are different accept sets for the same pull.

The parent controller rule would close several of these (two reviewer ids, roles `bmad` and `catsec`, author login excluded, current head, blocker and major bounds). This spine's "Binds here" cell does not carry those predicates, so a unit that follows this file never has to. Even a unit that imports the parent still has a free membership function: the parent ignores claimed role text and never says whether `bmad` and `catsec` are team slugs, an out-of-band roster, or environment reviewers. The owner is asked to name the read source, not that map. Two importers pick two maps and issue `host-verified` to different people.

`reviewer_id` on the parent model is an unconstrained string. One importer uses the login. The other uses the numeric account id. A renamed login is a new reviewer for one and the same reviewer for the other.

AD-6's "exact source SHA" is not equated with the parent's "current head". Equating them is one compliant choice. Binding the review's own commit id is another choice this file also allows.

### F3 — High. Write capability is the adapter's method list

AD-6 says the adapter exposes no merge, deploy, dispatch, or other write. The prevents line says a write-capable GitHub client. The rule's subject is what the adapter exposes.

**Unit Silent** has read methods only, and the credential can perform only those reads. The host returns HOLD or a pass in memory. It writes no GitHub object, no variable, and no deploy input.

**Unit Token** has the same read-only method list. The installation token still includes contents write and pull-request write. A second client in the same host process calls merge. The adapter object itself exposes no merge, deploy, dispatch, or other write.

**Unit Pass-File** keeps the adapter read-only and writes a pass record the existing deploy workflow can consume as a gate input. AD-5 forbids this slice from editing workflows, secrets, rulesets, and environments. It says nothing about a later host minting a new authorization record. "A mock cannot authorize a live action" leaves a real pass free to authorize one once it is persisted.

All three wait for the owner names, reject bad trust material, and keep merge, deploy, and dispatch off the adapter type. Silent and Token disagree on whether the process can merge. Silent and Pass-File disagree on whether a successful verify mutates a deploy input. The prevents line is stronger than the rule, and the rule is what a literal implementer has to obey.

### F4 — High. Two owners of the authorization bit, and two mutation paths for replay

The parent decision carries `owner_manifest_authorized`. Story AD-1 on that spine sets the flag true if and only if version-2 verify succeeded, and a replay returns the stored flag and does not verify again. This file never mentions the flag. AD-6 says a replay is rejected, and missing or invalid trust material returns HOLD. The naming table says the status for this slice is HOLD. The parent status set uses `HOLD_OWNER_ACTION_REQUIRED` and has no bare `HOLD`.

**Unit Flag** is the only writer of `owner_manifest_authorized`. A repeat of the same ledger event returns the stored flag and does not verify again. Cross-binding reuse fails because the pull number sits inside the signed payload. Failure is `HOLD_OWNER_ACTION_REQUIRED`. The slice label HOLD stays a document status.

**Unit Return** is the only writer of the host result. It leaves `owner_manifest_authorized` false. A second presentation of a signature that already passed is rejected, so the stored pass is not returned. Failure is the string `HOLD`. Success is a boolean true.

Each unit can cite a sentence this spine tells it not to weaken, and a sentence AD-6 states outright. Joint behavior is empty on ledger replay: returning the stored true flag and rejecting that same replay cannot both happen. Callers then split. A controller that trusts the flag sees false while Unit Return has already passed the same manifest. A retry of a good verify is a pass for Unit Flag and HOLD for Unit Return.

## Pairs that do not survive

- Two units that only record this slice both stop. AD-1 pins the absent verifier to `9ccca77e`. AD-2 keeps `verify_owner_authorization` and the unit-test workflow from being the host. AD-3 keeps recorded envelopes and comment JSON unauthenticated. AD-4 refuses a stacked pull request that invents the runtime. AD-5 leaves the deploy workflows and their variable names alone. Those two units build the same thing: no host.
- A unit that merges PR 551, or that adds a verifier on a later commit before the three names exist, breaks AD-4 or AD-6. It is not a second compliant owner.
- A unit that treats Cursor subagent text as the BMAD or CAT-SEC proof breaks AD-6's ban on Cursor output.
- Naming the host process, the out-of-band public-key path, and the authenticated read source is deferred on purpose. Absence of those names is not a hole. Choosing a process, a path, or a GitHub product here would invent the host this spine refuses to choose.

## Close

Revise AD-6 so the pairs above become non-compliant. The byte contract, the fingerprint, the identity predicate, the replay result, and the write subject have to be single sentences a later unit can obey or break. Inlining the parent sentences this file claims not to weaken is enough for the pairs the parent already decided. Role membership and "required scope" are not decided there either, so a tightened rule has to fix them without naming a host. Until that, two compliant verifiers will not accept the same manifest.
