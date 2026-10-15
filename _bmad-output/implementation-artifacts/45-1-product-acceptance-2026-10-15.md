# Product acceptance — Story 45.1

HEAD: `354ad30e9b16228ac1710413eaaa6b25a330cd12`
CI: green (6/6)
Review: BLOCKER=0 MAJOR=0 on this exact HEAD

| AC | Evidence | Result |
| --- | --- | --- |
| `deploy-uat` + Environment `uat` | `validate-deploy-uat-workflow.sh` in CI | pass |
| Fail-closed names only | `fail-closed-uat-secrets.test.sh` in CI | pass |
| `remote-deploy.sh` + no script-interpolated path | workflow contract | pass |
| Accepted SHA is what the droplet resets to | `reset-accepted-sha.test.sh` + workflow `DEPLOY_SHA` | pass |
| No Cursor SSH; production NO-GO | docs + no production job | pass |

Live UAT apply waits on one-time Environment `uat` `DROPLET_*` names. That is an owner bootstrap gate, not a 45.1 code miss.

Status: **45.1 DONE** on HEAD `354ad30e`.
