---
label: AD25-OWNER-AUTH
status: HOLD
owner_control_ready: false
as_of: 2026-11-02T19:40:00+08:00
---

# AD-25 owner-authorization verdict (Issue #538)

No autonomous merge. No UAT activation. No Production changes. No GitHub settings modified.

## 1. Exact current SHAs

| Ref | SHA |
| --- | --- |
| `origin/main` | `9ccca77e7297dc28b0a843d3435e9603dc803da7` |
| `origin/release/uat` | `6e8388eef944a0fe95f1218502cac49681a60dd2` |
| PR #541 merge | `6e8388eef944a0fe95f1218502cac49681a60dd2` |
| PR #542 HEAD (Draft) | `ade3c8281e8a2ec82ef45771bc5b68df64901a41` |

## 2. PR #541 merge-actor and authorization

- REST `merged_by.login=cursor[bot]` (`type=Bot`, id `206951365`, App `1210556`)
- GraphQL `mergedBy.login=cursor` `__typename=Bot`
- `ready_for_review` by **fad16papa** at 2026-11-02 09:40:00 SGT; merge at 09:40:09 SGT
- Native reviews: none
- Repo `allow_auto_merge=false` → not GitHub auto-merge
- Enabled by: advertised Cursor `contents: write` + ruleset `26322151` required reviews **0**
- Organizational owner-merge policy: **violated**
- Live GitHub ruleset: **satisfied** (it does not encode owner-only merge)

## 3. Confirmed UAT deployment safety

Deploy UAT `41373679140` on `6e8388ee`: 11/11 AD-17 SUCCESS; predeploy HOLD `UAT_DEPLOY_GATE_ACTIVE is not true`; `ssh_executed=false`; `ssh_attempted=false`; `uat_deployed=false`. Only CI + Deploy UAT ran on that SHA. No Production run. SSH never executed.

## 4. PR #542 technical/security verdict

In-repo fail-closed allowlist **PASS** (CI `41381583654` SUCCESS, native GitGuardian SUCCESS, contract 55 PASS, `independent_authorization: false`). Trusted-ref **is not** owner approval. Draft **HOLD**. Do not merge.

## 5. Owner-policy enforcement design

External GitHub App `cohestra-owner-policy`, check `AD25-Owner-Policy`, permissions: contents/PR read, checks+statuses write, nothing else. Pin `integration_id` on rulesets for `main` and `release/uat`. No required workflow (still 15368). No control-plane auto-merge. No deployments/secrets. App-bundled code only. Residual user-token risk is explicit. **Do not install in this task.**

## 6. Current unauthorized-merge exposure

Still live: 0 required reviews on `release/uat`; no ruleset on `main`; Cursor advertised `contents: write`; #542 Draft is a soft hold. Same #541 path remains open.

## 7. Owner-only GitHub setup checklist

`ad25-owner-setup-checklist.md` phases 0–5. Agent must not execute them.

## 8. Approval checkpoints and abort criteria

Checkpoints and aborts: `ad25-owner-policy-app-design.md`. Any abort → HOLD. Sync before pinned Layer B → HOLD.

## 9. Final verdict

**HOLD.** `OWNER_CONTROL_READY=false`.

Keep `UAT_DEPLOY_GATE_ACTIVE=false`, `UAT_MAIN_DEPLOY_SUPPRESSED=true`, Production NO-GO.
