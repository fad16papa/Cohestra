---
label: AD25-OWNER-AUTH
status: cat-sec
head: cursor/ad25-owner-policy-plan-c2e5
as_of: 2026-11-02T21:10:00+08:00
---

# CAT-SEC + BMAD review — owner-policy implementation plan

Layers: CAT-SEC attack questions, Blind Hunter, local prototype tests. No GitHub settings changed.

## Pass 1 (pre-fix)

| ID | Source | Title | Severity | Action |
| --- | --- | --- | --- | --- |
| 1 | cat-sec | `src/`/`web/` classified as always-forbidden froze product PRs | BLOCKER | patch: feature PRs with only application paths succeed; mixed with control-plane fails |
| 2 | cat-sec | `dest_is_descendant` boolean was caller-asserted | BLOCKER | patch: require `merge_base_sha == dest_parent_sha`; host must compute merge-base from GitHub |
| 3 | cat-sec | spoof_integration_id tests are not a GitHub pin | MAJOR | patch: docs state they are collision guards; live F must prove T7 |
| 4 | cat-sec | rollout D could replace the check array; strict unset | MAJOR | patch: append-only PATCH, strict true, bypass empty |
| 5 | cat-sec | HMAC comment-only closed; valid MAC from user token is residual | — | keep; T2/T12 explicit |
| 6 | cat-sec | App private-key theft and ruleset unpin omitted | MAJOR | patch: T13/T14 in threat model; READY not durable |
| 7 | blind | HMAC unbound to repo/PR | dismiss | canonical message already included repo+pr; now also base |
| 8 | blind | installer cannot downgrade is false because uninstall exists | dismiss | mechanics doc already lists restrict/suspend/uninstall; default path keeps Cloud Agents |

## Pass 2 (this HEAD)

Prototype: `python3 tests/test_negatives.py` → **27 OK**.

Remaining (accepted, not BLOCKER for a **plan**):

- Host `webhook.py` is not implemented (deferred; prototype is the evaluator).
- dest_sync blob maps are still host-populated; the spine now requires main-tree vs PR-tree. Live F must use unequal fixtures.
- T2/T4/T12/T13/T14 remain residuals.
- GitHub pin is not installed.

Design BLOCKER=0, MAJOR=0 after honesty patches. Residual risks are listed, not hidden.

## HMAC

Stops comment-only user-token attestation and replay across PR/base/SHA. Does not stop a valid MAC posted as fad16papa (paste/leak). Does not prove human presence.

## Verdict

**HOLD.** `OWNER_CONTROL_READY=false`.

After owner-executed A–F, stamp a **probe receipt** (T1/T7 closed at SHA/etag), not a durable ready flag.

Do not merge #542/#543. Do not install the App. Do not change Cursor. Do not PATCH rulesets from this agent.
