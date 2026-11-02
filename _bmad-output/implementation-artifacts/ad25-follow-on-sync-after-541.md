# Follow-on AD-25 sync after PR #541 (do not open/merge yet)

**Do not merge a synchronization PR until owner-policy enforcement is externally required *and pinned* on `release/uat`.**

Draft status of #542 is a soft hold only. External enforcement means Layer A (Cursor `contents: read`) plus Layer B (`AD25-Owner-Policy` with Owner-Policy App `integration_id` in live ruleset JSON).

## Dest parent is no longer PR-C

| | Old plan assumption | Live fact |
| --- | --- | --- |
| `release/uat` tip | `1c57633` (PR-C) | **`6e8388eef944a0fe95f1218502cac49681a60dd2`** (PR #541 merge) |

Any new sync must use dest parent **`6e8388ee`**, not `1c57633`. Re-read `origin/release/uat` immediately before opening the sync PR.

Authorized source remains `main` after #542 is owner-merged. Until then, source candidate is Draft HEAD `ade3c828` (not mergeable as policy).

`#541` did **not** rewrite `main`. Trusted-ref pin `9ccca77e` is still `origin/main`.

## What #542 changes vs current `release/uat`

Of the 21 allowlist paths, **5 differ** between `6e8388ee` and `ade3c828` (re-verified this investigation):

- `.github/workflows/ci.yml`
- `deploy/ad25-sync-allowlist.txt` (comments only; path set still 21)
- `deploy/lib/ad25_sync_allowlist.py`
- `deploy/validate-ad25-sync-fixture.test.sh`
- `deploy/validate-ad25-sync-procedure.sh`

16 allowlist paths are already identical, including `deploy.yml` and `deploy/lib/uat-predeploy-gate.py`.

## Owner-policy expansion (required for an executable dest tree)

#542’s fixture and `ci.yml` **HOLD** if the hardening contract file is missing. Therefore a 21-path-only copy of `ade3c828` onto `6e8388ee` would make dest CI/fixture fail.

Owner must first expand the approved set (human merge to `main`, after Owner-Policy App is live **and pinned**) to add:

- `deploy/ad25-owner-policy.json`
- `deploy/lib/ad25_hardening_contract.py`
- `deploy/validate-ad25-hardening.test.sh`
- `deploy/reproduce-ad25-trust-boundary.sh`

Docs under `_bmad-output/` stay off the allowlist.

That expansion PR is control-plane. It **cannot** self-authorize.

**App verdict for expansion (base `main`):** owner attestation + App-bundled classifier. Do **not** require dest-tree exact-match against `release/uat`. Do **not** `exec` `origin/main` Python. A trusted-ref `authorize_from_trusted_ref` against pre-expansion `origin/main` will refuse the larger set if invoked as a dest-sync function — that is expected, and is why expansion and dest-sync must be different verdicts.

## Then dest-tree sync

1. Dest parent = then-current `origin/release/uat` (today `6e8388ee`; re-read).
2. Source = post-expansion `main` SHA.
3. Copy every then-approved path. Exact blob match. Changed paths ⊆ allowlist.
4. Owner-Policy App SUCCESS on that SHA (Verdict B: attestation + exact-tree + ancestor).
5. Human `fad16papa` merge on GitHub.com. Never cursor[bot]. Never FF of `main`.
6. Merge will start AD-23 Deploy UAT. Gate must remain **false** → HOLD, SSH skipped.

## Abort

- Sync PR merged before `AD25-Owner-Policy` is a **pinned** required check on `release/uat`.
- Sync while Cursor still has `contents: write`.
- Sync that includes `src/`, `web/`, Production, secrets, ADCP.
- 21-path-only copy of #542 that omits the four extra hardening files.
- Using dest parent `1c57633`.
- UAT gate flipped to true as part of sync.
- App executes repository Python to “authorize” the sync.
