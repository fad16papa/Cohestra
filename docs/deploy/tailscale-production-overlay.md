# Production Tailscale overlay (Story 46.3)

`CODE PATH IMPLEMENTED != LIVE OVERLAY BOOTSTRAPPED`

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
| Transport | `PROD_TAILSCALE_HOST` | later exact Tailscale IPv4 in `100.64.0.0/10` |

`PROD_DROPLET_HOST` must never become the SSH destination. `PROD_TAILSCALE_HOST` must never replace the inventory host.

Do not populate Environment variables or secrets in this implementation pass.

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
5. Run `deploy/bootstrap-production-deploy-user.sh` on the host. It prepares `deploy` and `/home/deploy/cohestra-production` without installing a key.
6. Later Gate B mints a **new** Actions SSH key for `deploy`. Do not reuse the owner workstation key or UAT `cohestra-uat-gha`.
7. If the host needs `git fetch origin main` against a private repository, mint a **separate** read-only GitHub credential. Do not reuse the Actions SSH key. Those are opposite trust directions.

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
| Production host Tailscale | NOT INSTALLED |
| Production Tailscale node | NOT JOINED |
| OIDC subject | NOT YET OBSERVED |
| Federated identity | NOT CREATED |
| deploy user | NOT YET LIVE VERIFIED |
| Owner Gate B | BLOCKED |
| Production | NO-GO |
