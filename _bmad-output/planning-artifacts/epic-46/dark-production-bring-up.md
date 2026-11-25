# Epic 46 — dark Production bring-up

Status: planning. Checkout pin: **BLOCKED**.  
Production: **NO-GO**. Public cutover: **NOT AUTHORIZED**.  
Evidence checked: 25 Nov 2026, 21:44 Asia/Singapore. No host was read.

This artifact plans the path. It does not authorize a merge, a checkout pin, a compose-up, a migration, a DNS change, or a workflow dispatch.

## Verified repository state

| Item | Evidence |
| --- | --- |
| `origin/main` | `5756a0982a9b54a63509232d2d49589971b1780b` (22 Nov 2026, 15:12 Asia/Singapore). Merge of PR #592. |
| PR #594 | Open. Head `502eefbc5525278ee0b2e557fde72d11f82ce0ef` (24 Nov 2026, 23:00 Asia/Singapore). Base is that same main. Main is an ancestor of the PR head. The PR head is not an ancestor of main. |
| Sprint status | 46.1–46.3 `done`. 46.4 and 46.5 `review`. 46.6–46.15 `backlog`. This plan adds Story 46.4c as `backlog` and does not change those statuses. |
| Recorded host checkout | `7e1cf5d48064b28a831ba20b25ac06d27e1a17fc` (24 Oct 2026, 19:34 Asia/Singapore), ancestor of main. That commit has no `deploy/prepare-production-host-env.sh`, no `deploy/production-backup.sh`, and no `ProductionBackupGate`. |
| Bootstrap script blob | `a968c56598b7edf67daa191288743e58d88d17d8` is the blob of `deploy/bootstrap-production-checkout.sh` at the recorded checkout, at `origin/main`, and at the PR head. The three git objects match. The file on the running host was not read. |
| Deploy Production | `.github/workflows/deploy-production.yml` triggers only on `workflow_dispatch`. |
| 46.3 remote helper | `deploy/production-remote-deploy.sh` prints `COMPOSE_UP=false`, `DATABASE_MUTATED=false`, and `STORY_46_3_DEPLOY=not_executed`. Story 46.4c does not use that helper. It is not a bring-up path. |
| Backup gate | `ProductionBackupGate.EnsureMigrationsAllowed` runs for the dedicated Production plane before EF migrations. It allows migrations only for a verified attestation whose database name is disposable and whose `production_recovery_proven` value is boolean `false`. |

PR #594 head checks on 24 Nov 2026: `.NET build and test`, `API integration tests`, `Next.js build`, `UAT isolation contract`, `Docker stack smoke`, `Exact-SHA security scan`, and `GitGuardian Security Checks` succeeded. `GitGuardian exact-SHA API scan` completed as **skipped**. That job is defined to run only when the event is `push` and the ref is `refs/heads/main` or `refs/heads/release/uat` (`.github/workflows/ci.yml`). A skipped result on the unmerged PR head is not a successful post-merge scan.

## Sequence

1. Merge the reviewed 46.4 correction, PR #594 head `502eefbc5525278ee0b2e557fde72d11f82ce0ef`, to `main`. The merge does not change the droplet.
2. Wait until the checkout pin below is no longer BLOCKED.
3. Owner-run a checkout-only pin to that exact post-merge SHA. No compose-up.
4. Owner completes the live 46.4 name check and classified suffix comparison on the host `.env`.
5. Story 46.4c performs the first staged dark compose-up.
6. Before the API starts, complete the pre-API backup and isolated restore. That attestation permits migrations. Story 46.5 stays open.
7. After the API is up, prove runtime SHA and `/ready` on a dark host. Story 46.13 consumes that smoke. Public DNS stays withheld.
8. Finish 46.6–46.12 and the post-schema/data half of 46.5, then 46.14. The matrix header stays `PRODUCTION=NO-GO`. The backup row stays FAIL until the second restore exists.
9. Story 46.15 is the only story that may change public DNS, and only after the owner writes `PRODUCTION CUTOVER: AUTHORIZED`.

## Checkout pin — BLOCKED

The pin is **BLOCKED**. A previous bootstrap run does not authorize this one.

`deploy/bootstrap-production-checkout.sh` accepts only an explicit 40-hex `PRODUCTION_BOOTSTRAP_SHA` that is an ancestor of `origin/main`. It then runs `git reset --hard` on `/home/deploy/cohestra-production`. It has no dirty-tree guard. After the reset, when it is not under test, it runs `chown -R deploy:deploy` on that checkout and refuses if any root-owned path remains. Success output includes `COMPOSE_UP=false` and `DATABASE_MUTATED=false`.

### Preconditions that are not proven

1. **Post-merge SHA and checks.** No merge commit exists. Required evidence, all on that exact merge commit after it is on `origin/main` and contains `502eefbc5525278ee0b2e557fde72d11f82ce0ef`:
   - `.NET build and test` = success
   - `API integration tests` = success
   - `Next.js build` = success
   - `UAT isolation contract` = success
   - `Docker stack smoke` = success
   - `Exact-SHA security scan` = success
   - `GitGuardian exact-SHA API scan` = success. `skipped` does not qualify. This job runs on the `main` push of the merge commit.
   - `GitGuardian Security Checks` = success on the reviewed PR head that the merge records as the second parent.
2. **Host bootstrap script.** Repository blobs match (`a968c56598b7edf67daa191288743e58d88d17d8`) at the recorded checkout, `origin/main`, and the PR head. Required read-only host evidence, as user `deploy`, before any reset:
   - `git rev-parse HEAD` is the recorded checkout `7e1cf5d48064b28a831ba20b25ac06d27e1a17fc`, or a later SHA the owner has already pinned under this plan
   - `git rev-parse HEAD:deploy/bootstrap-production-checkout.sh` equals `a968c56598b7edf67daa191288743e58d88d17d8`
   - `git hash-object deploy/bootstrap-production-checkout.sh` equals that same blob
3. **Working tree.** Required read-only evidence, in the same checkout, before any reset:
   - `git status --porcelain`
   - `git diff --stat HEAD`
   - `git diff --cached --stat`
   Tracked and staged output must be empty. List untracked paths and leave them in place. `git reset --hard` would discard tracked and staged work. This evidence was not collected.
4. **Explicit owner authorization for this pin.** The owner record must name the post-merge SHA, state that `git reset --hard` may discard tracked working-tree changes, and state that the script will `chown -R deploy:deploy` the checkout. The October bootstrap record does not satisfy this sentence.

When every item above is attached, the owner may run, as root, on hostname `cohestra-production`:

`PRODUCTION_BOOTSTRAP_SHA=<post-merge SHA> deploy/bootstrap-production-checkout.sh`

using the on-host script whose blob matched `a968c56598b7edf67daa191288743e58d88d17d8`. Required result: `RESULT=PASS`, `HEAD_SHA` equal to that SHA, `COMPOSE_UP=false`, `DATABASE_MUTATED=false`. The run creates no `.env`, starts no container, and does not dispatch Deploy Production.

Pinning current main `5756a0982a9b54a63509232d2d49589971b1780b` installs the older validator. It is not the pin target.

## Live 46.4 check

After the pin, the owner creates the host `.env` outside git and runs the validator that is in that checkout:

`bash deploy/prepare-production-host-env.sh --check-names /home/deploy/cohestra-production/.env`

Evidence is `HOST_ENV_NAMES=present` plus a classified name and 4-character-suffix comparison against UAT, with no secret values recorded. Story 46.4 stays `review` until that evidence exists. This check is not a compose-up.

## Story 46.4c — first staged dark compose-up

46.4c is the first story allowed to run `docker compose up` for project `cohestra-production`. It stays `backlog` and `implementation_authorized: false` until the pin is not BLOCKED and the live 46.4 check has passed. It does not call `deploy/production-remote-deploy.sh`.

Acceptance criteria:

- Host `HEAD` is the approved post-merge SHA. The 46.4 name check has passed. `deploy` is not added to group `docker`.
- Postgres and Redis start first, with no published host ports. API, web, and nginx stay stopped.
- The pre-API attestation below exists and `ProductionBackupGate` would allow migrations.
- The API, web, and nginx then start. Runtime `GIT_SHA` equals checkout `HEAD`. `/ready` is Healthy on a dark host or an IP/Host-header probe.
- `cohestra.app` DNS is unchanged. `Paddle__AllowLive` stays false. The evidence records `PRODUCTION=NO-GO` and does not contain `PRODUCTION CUTOVER: AUTHORIZED`.

## 46.5 split

**Before the API starts.** On the dedicated host, with Postgres up and the API down, the owner runs `deploy/production-backup.sh backup` for local database `cohestra` with `BACKUP_SOURCE_PLANE=dedicated-local`. The database may still be empty. On a restore workstation, `restore-isolated` targets a disposable database whose name ends in `_disposable` and does not contain `cohestra`, `uat`, `prod`, or `production`. The written attestation has `status=verified` and `production_recovery_proven` boolean `false`. That file is what the migration gate accepts. It does not close Story 46.5.

**Before 46.14.** After the dark migration has created schema and data, take a second off-host backup and restore that artifact in isolation. The readiness row stays FAIL until that evidence exists. Leave `production_recovery_proven` false so later migrations still pass the gate. `production_recovery_proven: true` blocks migrations.

## Later stories

- 46.13 dark-host smoke uses the 46.4c runtime. Public DNS and public `cohestra.app` TLS stay owner-gated and are not part of 46.4c. With no DNS approval, smoke uses a dark host or an IP/Host header, and `cohestra.app` is not pointed at Production.
- 46.6 through 46.12 remain their own stories. Repo and local-compose work can proceed while the pin is BLOCKED. Host evidence waits for the dark runtime.
- 46.14 collects the matrix, including the 46.5 post-data restore, and keeps `PRODUCTION=NO-GO`.
- 46.15 is the only public-DNS and cutover story. It stays blocked until the owner writes `PRODUCTION CUTOVER: AUTHORIZED`.
