---
story: 45.3
status: owner-gate
reviewed_main: 0f2f5d66c4c431542009e82752cbe0a62cf1e0d0
deploy_run: 38746166030
---

# 45.3 live Deploy UAT — owner gate

Post-merge main CI `38745574006` succeeded on `0f2f5d66`.

Deploy UAT `workflow_run` `38746166030` then ran against that SHA.

## Proven on this run

- `Refuse unpinned TARGET_SHA` succeeded
- Job env `TARGET_SHA=0f2f5d66c4c431542009e82752cbe0a62cf1e0d0` (the accepted main SHA)
- Fail-closed secret check ran before SSH
- SSH, fetch, and public smoke were skipped
- Log printed names only (no secret values, no key material)

## Owner gate

```
OWNER_GATE=missing_protected_secret
ENVIRONMENT=uat
MISSING_SECRET=DROPLET_HOST
MISSING_SECRET=DROPLET_USER
MISSING_SECRET=DROPLET_SSH_KEY
```

Populate those **names** on GitHub Environment `uat`. Do not paste values into chat, git, or screenshots. Do not SSH.

Optional later name (not required for this gate): `DROPLET_DEPLOY_PATH`.

45.1/45.2/45.3 **repo-side** code is on `main`. Live deploy, host probe, and public smoke stay blocked until the three required names exist. Production remains NO-GO.
