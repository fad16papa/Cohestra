# AD25-HARDENING — follow-on release/uat synchronization plan

**Do not open or merge this synchronization PR until the AD25-HARDENING implementation is accepted.**  
**Do not update `release/uat` in this story.**  
**Label the later sync PR `AD25-HARDENING-SYNC`. Do not call it PR-E.**

## Why a second PR

This implementation targets `main` only. AD-25 still copies an exclusive 21-path tree onto protected `release/uat`. Several hardening artifacts are **not** on that 21-path set. A 21-path-only sync of this HEAD is incomplete: dest would receive the hardened validator and updated fixture/procedure, but not the owner-policy JSON, contract module, reproduction script, or design docs.

## Current 21-path set (unchanged)

Keep `deploy/ad25-sync-allowlist.txt` at the owner-approved 21 paths unless a later owner-authorized policy change is accepted. The hardened validator **refuses** an expanded file without trusted-ref equality.

## Two-step owner sequence (after this Draft is accepted and merged to `main`)

### Step 1 — Owner-authorized policy expansion (control-plane, human merge only)

Only if dest CI should execute the new contract on `release/uat`. Add these paths to the owner-approved set by changing, in one owner-reviewed PR to `main`:

- `deploy/ad25-owner-policy.json`
- `deploy/lib/ad25_hardening_contract.py`
- `deploy/validate-ad25-hardening.test.sh`
- `deploy/reproduce-ad25-trust-boundary.sh`

That PR must **not** self-authorize. `authorize_from_trusted_ref` against the pre-change `origin/main` will refuse the expanded allowlist. The owner merges it in the GitHub UI after independent review. After merge, `origin/main` becomes the new trusted policy.

Do not add application, Production, secret, ADCP, or unapproved `.github` paths.

Docs under `_bmad-output/` stay off the allowlist (not executed by dest CI).

### Step 2 — AD-25 dest-tree sync into `release/uat`

1. Dest parent = current `origin/release/uat` tip (today `6e8388eef944a0fe95f1218502cac49681a60dd2`; re-read at sync time).
2. Source = the accepted hardening (or policy-expansion) commit on `main`.
3. Copy every path then in the owner-approved allowlist. Exact blob match. Changed dest paths ⊆ allowlist.
4. Run `authorize_from_trusted_ref` with `trusted_ref=origin/main` using the **main** validator blob, not the PR-head of the sync PR.
5. Dest-tree must independently pass postmerge-isolation, AD-23 contracts, and the hardening contract if those files were added.
6. Human OWNER merge only. Never `GITHUB_TOKEN`. Never `git push --ff-only origin/main:release/uat`. Never AD-15 / PR-E.
7. Keep `UAT_DEPLOY_GATE_ACTIVE=false`. That merge will start AD-23 Deploy UAT; gate-false must HOLD SSH.

## If the owner chooses not to expand the 21-path set

A 21-path sync of this HEAD is still valid for dest execution of the hardened `load_allowlist` / `authorize_sync` APIs. The fixture skips the extra contract file when absent. Dest will not run the new standalone hardening test until Step 1 happens.

## Explicit non-actions

- No sync PR from this agent now.
- No `release/uat` push.
- No ruleset / Environment / secret / variable change as part of sync.
- Production remains NO-GO.
