---
id: 46.4c
key: 46-4c-dark-production-bring-up
title: Dark Production bring-up
status: backlog
epic: 46
created: 2026-11-25
baseline_commit: 5756a0982a9b54a63509232d2d49589971b1780b
depends_on:
  - 46.2
  - 46.3
  - 46.4
open_gate: 46.5 attestation before API startup; 46.5 is not a completed dependency
owner_gate: checkout pin cleared, then live 46.4 name and classified-suffix check
implementation_authorized: false
checkout_pin: BLOCKED
cutover_authorization: NOT_GRANTED
production: NO-GO
planning_artifact: _bmad-output/planning-artifacts/epic-46/dark-production-bring-up.md
---

# Story 46.4c: Dark Production bring-up

Status: backlog

## Story

As a **platform operator**,
I want **the first Production compose-up to be staged, dark, and tied to one reviewed SHA**,
so that **the API cannot migrate or serve before a verified isolated restore, and public DNS stays untouched**.

**Depends on:** 46.2, 46.3, and the live 46.4 name and classified-suffix check. Story 46.4 stays `review`.  
**Open gate:** Story 46.5 is an open attestation before API startup. It is not a completed dependency for starting 46.4c. It stays open until a later isolated restore of a backup taken after schema and data exist.  
**Owner gate:** the checkout pin is cleared, and then the live 46.4 check has passed.  
**Rollback:** stop the 46.4c containers; leave the droplet dark; do not change DNS.

Canonical plan: `_bmad-output/planning-artifacts/epic-46/dark-production-bring-up.md`.

Story 46.4c stays `backlog` and `implementation_authorized: false` until the checkout pin is cleared and the live 46.4 name and classified-suffix check has passed. Compose-up is refused before both of those gates. This document does not clear either gate. Do not implement host execution, and do not start containers, from this stub alone.

## Blocked pin

The checkout pin is **BLOCKED**. Provenance for PR #594 is not enough to clear it. The fail-closed reset guard specified below does not exist yet. An earlier bootstrap run does not provide authorization.

### Provenance rule

This is the same rule as the canonical plan.

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

### Reset guard

Blob `a968c56598b7edf67daa191288743e58d88d17d8` is the current `deploy/bootstrap-production-checkout.sh`. It has no dirty-tree guard. It runs `git reset --hard` and then `chown -R deploy:deploy`. Do not execute that blob. `git status --porcelain`, `git diff --stat HEAD`, and `git diff --cached --stat` are not a safety proof. They can be empty while reset overwrites an untracked or ignored path that the target commit tracks, or discards a tracked edit hidden by assume-unchanged or skip-worktree.

The pin stays **BLOCKED** until a later reviewed and tested pull request changes `deploy/bootstrap-production-checkout.sh` so that it refuses before `git reset --hard` and before `chown` when an untracked or ignored path collides with a path in the target commit, or any index entry has the assume-unchanged bit or the skip-worktree bit. A refusal leaves `HEAD` and the worktree bytes unchanged and does not run `chown`. No other recovery method is adopted.

That pull request's tests must fail closed for a colliding untracked path, a colliding ignored path, an assume-unchanged edit with empty status and diff, and a skip-worktree edit with empty status and diff. Each negative test must show a non-zero exit, unchanged bytes, unchanged `HEAD`, and no `chown`. A clean worktree may reset in the test harness. `git ls-files -v` shows the hidden bits: a lowercase tag is assume-unchanged, and `S` or `s` is skip-worktree. The tests must assert the refusal, not merely print those tags.

The guarded script is a new blob. Do not reuse `a968c56598b7edf67daa191288743e58d88d17d8` as its proof. Its merge commit `G` must be a two-parent merge on `origin/main` whose `G^2` is that guard pull request's reviewed head, not `502eefbc5525278ee0b2e557fde72d11f82ce0ef`. `G` and `G^2` need the same success checks the provenance rule lists for a merge and its second parent. `G` is not the checkout pin. The checkout pin remains `M`.

Future on-host delivery, not authorized by this stub: `git fetch` may update remote-tracking refs only. Materialize `git show G:deploy/bootstrap-production-checkout.sh` outside `/home/deploy/cohestra-production`. `git hash-object` of that outside file must equal the blob of that path in `G`. Run that outside file only. Do not run the copy inside the checkout. After a pin to `M`, the in-checkout script is still the unguarded blob.

The owner record must name `M`, name the outside script's blob, and authorize both `git reset --hard` and `chown -R deploy:deploy` on `/home/deploy/cohestra-production`. That record does not authorize the run while the guard is absent or the hash does not match.

## Acceptance criteria

1. **Given** the pin is BLOCKED or the live 46.4 name and classified-suffix check has not passed  
   **When** an operator attempts the 46.4c bring-up  
   **Then** the story is still `backlog` with `implementation_authorized: false`  
   **And** it refuses before `docker compose up`.

2. **Given** the approved pin commit `M` is checked out by the guarded script and the 46.4 name and classified-suffix check passed  
   **When** 46.4c starts the stack  
   **Then** Postgres and Redis come up first with no published host ports  
   **And** `deploy` is not added to group `docker`  
   **And** API, web, and nginx stay stopped.

3. **Given** Postgres is up and the API is stopped  
   **When** the owner records the pre-API attestation  
   **Then** it comes from `backup` of dedicated-local `cohestra` and `restore-isolated` into a disposable database  
   **And** `status` is `verified` and `production_recovery_proven` is boolean `false`  
   **And** Story 46.5 stays open. This attestation is not a completed 46.5 dependency, and 46.4c does not wait for 46.5 to be done.

4. **Given** that open attestation is in place  
   **When** API, web, and nginx start  
   **Then** `ProductionBackupGate` allows migrations  
   **And** runtime `GIT_SHA` equals checkout `HEAD`  
   **And** `/ready` is Healthy on a dark host or an IP/Host-header probe.

5. **Given** this story  
   **When** evidence is recorded  
   **Then** `cohestra.app` DNS is unchanged  
   **And** `Paddle__AllowLive` stays false  
   **And** the record says `PRODUCTION=NO-GO`  
   **And** it does not contain `PRODUCTION CUTOVER: AUTHORIZED`.

6. **Given** `deploy/production-remote-deploy.sh`  
   **When** 46.4c runs  
   **Then** that helper is not invoked. Its dry-run output is not treated as this bring-up.

7. **Given** blob `a968c56598b7edf67daa191288743e58d88d17d8` or a status and diff listing offered as proof that `git reset --hard` is safe  
   **When** a pin is attempted  
   **Then** the pin stays **BLOCKED**  
   **And** that blob is not executed.

## Non-goals

- Do not dispatch Deploy Production.
- Do not create or read a Production `.env` in git.
- Do not change public DNS or run Story 46.15.
- Do not mark Story 46.4, 46.5, 46.13, 46.14, or 46.15 done.
- Do not close 46.5 on the pre-API attestation. The later isolated restore of a backup taken after schema and data exist remains required before 46.14.
- Do not edit `deploy/bootstrap-production-checkout.sh` or its tests in this story stub.

## Tasks

- [ ] Confirm the provenance rule: `M` is a two-parent merge and `M^2` is `502eefbc5525278ee0b2e557fde72d11f82ce0ef`
- [ ] Confirm the reviewed fail-closed guard and its collision and hidden-index tests have passed, and that the executed blob is not `a968c56598b7edf67daa191288743e58d88d17d8`
- [ ] Confirm the checkout pin is cleared and the live 46.4 name and classified-suffix check has passed before `implementation_authorized` may become true
- [ ] Specify the staged compose commands for project `cohestra-production` without calling the 46.3 dry-run helper
- [ ] Refuse bring-up when the open 46.5 attestation or the 46.4 check is absent
- [ ] Record dark `/ready` and runtime SHA evidence with no secret values
