# Reviewer — adversarial divergence

**Lens:** Two units one level down (feature → stories) that obey every AD to the letter and still cannot compose.

**Verdict:** FAIL

The spine names the right planes and forbids the obvious cheats (self-attestation, `pull_request_target`, Production from this feature, tip-pin rewrite). It does not lock the *join contracts* between those planes. Several Rules contain an `or`, an unnamed evidence channel, or an "owner residual" escape. Deferred items then license implementers to fill those gaps independently.

No pair below violates an AD. Each pair is legal under the spine as written and produces artifacts, identities, or deploy mechanics the other unit cannot consume.

---

## Incompatible pair 1 — AD-6 is claimed by two homes (BLOCKER)

**Units**

| Unit | Story | Legal reading |
| --- | --- | --- |
| P | Implement proposed `post-merge-uat.yml` | AD-6: a *dedicated workflow* completes SUCCESS on the exact merge SHA for the listed categories. Capability map: "Post-merge mandatory tests → `post-merge-uat.yml` → AD-6, AD-7". Emits Actions artifact `post-merge-evidence.json` `{ merge_sha, verdict: PASS }`. Treats GitGuardian as the Stack-pinned `ggshield 1.56.1` job. Does not publish a check-run named `post-merge-uat`. |
| D | Wire Deploy UAT predeploy | AD-6 *also* binds "Deploy UAT predeploy". Capability map: "Tip-pin and Layer A CI → `uat-predeploy-gate.py`, `production-github-provenance.py` → AD-1, AD-6". Conventions Triggers: Deploy UAT is `workflow_run` of **CI** on `main`, not of `post-merge-uat.yml`. D therefore treats existing `ci.yml` push-main SUCCESS plus Layer A provenance as the post-merge gate, and never downloads P's artifact. |

**Why both obey every AD**

- AD-1: both pin `candidate_sha` to a 40-hex commit that is `origin/main` tip at *their* evaluation time.
- AD-2: neither fetches `origin/main` unless `UAT_DEPLOY_GATE_ACTIVE == "true"`; neither touches Environment `uat` while HOLD.
- AD-6 letter is "a dedicated workflow must complete SUCCESS" *and* "missing mandatory jobs HOLD". It never names the workflow, the job IDs, the evidence object, or the consumer query. P satisfies the first clause; D satisfies the second against a different workflow.
- AD-7: D deploys whatever SHA its own predeploy approved. P's SHA is unused.
- AD-3–AD-5, AD-8–AD-11: untouched.

**Incompatibility**

Two gates, one name. D can set `eligible=true` and start SSH while P's authz / billing / Compose / provenance jobs are still red or absent. Conversely, if a third story teaches D to require a check-run `post-merge-uat`, P's SUCCESS+artifact never unblocks deploy. Fail-closed forever and SSH-without-P are both legal outcomes of the same two ADs.

The Structural Seed diagram (`CImain → Post → Pre`) and the Capability map (AD-6 in *both* Layer A *and* `post-merge-uat.yml`) encode the fork. "Applicable regression" and "unexpectedly skipped" are undefined, so each unit also chooses a different skip matrix.

---

## Incompatible pair 2 — AD-3 identity `or` plus unnamed evidence channel (BLOCKER)

**Units**

| Unit | Story | Legal reading |
| --- | --- | --- |
| C | PR #535 consumer (`uat-readiness.py`) | Allowlist *exact slugs* `cohestra-bmad` / `cohestra-cat-sec`. Require check-runs with those names, `conclusion=success`, `head_sha == PR HEAD`. Scan check-run **output text** for the substrings `BLOCKER` and `MAJOR` (case-sensitive). Human fallback: two GitHub **PR reviews** `APPROVED` from distinct non-author `OWNER`/`MEMBER`/`COLLABORATOR`. Forbidden slugs: exact-match only. Writes `READY_FOR_OWNER_MERGE_DECISION` as `artifacts/readiness.json`. |
| R | Issue #536 producer (`uat-correction.yml`) | Uses the Rule's other arm: "or owner-pinned slugs/IDs". Posts as the Apps Q3 names (`Cohestra BMAD` / `Cohestra CAT-SEC`), which GitHub may record as different slugs or numeric App IDs. Check-run names `BMAD Review` / `CAT-SEC Review`. BLOCKER/MAJOR live in **annotation level**, not text. "Invalidate stale" = consumer must ignore non-HEAD SHAs (R does not cancel old runs). Human path: humans post **check-runs**, not PR reviews. Emits `READY_FOR_OWNER_MERGE_DECISION` as a **check-run name**. Budget = 3 (AD-10 gives no number). Manifest = `TASK.md` in the PR. |

**Why both obey every AD**

- AD-3 explicitly allows Apps *or* humans, slugs *or* owner-pinned IDs, and only bans comments / PR body / labels. It does not name check-run titles, the field that must be free of BLOCKER/MAJOR, slug-match algorithm (exact vs prefix vs `cursor[bot]`), or how a human review is represented.
- AD-4: C stays on #535, R stays on a later #536 Draft. Neither combines consumer and producer.
- AD-5: neither auto-merges; both stop at `READY_FOR_OWNER_MERGE_DECISION` — in different channels.
- AD-10: R starts from an owner-approved immutable manifest (`TASK.md` + owner approval on the PR). Persists attempt/SHA/manifest/lock — location unspecified, so an Issue comment is legal. Classifies into the three allowed buckets. Forbids `pull_request_target`. Fails closed on 403 / #505.
- AD-1, AD-2, AD-6–AD-9, AD-11: untouched.

**Incompatibility**

C never matches R's App slugs or check-run names, so authentic dual-review is invisible. R can post `conclusion=success` with MAJOR in annotations; C's text scan reports PASS — the exact "PASS-with-BLOCKER" AD-3 claims to prevent. C's ready-state JSON is unread by any owner-gate that looks for a check-run; R's check-run is unread by C. A human APPROVED review satisfies C and is ignored by R; a human check-run satisfies R and is ignored by C.

Forbidden-slug exact-match lets `cursor-agent` / `github-actions[bot]` through C while R's prefix-match rejects them — or the reverse. One App cannot satisfy both *roles*, but nothing binds role to identity vs check-run name, so C infers role from slug and R infers role from check-run title.

---

## Incompatible pair 3 — AD-7 `digest or checkout` (MAJOR)

**Units**

| Unit | Story | Legal reading |
| --- | --- | --- |
| I | Image-pin deploy | Post-merge (or CI) builds the image, records the digest, SSH pulls by digest. No git checkout on the droplet. Digest was built from the 40-hex SHA that passed predeploy. Mismatch → REFUSE. No on-droplet rebuild from a branch. |
| H | Host-checkout deploy | `remote-deploy.sh` does `git checkout <40-hex>` under `DROPLET_DEPLOY_PATH` and `compose` builds on the host. Checkout SHA equals the approved merge SHA. No digest exists. |

**Why both obey every AD**

AD-7's Rule is "the artifact digest **or** checkout used over SSH must be built from the same 40-hex SHA". Both arms are first-class. AD-1/AD-2/AD-9 are satisfied (main tip, suppressor, Environment `uat` only). AD-11 says automatic rollback is unavailable, so neither unit must implement reverse. Conventions Isolation (`cohestra-uat`) is honored by both.

**Incompatibility**

The droplet's source of truth differs (registry digest vs host tree). Acceptance, provenance, and any later rollback story have no single pin to assert. I's digest↔SHA map (image label? artifact JSON? tag?) is not in the spine; H never writes it. Two stories can both merge as "AD-7 done" and leave UAT running an image one of them cannot identify.

---

## Deferred items that license divergence

The gate test: *nothing under Deferred could let two units diverge*. Several items fail it.

| Deferred | Divergence it licenses | Severity |
| --- | --- | --- |
| **GitHub branch-protection API details** (403 → owner residual) | AD-2: keep `UAT_DEPLOY_GATE_ACTIVE` false until every control is PASS **or an explicit owner residual**. Unit G treats Q2/this Deferred as that residual and allows the owner to flip the suppressor. Unit V treats AD-5/AD-9 (`can_admins_bypass=false`, no empty `protection_rules`, no auto-merge) as mandatory controls; 403 → `UNVERIFIED` → suppressor stays false forever. Same AD-2, opposite activation. | BLOCKER |
| **Live Cursor dispatcher** (`SIMULATED_PASS` then `LIVE_SCOPED_LOOP_VERIFIED`) | Names two verdicts, not a mock contract (who emits, which artifact/check-run, what C must accept). Combined with AD-4 ("mocked plus separately authorized live evidence") and pair 2, C and R can each invent a mock that the other is required to treat as untrusted (comments) or unknown (custom check-run). AD-10's manifest format, lock store, and budget are also unspecified; deferring the dispatcher defers the whole producer join. | MAJOR |
| **Automatic rollback** | Safe *as a no-op* under AD-11, but it leaves AD-7's digest-or-checkout unresolved. The next rollback story will have to guess which pin I vs H chose. Not a current-story SSH risk; it is a deferred fork in the deploy mechanic. | MINOR (as deferred); feeds pair 3 |
| Dedicated UAT integration branch | Correctly parked; would rewrite AD-1. **However** AD-1's own Rule begins "Until a separately accepted topology decision is merged" — a story can treat merging that decision as in-scope and legally break every tip-pin script. The Deferred table is honest; the Rule text is a time-bomb. | MAJOR (Rule hole, not the Deferred row) |
| Live SSH connectivity proof | Scoped to *this architecture run*, not to implementers. Stories may still implement the SSH job behind the suppressor. Does not by itself split units. | none |
| Production activation | Explicit NO-GO. Holds. | none |
| Secret-value inspection | Forbidden. Holds. | none |

---

## Additional AD holes that make the pairs possible

These are not extra pairs. They are the underspecifications the pairs exploit.

1. **No evidence schema.** Conventions say "JSON artifacts under `artifacts/`" and verdicts `PASS`/`HOLD`/`REFUSE`/`FAIL`. No filename, no required keys, no distinction between repo path `artifacts/` and an Actions artifact name. Pair 1 and pair 2 pick different objects and remain conventional.

2. **AD-6 job list is a category list, not a job list.** ".NET build and unit tests, … applicable regression, … exact-SHA security plus GitGuardian" can be 4 jobs or 14. "Applicable" and "unexpectedly skipped" vs AD-8 "expected-absent" have no decision procedure. Paradigm diagram says "native GitGuardian"; Stack pins `ggshield 1.56.1`; AD-6 says "GitGuardian". Three legal scanners.

3. **AD-2 "decision table" is not in the spine.** Two stories can write different tables and both claim every control is PASS or residual.

4. **AD-5 ready-state has no carrier.** `READY_FOR_OWNER_MERGE_DECISION` is a string. Artifact vs check-run vs commit status vs Issue is free. Q4 then invites a later ruleset+App policy that revises AD-5 itself.

5. **AD-8 "SSH started" is untimed.** Job `deploy` scheduled vs `environment: uat` attached vs `appleboy/ssh-action` invoked vs first remote command. Unit E can start the job (artifacts become mandatory) while unit A still classifies the run as HOLD-expected-absent.

6. **AD-5 vs AD-10 token contradiction.** Controller must produce a new HEAD (AD-10) and must not have `contents: write` on `main` (AD-5). GHA permissions are not path-scoped. Unit A gives the controller `contents: read` only (corrections are suggestions). Unit B gives a GitHub App `contents: write` and promises not to push `main`. Both are literal. Who pushes the new HEAD is the Deferred dispatcher — another join with no contract.

7. **AD-10 fail-closed on "PR #505"** is a magic number with no class. One unit hardcodes `pull_number == 505`; another treats it as "fixture PRs"; a third ignores it as out-of-band. Budget, lock store, and "scope drift" are equally unbound.

8. **Open questions are silent ADs.** Q1 (secrets in env, repo, or both), Q3 (Apps not installed), Q4 (owner-only vs ruleset) each choose a side that pair 2 / AD-9 verification will need. They are listed as questions, not as "must HOLD until answered", except Q1 "blocks AD-9 verification". Verification ≠ implementation: a story can implement Environment `uat` reads and leave Q1 unanswered.

---

## What the spine already prevents (attacks that failed)

These pairs looked promising and died on a real Rule. Recorded so the FAIL is not "the spine decides nothing."

- Feature-branch or fork SSH vs main-only SSH — AD-9 + inherited Environment `uat` + `eligible=true` first.
- Cursor holding `DROPLET_SSH_KEY` — inherited Epic 45 AD-1.
- Reporter (#535) dispatching the controller or flipping `UAT_DEPLOY_GATE_ACTIVE` — AD-4 + AD-5.
- Auto-merge from a READY comment or controller token — AD-5.
- Pre-merge PR HEAD treated as UAT eligibility *inside a single unit that also implements AD-6 as written* — AD-6. The failure is that two units can *each* implement a different AD-6, not that one unit can skip it.
- Truthy suppressor (`True`, `1`, `yes`) — AD-2 exact `"true"`.
- Combining consumer and producer in one PR — AD-4.
- `pull_request_target` as the privileged-token pattern — AD-10.
- Claiming automatic rollback from #532 — AD-11.
- Production secrets or Production compose from this feature — inherited + AD-9 + Conventions Isolation.

---

## Required locks (not applied; spine is read-only)

To kill the three pairs and the Deferred escapes, the spine needs join contracts, not more intent:

1. **Single AD-6 home.** Name the workflow (`post-merge-uat.yml`), the required job IDs, the evidence object (filename + keys), and the exact query Deploy UAT predeploy must win before `eligible=true`. Remove AD-6 from the Layer A capability row or split Layer A (tip-pin) from post-merge (test matrix).
2. **AD-3 closed `or`s.** One allowlist (slugs *and* numeric App IDs, both owner-pinned). One check-run name per role. One field that must be free of BLOCKER/MAJOR. One human evidence type (PR review *or* check-run, not both-as-either). Prefix-match the forbidden slug list. Bind role to App identity, not to a spoofable title.
3. **AD-7 pick one pin.** Digest-pinned pull *or* SHA checkout, and the map that rollback will read. Delete the other arm.
4. **AD-2 residual is not a mute 403.** Branch-protection 403 is `UNVERIFIED` / HOLD, never an "explicit owner residual" that flips `UAT_DEPLOY_GATE_ACTIVE`. Name the decision table or delete the phrase.
5. **Mock contract for the Deferred dispatcher.** Define `SIMULATED_PASS` and `LIVE_SCOPED_LOOP_VERIFIED` as artifacts with schema, emitter, and the only consumer that may honor them. Define manifest schema, lock store, and budget.
6. **Strike "Until a separately accepted topology decision is merged" from AD-1's Rule.** Topology change stays Deferred; it must not be a legal in-band rewrite.

---

## Gate

**FAIL.** Two story-pairs (post-merge home; dual-review identity/channel) obey every AD and cannot compose; a third (digest vs checkout) will fork deploy/rollback. Deferred branch-protection residual plus AD-2's escape hatch can activate UAT SSH on opposite evidence. The spine is not a sufficient consistency contract for the level below.
