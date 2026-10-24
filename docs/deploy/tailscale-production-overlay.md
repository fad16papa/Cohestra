# Production Tailscale overlay (Story 46.3)

`CODE PATH IMPLEMENTED = YES`  
`LIVE OVERLAY BOOTSTRAPPED = PARTIAL`  
`LIVE_TAILSCALE = YES`  
`LIVE_TAILSCALE_HOST = 100.90.12.72`  
`LIVE_DEPLOY_USER = YES`  
`LIVE_CHECKOUT = YES`  
`LIVE_CHECKOUT_SHA = OWNER_RERUN_REPORTED_UNVERIFIED`  
`PRODUCTION_ACTIONS_SSH_KEY = CREATED_AND_CONFIGURED`  
`GATE_B_VALUES = CONFIGURED`  
`DOCKER_RUNTIME = OWNER_REPORTED_PARTIAL`  
`DOCKER_ENGINE_REPORTED = 29.9.2`  
`DOCKER_COMPOSE_REPORTED = v5.6.1`  
`COMPOSE_CONFIG = OWNER_REPORTED_PASS`  
`RESULT_PASS = NOT_VISIBLE`  
`GATE_B_VALIDATION = NOT_DISPATCHED`

This document is the owner runbook for the accepted Production network path:

```text
GitHub-hosted runner
  → GitHub OIDC
  → Tailscale workload identity federation
  → ephemeral tag:gha-production node
  → Tailscale overlay
  → tag:cohestra-production
  → standard OpenSSH
  → Unix user deploy
```

Public TCP 22 stays owner/admin CIDR restricted. Do not open `0.0.0.0/0:22` or `::/0:22`. Do not allowlist shared GitHub-hosted runner CIDRs.

## Identity split

| Identity | Variable | Allowed value |
| --- | --- | --- |
| Inventory | `PROD_DROPLET_HOST` | `159.223.55.242` only |
| Transport | `PROD_TAILSCALE_HOST` | live Tailscale IPv4 `100.90.12.72` |

`PROD_DROPLET_HOST` must never become the SSH destination. `PROD_TAILSCALE_HOST` must never replace the inventory host.

Environment `production` secrets and overlay variables are owner-configured. Do not dispatch Deploy Production or Gate B validation until Docker Engine / Compose is installed via owner-run `deploy/bootstrap-production-docker.sh`.

## Auth model

Primary: GitHub Actions OIDC → Tailscale federated identity.

Required later Environment `production` **variables** (not reusable secrets):

- `PROD_TAILSCALE_CLIENT_ID`
- `PROD_TAILSCALE_AUDIENCE`
- `PROD_TAILSCALE_HOST`

Not selected:

- reusable `PROD_TAILSCALE_AUTHKEY`
- OAuth client secret
- Tailscale SSH
- exit nodes
- subnet routes

Runner tag: `tag:gha-production`.  
Host tag: `tag:cohestra-production`.

Job-level `id-token: write` is granted only to `deploy` and `rollback`. `require-main` and `validate-sha` must not request OIDC tokens.

Pinned action:

`tailscale/github-action@99a8333667fff04fdd6cffb46dfd409f8329a7bf` (`v4` / `v4.3.0`)

## Owner bootstrap order

Cursor must not execute these against Production.

1. On the Production droplet, as root, review and run `deploy/bootstrap-production-tailscale.sh`.
2. From an approved owner session, join the persistent host:
   `sudo tailscale up --advertise-tags=tag:cohestra-production --accept-routes=false --advertise-exit-node=false --ssh=false`
3. Apply the Grants template in `tailscale-production-grants.template.json`. Replace `OWNER_TAILSCALE_PRINCIPAL_PLACEHOLDER` with the owner's real Tailscale principal. Do not invent an email here.
4. Create the federated identity **after** dispatching `Inspect Production OIDC` and reading the sanitized `sub` / `iss` / `aud` / `environment` claims. Do not dispatch that workflow in this pass.
5. Run `deploy/bootstrap-production-deploy-user.sh` on the host. It prepares `deploy` and `/home/deploy/cohestra-production` without installing a key. Owner-completed: Unix user `deploy` exists; password locked; no passwordless sudo; no Actions public key.
6. Run `deploy/bootstrap-production-checkout.sh` as root with `PRODUCTION_BOOTSTRAP_SHA=<40 hex>`. This clones or validates `https://github.com/fad16papa/Cohestra.git` at `/home/deploy/cohestra-production` as `deploy` over unauthenticated HTTPS. It does not compose-up. **Owner-completed at `21e835604884a922f3a51d3b0d6039657affed15`.**
7. Gate B minted a **new** Actions SSH key for `deploy`. Do not reuse the owner workstation key or UAT `cohestra-uat-gha`. **Owner-completed.** Private key lives only in Environment `production`.
8. The repository is currently public. Do not create a host→GitHub credential unless it later becomes private. That credential must stay separate from the Actions SSH key.
9. Run `deploy/bootstrap-production-docker.sh` as root on `cohestra-production`. Official Docker Engine apt repository only. Do not add `deploy` to group `docker`. Do not compose-up. **Not yet run.** Host preflight: `docker` is not installed. Gate B validation must wait.

## Grants (modern Tailscale Grants, not legacy ACLs)

Effective relationship:

```text
tag:gha-production → tag:cohestra-production → tcp:22 only
```

No grant from `tag:gha-production` to UAT, owner devices, PostgreSQL, Redis, ports 80/443, Docker application ports, exit nodes, or subnet routers. No wildcard `ip`.

`tagOwners` must name the owner principal. This repository does not invent that identity.

## Diagnostic workflow

`.github/workflows/inspect-production-oidc.yml` is `workflow_dispatch` only, Environment `production`, no SSH, no Tailscale, no repository write. It decodes the GitHub OIDC payload locally and prints identity claims. It must never print the raw JWT, signature, or `ACTIONS_ID_TOKEN_REQUEST_TOKEN`.

Do not run it until the owner authorizes that inspection.

## Status after the code-side PR

| Gate | State |
| --- | --- |
| Owner Gate A | PASS |
| Network architecture | ACCEPTED |
| Code implementation | IMPLEMENTED / NOT LIVE |
| Production host Tailscale | INSTALLED / JOINED (`tag:cohestra-production`) |
| Production Tailscale IPv4 | `100.90.12.72` |
| OIDC subject | NOT YET OBSERVED |
| Federated identity | NOT CREATED |
| deploy user | LIVE |
| Production checkout | LIVE (`21e835604884a922f3a51d3b0d6039657affed15`) |
| Production Actions SSH key | CREATED_AND_CONFIGURED |
| Gate B values | CONFIGURED |
| Docker runtime | NOT_YET_INSTALLED |
| Gate B validation | NOT_DISPATCHED |
| Owner Gate B | BLOCKED — Docker Engine / Compose prerequisite not installed |
| Production | NO-GO |
