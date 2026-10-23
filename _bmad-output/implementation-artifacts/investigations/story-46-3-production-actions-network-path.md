# Investigation: Story 46.3 Production Actions network path

Date (Asia/Singapore): 2026-10-23 22:10 +08  
Main SHA: `a7c5f88b1bc407e01fa6a05efb2770421a8e406f`  
Story: 46.3 remains `review`  
Owner Gate A: PASS — OWNER CONFIGURED  
Owner Gate B: BLOCKED — NETWORK PATH UNRESOLVED  
Production: NO-GO / NOT YET COMPLETE  
Workflow dispatched: NO  
Implementation in this pass: NO

This is architecture / threat-model only. It does not authorize overlay install, secret population, key generation, Production SSH, or `Deploy Production`.

## Problem

The merged Story 46.3 control plane assumes:

```text
GitHub-hosted ubuntu-latest
  → appleboy/ssh-action
  → public TCP 22
  → 159.223.55.242
```

Story 46.2 requires TCP 22 to stay source-restricted to approved administration CIDRs. Never `0.0.0.0/0`. Never `::/0`. Never a regional shared cloud range.

Standard GitHub-hosted runners do not have a stable per-repository source IP. GitHub publishes shared Azure ranges via `GET /meta` (`actions`) and updates them weekly. GitHub’s own runner docs say those ranges should not be used as allowlists for internal resources.

Therefore Gate B must not mint a Production Actions SSH key or populate `PROD_*` until a deterministic, dedicated network path exists. Opening port 22 to the public internet, or silently adding the shared hosted-runner CIDR set, would reopen Story 46.2.

`OWNER_GATE_B_PRECONDITION=resolve_production_actions_network_path`  
`OWNER_GATE_B_PRECONDITION=verify_repository_secret_name_conflicts`

## Current facts (repository evidence)

| Fact | Evidence |
| --- | --- |
| Current runner | `runs-on: ubuntu-latest` on `require-main`, `validate-sha`, `deploy`, `rollback` |
| Current SSH target | workflow literal `host: 159.223.55.242` plus `PROD_DROPLET_HOST` must equal that IPv4 |
| Current mutating jobs | `environment: production` + `appleboy/ssh-action` |
| Cloud firewall | `cohestra-production` on droplet `610830617` only. 22/tcp from `owner_ssh_cidrs` + recorded provisioner `/32`s. 80/443 public. 5432/6379/3000/8080 closed |
| Host UFW | 22 source-restricted to the same administration CIDRs; harden refuses world-open sources |
| Owner workstation | `116.86.142.14/32` owner-reported SSH as `root` |
| Cursor / Cloud Agent SSH | timed out; egress NAT not allowlisted; must stay unused |
| UAT | separate droplet `129.212.235.2`; must stay independent |
| `Deploy Production` | never dispatched |
| `deploy` Unix account | **not proven** by 46.2 evidence (`whoami=root`). `validate-production-target.sh` refuses `PROD_DROPLET_USER=root` |

`PRODUCTION_DEPLOY_USER=UNPROVEN`

46.2 already named the durable administration direction: owner-controlled VPN / WireGuard / Tailscale, or a dedicated jump host with a reserved IPv4, plus DigitalOcean Recovery Console as break-glass. That path was not implemented in 46.2.

## Decision criteria

1. Production SSH is never world-open.  
2. GitHub workflow has deterministic connectivity.  
3. Access is dedicated to Cohestra Production.  
4. UAT remains isolated.  
5. Owner workstation key is never reused.  
6. Cursor key is never reused.  
7. GitHub Environment `production` approval remains mandatory.  
8. Compromise of another GitHub customer runner must not grant Production reachability.  
9. Network credentials can be rotated.  
10. Practical for a personal-account public repository (`fad16papa/Cohestra`).  
11. No Production workload is deployed as part of the correction.  
12. Minimal cost unless the owner approves paid infrastructure.

## Option A — secure overlay (Tailscale / WireGuard)

Desired shape:

- Production host makes/maintains **outbound** overlay connectivity.
- GitHub Actions obtains **short-lived**, tagged, Production-only overlay membership for the Environment job.
- Public TCP 22 stay owner/admin CIDRs only.
- Runner reaches Production only through the overlay management plane.
- Overlay credentials are dedicated to Production and rotatable.
- Environment `production` approval still gates the mutating jobs.
- UAT is not on the same ACL path.

### Tailscale (preferred A variant)

Practical for a personal account. Personal Tailscale is sufficient for a single Production node plus ephemeral Actions nodes. Cost: $0 unless the owner later wants paid features.

Host: install Tailscale; outbound UDP/HTTPS to Tailscale only. Do not add inbound 22 sources.

Actions: after Environment approval, join an **ephemeral tagged** node (`ephemeral=true`, tagged, not the owner’s personal device). SSH to the Production Tailscale address as `deploy`, not `root`. Disconnect at job end.

ACL sketch (not implemented here): only `tag:gha-production` may open TCP 22 to `tag:cohestra-production`. No UAT tag. No exit node. No subnet route to the UAT VPC. No `autogroup:member` SSH to Production.

Threats: stolen overlay auth key; overly broad ACL; using the owner laptop as a hop; mixing UAT and Production on one wide-open tailnet. Mitigations: ephemeral tagged keys, tight ACLs, rotate keys, separate tags, no shared UAT node.

### WireGuard (A fallback)

Same security properties if the owner refuses Tailscale SaaS. Harder on GitHub-hosted runners: each job must bring a unique peer config; key distribution becomes another secret; NAT traversal is DIY. A public WireGuard UDP listen on Production is a new attack surface, still better than world-open 22, worse than outbound-only Tailscale. Use only if the owner rejects Tailscale.

**Option A verdict:** ACCEPT as the default. Does not weaken 46.2. Deterministic. Dedicated. Rotatable. Cheap.

## Option B — dedicated management / jump host

Shape: Actions → stable hardened jump → Production private/admin path.

A jump host with a reserved IPv4 does **not** by itself give GitHub-hosted runners a stable source IP. The jump’s TCP 22 would then need either:

- the same shared hosted-runner CIDR allowlist (Option E), or
- an overlay on the jump (Option A with extra cost).

A jump that only the owner uses is useful as break-glass. It is not a complete Actions path unless paired with overlay or paid static-IP runners.

Cost: extra DigitalOcean droplet (not free). Privilege and blast radius increase.

**Option B verdict:** REJECT as a standalone Actions solution. Optional later admin accessory. Do not purchase in this pass.

## Option C — self-hosted runner

A general-purpose self-hosted runner **on the Production droplet** is unacceptable:

- any workflow that can target the runner label can execute on the Production host
- persistence between jobs
- secret and overlay exposure
- untrusted PR / `pull_request_target` risk
- privilege escalation and lateral movement into later workloads

A dedicated isolated ephemeral runner VM, repo-locked, unique labels, no fork PRs, destroyed after each job, could work. It is extra paid infrastructure and a high-value runner token. Personal accounts can register self-hosted runners; that availability does not make on-droplet runners safe.

**Option C verdict:** REJECT on-droplet and persistent shared runners. Isolated ephemeral runners are a paid fallback only if overlay is impossible.

## Option D — GitHub larger runner / static IP

Larger runners are for organizations/enterprises on **GitHub Team** or **GitHub Enterprise Cloud**. Static IP ranges for larger runners additionally require **GitHub Enterprise Cloud**.

This repository is a personal-account public repo. No GitHub organization is in use. Option D is **not available** without an owner-approved plan and org migration. Do not purchase or migrate in this pass.

Even with static IPs, GitHub warns that forks can run code on those runners; this repo is public. Overlay still has a cleaner trust story for a personal account.

**Option D verdict:** UNAVAILABLE without paid org/plan change. Owner approval required before any purchase. Not selected.

## Option E — allowlist standard GitHub-hosted runner ranges

Disfavored.

- Shared Azure ranges used by every GitHub customer
- Weekly rotation; stale allowlists fail closed or fail open
- Another customer’s runner can reach TCP 22 if they also obtain the Actions key
- GitHub: “we do not recommend that you use these as allowlists for your internal resources”
- Directly contradicts Story 46.2 “never a regional AWS/Azure range”
- Highest blast radius for the least dedicated identity

**Option E verdict:** REJECT. Do not implement because it is easy.

## Recommendation

**Recommended network path: Option A — Tailscale overlay (WireGuard only if Tailscale is owner-rejected).**

Rationale: it is the only option that is simultaneously dedicated, deterministic, cheap, available on this personal account, compatible with the 46.2 firewall, and already named in Production host documentation.

Cost impact: $0 expected (Tailscale personal + existing droplet). No extra droplet. No GitHub plan change.

Owner action required (later authorized implementation, not this pass):

1. Accept Option A (or explicitly reject Tailscale and choose WireGuard).
2. Create a Production-only Tailscale tailnet/ACL (or equivalent WireGuard design).
3. Join the Production host as `tag:cohestra-production` (outbound only).
4. Mint an ephemeral tagged Actions auth key. Do not reuse owner, UAT, or Cursor credentials.
5. Authorize a later implementation PR to change the workflow SSH path to the overlay **without** opening public 22.
6. Only then proceed to Gate B key minting and `PROD_*` population.

## SSH user precondition

46.2 proved owner SSH as `root`. The 46.3 contract requires `PROD_DROPLET_USER=deploy` and refuses `root`.

`PRODUCTION_DEPLOY_USER=UNPROVEN`  
`DEPLOY_USER_CREATION_REQUIRED=YES` (later bootstrap, not this pass)

Later Gate B / host bootstrap must:

- create or verify `deploy`
- restrict SSH to key-only
- install only the dedicated Production Actions public key
- ensure `/home/deploy/cohestra-production` ownership
- no password login
- no unnecessary sudo/root
- never install the owner workstation key, UAT key, or a Cursor key as the Actions key

## Gate B expected values (do not create)

| Name | Kind | Expected contract | Created this pass |
| --- | --- | --- | --- |
| `PROD_DROPLET_HOST` | secret | `159.223.55.242` (inventory identity) | NO |
| `PROD_DROPLET_USER` | secret | `deploy` | NO |
| `PROD_DROPLET_SSH_KEY` | secret | dedicated Actions key — **not created** | NO |
| `PROD_DROPLET_DEPLOY_PATH` | secret | `/home/deploy/cohestra-production` | NO |
| `PROD_PUBLIC_BASE_URL` | secret | `http://159.223.55.242` (pre-cutover; not `cohestra.app`) | NO |
| `PROD_COMPOSE_PROJECT` | variable | `cohestra-production` | NO |

Later overlay implementation will need an additional Environment secret name, for example `PROD_TAILSCALE_AUTHKEY` (final name in the implementation PR). Do not create it now.

`PROD_DROPLET_HOST` remains the inventory IPv4 even if SSH travels over overlay. `appleboy` `host:` is currently hardcoded to `159.223.55.242`; an implementation PR must split inventory allowlist from overlay SSH destination. `validate-production-target.sh` today refuses any host other than that IPv4 and forbids hostname substitution — that is correct for inventory identity and must be extended, not deleted, when overlay lands.

## Required later changes (not in this pass)

Firewall: **no** new public 22 sources. **no** hosted-runner CIDRs. **no** `0.0.0.0/0`.

UFW: **no** 22 expansion. Overlay uses host outbound connectivity already permitted.

Workflow (later authorized implementation only):

- keep `workflow_dispatch`, Environment `production`, provenance, fail-closed secrets
- join overlay only on `deploy` / `rollback` after Environment approval
- SSH as `deploy` over overlay
- do not move `validate-sha` onto the overlay
- do not dispatch as a connectivity test

UAT: no change to `.github/workflows/deploy.yml` or Environment `uat`.

## Security review (Grok 4.6)

| Attack | Result |
| --- | --- |
| Runner IP changes after firewall config | Current design fails. Overlay removes public-22 dependency. |
| Shared GitHub runner IP reused by attacker | Option E would allow reachability. REJECT E. Overlay + stolen key still needs overlay ACL. |
| World-open 22 | Forbidden. Not selected. |
| Huge shared CIDR allowlist | Forbidden. GitHub-disrecommended. REJECT E. |
| Stale allowlists | Option E weekly drift. Overlay keys rotate without touching 22. |
| Owner key reuse | Forbidden. Later Actions key must be new. |
| UAT key reuse | Forbidden. `DROPLET_*` / `cohestra-uat-gha` stay UAT. |
| Cursor key reuse | Forbidden. Cloud Agent must not be the Production SSH client. |
| Self-hosted runner persistence | On-droplet / persistent runners REJECT. |
| Untrusted PR on self-hosted runner | Public repo risk. Another reason to reject C as default. |
| Direct root SSH from Actions | Contract already refuses `root`. Deploy user unproven; create later. |
| Overlay credential theft | Ephemeral tagged key, Environment-scoped, rotate, no exit node. |
| Overlay lateral movement | ACL: Actions tag → Production tag:22 only. No UAT. |
| Jump-host compromise | Extra standing host. Not selected as the Actions path. |
| Environment approval bypass | Overlay join stays on Environment jobs only. `validate-sha` stays off Environment and off SSH. |
| Accidental Production dispatch | Still `workflow_dispatch` only. This pass does not dispatch. |

BLOCKERS: 0 against this planning artifact. The connectivity gap **blocks Gate B**, not this investigation.  
MAJORS: 0. Remaining Gate B precondition: repository `PROD_*` name conflicts remain unverified by the bot.

Do not retain “bot cannot inspect Settings” as a configuration BLOCKER. Do retain “hosted runner cannot traverse the 46.2 SSH allowlist” as the Gate B block.

## Hard stop

Do not implement overlay, populate `PROD_*`, mint keys, dispatch Production, SSH Production, write the ledger, deploy workloads, mutate the database, change DNS, enable live Paddle, or start Story 46.4 from this investigation.
