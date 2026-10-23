# Story 46.3 Actions network-path evidence (sanitized)

Date (Asia/Singapore): 2026-10-23 22:30 +08
Main SHA: `a7c5f88b1bc407e01fa6a05efb2770421a8e406f`

Canonical investigation:

`_bmad-output/implementation-artifacts/investigations/story-46-3-production-actions-network-path.md`

`OWNER_GATE_A=PASS — OWNER CONFIGURED`  
`AUTOMATED_SETTINGS_VERIFICATION=UNAVAILABLE_DUE_TO_GITHUB_APP_PERMISSIONS`  
`NETWORK_ARCHITECTURE=OPTION A ACCEPTED — TAILSCALE + OIDC FEDERATION`  
`PRIMARY_TAILSCALE_AUTH=GitHub Actions OIDC workload identity federation`  
`AUTH_KEY_STATUS=FALLBACK ONLY — NOT SELECTED`  
`OWNER_GATE_B=BLOCKED — OVERLAY NOT IMPLEMENTED`  
`OWNER_GATE_B_PRECONDITION=implement_tailscale_oidc_overlay`  
`OWNER_GATE_B_PRECONDITION=verify_repository_secret_name_conflicts`

OIDC issuer: `https://token.actions.githubusercontent.com`  
OIDC subject: **unverified** — expected legacy candidate `repo:fad16papa/Cohestra:environment:production` (repo created 2026-07-13; do not treat as authoritative)  
OIDC environment: `production`  
OIDC ref: `refs/heads/main`  
Runner tag: `tag:gha-production`  
Host tag: `tag:cohestra-production`  
Tailnet ACL: `tag:gha-production` → `tag:cohestra-production:22`  
SSH model: standard SSH over Tailscale (not Tailscale SSH)  
`PUBLIC_SSH_FIREWALL_CHANGE=NONE`  
`TAILSCALE_HOST_FIREWALL_INTEGRATION=VERIFY_DURING_BOOTSTRAP`

`PRODUCTION_DEPLOY_USER=UNPROVEN`  
`GATE_B_VALUES_CREATED=NO`  
`LONG_LIVED_TAILSCALE_SECRET=NO`  
`DEPLOY_PRODUCTION_RUN_CREATED=NO`

No secret values, private keys, or tokens are recorded.
