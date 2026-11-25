# Epic 46 — dark Production bring-up

Status: planning. Checkout pin: **BLOCKED**.  
Production: **NO-GO**. Public cutover: **NOT AUTHORIZED**.  
Evidence checked: 25 Nov 2026, 21:44 Asia/Singapore. Correction: 25 Nov 2026, 23:28 Asia/Singapore. No host was read.

This artifact plans the path. It does not authorize a merge, a checkout pin, a fetch, a compose-up, a migration, a DNS change, or a workflow dispatch. It does not clear the pin.

Story 46.4c stays `backlog` and `implementation_authorized: false` until the checkout pin is cleared and the live 46.4 name and classified-suffix check has passed. Compose-up is refused before both of those gates. This document does not clear either gate.

## Verified repository state

| Item | Evidence |
| --- | --- |
| `origin/main` | `5756a0982a9b54a63509232d2d49589971b1780b` (22 Nov 2026, 15:12 Asia/Singapore). Merge of PR #592. |
| PR #594 | Open. Head `502eefbc5525278ee0b2e557fde72d11f82ce0ef` (24 Nov 2026, 23:00 Asia/Singapore). Base is that same main. Main is an ancestor of the PR head. The PR head is not an ancestor of main. |
| Sprint status | 46.1–46.3 `done`. 46.4 and 46.5 `review`. 46.6–46.15 `backlog`. This plan adds Story 46.4c as `backlog` and does not change those statuses. |
| Recorded host checkout | `7e1cf5d48064b28a831ba20b25ac06d27e1a17fc` (24 Oct 2026, 19:34 Asia/Singapore), ancestor of main. That commit has no `deploy/prepare-production-host-env.sh`, no `deploy/production-backup.sh`, and no `ProductionBackupGate`. |
| Unguarded bootstrap blob | `a968c56598b7edf67daa191288743e58d88d17d8` is the blob of `deploy/bootstrap-production-checkout.sh` at the recorded checkout, at `origin/main`, and at the PR head. The three git objects match. That blob has no dirty-tree guard. It is not proof that a pin is safe. The file on the running host was not read. |
| Deploy Production | `.github/workflows/deploy-production.yml` triggers only on `workflow_dispatch`. |
| 46.3 remote helper | `deploy/production-remote-deploy.sh` prints `COMPOSE_UP=false`, `DATABASE_MUTATED=false`, and `STORY_46_3_DEPLOY=not_executed`. Story 46.4c does not use that helper. It is not a bring-up path. |
| Backup gate | `ProductionBackupGate.EnsureMigrationsAllowed` runs for the dedicated Production plane before EF migrations. It allows migrations only for a verified attestation whose database name is disposable and whose `production_recovery_proven` value is boolean `false`. |

PR #594 head checks on 24 Nov 2026: `.NET build and test`, `API integration tests`, `Next.js build`, `UAT isolation contract`, `Docker stack smoke`, `Exact-SHA security scan`, and `GitGuardian Security Checks` succeeded. `GitGuardian exact-SHA API scan` completed as **skipped**. That job is defined to run only when the event is `push` and the ref is `refs/heads/main` or `refs/heads/release/uat` (`.github/workflows/ci.yml`). A skipped result on the unmerged PR head is not a successful post-merge scan.

## Sequence

None of these steps is authorized now. The pin stays **BLOCKED**.

1. Merge PR #594 so the pin commit `M` satisfies the provenance rule below. The merge does not change the droplet and does not clear the pin.
2. Land a later reviewed change that adds the fail-closed reset guard and its tests. That change is not in this plan. Until it exists, the pin stays **BLOCKED**.
3. Make that reviewed script available outside the checkout and verify its blob, using the delivery rule below. Do not run blob `a968c56598b7edf67daa191288743e58d88d17d8`.
4. The owner authorizes `git reset --hard` and `chown -R deploy:deploy` for `M`. Only the verified outside copy of the guarded script may later pin the checkout to `M`. This plan does not run it. No compose-up.
5. The owner completes the live 46.4 name check and classified suffix comparison on the host `.env`.
6. Story 46.4c may leave `backlog` only after the pin is cleared and that live check has passed. This plan does not make that change. Compose-up waits for both gates.
7. Before the API starts, record the open Story 46.5 pre-API attestation. That attestation permits migrations. Story 46.5 stays open.
8. After the API is up, prove runtime SHA and `/ready` on a dark host. Story 46.13 consumes that smoke. Public DNS stays withheld.
9. Finish 46.6–46.12 and the post-schema/data half of 46.5, then 46.14. The matrix header stays `PRODUCTION=NO-GO`. The backup row stays FAIL until the second restore exists.
10. Story 46.15 is the only story that may change public DNS, and only after the owner writes `PRODUCTION CUTOVER: AUTHORIZED`.

## Provenance rule

This is the only pin-commit rule. The story stub uses this same rule.

The pin commit `M` must be a two-parent merge on `origin/main`, and `git rev-parse M^2` must equal `502eefbc5525278ee0b2e557fde72d11f82ce0ef`. A one-parent squash or rebase does not qualify. A commit that contains, includes, or is descended from that SHA does not qualify unless it is `M` and that equality holds. `deploy/validate-production-provenance.sh` accepts this merge shape: a two-parent merge whose reviewed head is `^2`. It refuses squash and rebase. GitGuardian is evaluated on the reviewed head, not on the merge commit.

PR #594 must be the unique associated pull request for `M`, with hydrated `merged` true, base ref `main`, and `merge_commit_sha` equal to `M`. If the PR head moves off `502eefbc5525278ee0b2e557fde72d11f82ce0ef`, this rule fails. Do not substitute a newer head.

Required results on `M` after it is on `origin/main`, from the `push` whose ref is `refs/heads/main`. A skipped job does not qualify:

- `.NET build and test` = success
- `API integration tests` = success
- `Next.js build` = success
- `UAT isolation contract` = success
- `Docker stack smoke` = success
- `Exact-SHA security scan` = success
- `GitGuardian exact-SHA API scan` = success

`GitGuardian Security Checks` = success on `M^2`, which is `502eefbc5525278ee0b2e557fde72d11f82ce0ef`. Success on some other SHA does not qualify. No such merge commit exists now.

## Checkout pin — BLOCKED

The pin is **BLOCKED**. A previous bootstrap run does not authorize this one. Clearing the provenance rule does not clear the pin. The dirty-tree guard below is also required, and it does not exist yet.

`deploy/bootstrap-production-checkout.sh` at blob `a968c56598b7edf67daa191288743e58d88d17d8` accepts only an explicit 40-hex `PRODUCTION_BOOTSTRAP_SHA` that is an ancestor of `origin/main`. It then runs `git reset --hard` on `/home/deploy/cohestra-production`. It has no dirty-tree guard. After the reset, when it is not under test, it runs `chown -R deploy:deploy` on that checkout and refuses if any root-owned path remains. Success output includes `COMPOSE_UP=false` and `DATABASE_MUTATED=false`. Do not execute that blob.

`git status --porcelain`, `git diff --stat HEAD`, and `git diff --cached --stat` are not a safety proof. They can be empty while `git reset --hard` still overwrites an untracked or ignored path that the target commit tracks, or discards a tracked edit hidden by the assume-unchanged bit or the skip-worktree bit. Listing those commands does not make the reset recoverable.

### Fail-closed guard that is not yet reviewed

The pin stays **BLOCKED** until a later pull request, reviewed and tested on its own, changes `deploy/bootstrap-production-checkout.sh` so that it refuses before `git reset --hard` and before `chown` when any of these is true:

- an untracked or ignored worktree path collides with a path in the target commit
- any index entry has the assume-unchanged bit
- any index entry has the skip-worktree bit

A refusal leaves `HEAD` and the worktree bytes unchanged and does not run `chown`. No other recovery method is adopted. An owner sentence that authorizes reset does not replace this guard.

That pull request's tests must cover all of the following, and the negative cases must fail closed:

- an untracked path that the target commit tracks: non-zero exit, file bytes unchanged, `HEAD` unchanged, `chown` not run
- an ignored path that the target commit tracks: the same
- a tracked edit with the assume-unchanged bit set, while `git status --porcelain` and `git diff` are empty: the same
- a tracked edit with the skip-worktree bit set, while those same commands are empty: the same
- a clean worktree: the test harness is allowed to reset

`git ls-files -v` shows the hidden bits the status and diff commands miss: a lowercase tag is assume-unchanged, and `S` or `s` is skip-worktree. The tests must assert the refusal, not merely print those tags.

### How the reviewed script is verified on-host

The guarded script is a new blob. Do not reuse `a968c56598b7edf67daa191288743e58d88d17d8` as its proof. Its merge commit `G` must be a two-parent merge on `origin/main` whose `G^2` is that guard pull request's reviewed head, not `502eefbc5525278ee0b2e557fde72d11f82ce0ef`. `G` and `G^2` need the same success checks the provenance rule lists for a merge and its second parent. `G` is not the checkout pin. The checkout pin remains `M`.

Future on-host delivery, not authorized by this document:

- `git fetch` may update remote-tracking refs only. It must not reset the worktree and must not run the unguarded script.
- Materialize `git show G:deploy/bootstrap-production-checkout.sh` to a path outside `/home/deploy/cohestra-production`.
- `git hash-object` of that outside file must equal the blob of `deploy/bootstrap-production-checkout.sh` in `G`. Refuse to run on any other hash.
- Run that outside file only. Do not run the copy inside the checkout. After a pin to `M`, the in-checkout script is still the unguarded blob, because `M^2` is the PR #594 head and this plan does not change that script.

The owner record for the pin must name `M`, name the outside script's blob, state that `git reset --hard` may discard tracked working-tree changes, and state that the script will `chown -R deploy:deploy` the checkout. The October bootstrap record does not satisfy this sentence. This document does not authorize that run. It remains blocked until the guard exists and the outside hash matches. A later run's required result is `RESULT=PASS`, `HEAD_SHA` equal to `M`, `COMPOSE_UP=false`, and `DATABASE_MUTATED=false`. That run creates no `.env`, starts no container, and does not dispatch Deploy Production.

Pinning current main `5756a0982a9b54a63509232d2d49589971b1780b` installs the older validator. It is not `M`.

## Live 46.4 check

After the pin, the owner creates the host `.env` outside git and runs the validator that is in that checkout:

`bash deploy/prepare-production-host-env.sh --check-names /home/deploy/cohestra-production/.env`

Evidence is `HOST_ENV_NAMES=present` plus a classified name and 4-character-suffix comparison against UAT, with no secret values recorded. Story 46.4 stays `review` until that evidence exists. This check is not a compose-up. Story 46.4c does not start when only this check, or only the pin, is done.

## Story 46.4c — first staged dark compose-up

46.4c is the first story allowed to run `docker compose up` for project `cohestra-production`, and only after its authorization rule is met. It stays `backlog` and `implementation_authorized: false` until the checkout pin is cleared and the live 46.4 name and classified-suffix check has passed. Compose-up is refused before both of those gates. This document does not clear either gate. It does not call `deploy/production-remote-deploy.sh`.

Story 46.5 is an open gate attestation before API startup. It is not a completed dependency for starting 46.4c. The pre-API attestation does not close 46.5.

Acceptance criteria:

- Host `HEAD` is `M`. The 46.4 name and classified-suffix check has passed. `deploy` is not added to group `docker`.
- Postgres and Redis start first, with no published host ports. API, web, and nginx stay stopped.
- The open 46.5 pre-API attestation below exists and `ProductionBackupGate` would allow migrations. Story 46.5 stays `review`.
- The API, web, and nginx then start. Runtime `GIT_SHA` equals checkout `HEAD`. `/ready` is Healthy on a dark host or an IP/Host-header probe.
- `cohestra.app` DNS is unchanged. `Paddle__AllowLive` stays false. The evidence records `PRODUCTION=NO-GO` and does not contain `PRODUCTION CUTOVER: AUTHORIZED`.

## 46.5 split

**Before the API starts.** On the dedicated host, with Postgres up and the API down, the owner runs `deploy/production-backup.sh backup` for local database `cohestra` with `BACKUP_SOURCE_PLANE=dedicated-local`. The database may still be empty. On a restore workstation, `restore-isolated` targets a disposable database whose name ends in `_disposable` and does not contain `cohestra`, `uat`, `prod`, or `production`. The written attestation has `status=verified` and `production_recovery_proven` boolean `false`. That file is what the migration gate accepts. It does not close Story 46.5. Story 46.4c does not wait for 46.5 to be done.

**Before 46.14.** After the dark migration has created schema and data, take a second off-host backup and restore that artifact in isolation. The readiness row stays FAIL until that evidence exists. Leave `production_recovery_proven` false so later migrations still pass the gate. `production_recovery_proven: true` blocks migrations. Story 46.5 stays open until that later isolated restore of a backup taken after schema and data exist.

## Later stories

- 46.13 dark-host smoke uses the 46.4c runtime. Public DNS and public `cohestra.app` TLS stay owner-gated and are not part of 46.4c. With no DNS approval, smoke uses a dark host or an IP/Host header, and `cohestra.app` is not pointed at Production.
- 46.6 through 46.12 remain their own stories. Repo and local-compose work can proceed while the pin is BLOCKED. Host evidence waits for the dark runtime.
- 46.14 collects the matrix, including the 46.5 post-data restore, and keeps `PRODUCTION=NO-GO`.
- 46.15 is the only public-DNS and cutover story. It stays blocked until the owner writes `PRODUCTION CUTOVER: AUTHORIZED`.
