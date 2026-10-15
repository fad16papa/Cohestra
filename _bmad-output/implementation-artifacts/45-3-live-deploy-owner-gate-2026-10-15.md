---
story: 45.3
status: bootstrap-resolved
previous_blocked_runs:
  - 38746166030
  - 38747094593
owner_bootstrap: 2026-10-15
---

# 45.3 live Deploy UAT — owner gate resolved

## Historical gate (do not treat as current)

Runs `38746166030` (SHA `0f2f5d66`) and `38747094593` (SHA `94c98c11`) fail-closed **before SSH**:

```
OWNER_GATE=missing_protected_secret
ENVIRONMENT=uat
MISSING_SECRET=DROPLET_HOST
MISSING_SECRET=DROPLET_USER
MISSING_SECRET=DROPLET_SSH_KEY
```

Those logs printed names only. No secret values. No key material.

## Owner confirmation 2026-10-15

GitHub Environment `uat` deployment secrets are configured.
The dedicated GitHub Actions deploy public key is authorized on the droplet.

`workflow_dispatch` / `gh run rerun` are **403** for the Cursor GitHub App token (`Resource not accessible by integration`).

This docs merge is therefore the autonomous trigger:

```
merge to main
  → CI
  → Deploy UAT workflow_run
  → TARGET_SHA = this merge's accepted main SHA
```

Do not ask the owner to click **Run workflow**. Do not SSH.

## After this merge

Record the first autonomous Deploy UAT run id, `TARGET_SHA`, `EXPECTED_SHA` / `DEPLOYED_SHA`, and artifact results in a follow-up closeout. Production remains NO-GO.
