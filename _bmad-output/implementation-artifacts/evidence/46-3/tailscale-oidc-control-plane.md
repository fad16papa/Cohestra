# Story 46.3 Tailscale OIDC control plane (sanitized)

Date: 2026-10-23 (Asia/Singapore)
Baseline main: `784a6c902592446443accaec9c634001b6b0fb48`
Production: NO-GO / NOT YET COMPLETE

`CODE PATH IMPLEMENTED != LIVE OVERLAY BOOTSTRAPPED`

## What this pass did

- Added dormant GitHub Actions → OIDC → Tailscale → overlay SSH control plane.
- Did **not** SSH Production.
- Did **not** install Tailscale on Production.
- Did **not** join a Tailscale node.
- Did **not** mutate the Tailscale admin console.
- Did **not** create a federated identity.
- Did **not** dispatch `Inspect Production OIDC`.
- Did **not** create Unix user `deploy` live.
- Did **not** generate or populate Production SSH keys.
- Did **not** populate Environment secrets or variables.
- Did **not** dispatch `Deploy Production`.
- Did **not** start Story 46.4.

## Contract results (local)

| Check | Result |
| --- | --- |
| validate-production-overlay-target | PASS |
| verify-production-overlay-connectivity | PASS |
| bootstrap-production-overlay | PASS |
| validate-tailscale-production-grants | PASS |
| validate-inspect-production-oidc-workflow | PASS |
| validate-deploy-production-workflow | PASS |
| validate-deploy-uat-workflow | PASS |
| validate-production-target | PASS |
| fail-closed-production-secrets | PASS |

## Allowlisted fields only

- WORKFLOW_ID_TOKEN_GLOBAL=absent
- REQUIRE_MAIN_ID_TOKEN=absent
- VALIDATE_SHA_ID_TOKEN=absent
- DEPLOY_ID_TOKEN=write
- ROLLBACK_ID_TOKEN=write
- TAILSCALE_ACTION_PIN=99a8333667fff04fdd6cffb46dfd409f8329a7bf
- TAILSCALE_AUTH_MODEL=oidc_federation
- TAILSCALE_RUNNER_TAG=tag:gha-production
- PUBLIC_INVENTORY_HOST=159.223.55.242
- OVERLAY_HOST_SOURCE=vars.PROD_TAILSCALE_HOST
- PUBLIC_SSH_FALLBACK=false
- TAILNET_GRANT=tag:gha-production->tag:cohestra-production:tcp:22
- OIDC_INSPECTION_DISPATCHED=false
- REQUEST_TOKEN_LOGGED=false
- RAW_JWT_LOGGED=false
- REQUEST_TOKEN_READ_ALLOWED=true
- PRODUCTION_SSH=false
- GATE_B=BLOCKED

No secret values, private keys, tokens, JWTs, or SSH transcripts are recorded.
