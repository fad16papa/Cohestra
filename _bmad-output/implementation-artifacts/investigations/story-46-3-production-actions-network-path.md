# Investigation: Story 46.3 Production Actions network path

Date (Asia/Singapore): 2026-10-23 22:30 +08  
Main SHA: `a7c5f88b1bc407e01fa6a05efb2770421a8e406f`  
Story: 46.3 remains `review`  
Owner Gate A: PASS — OWNER CONFIGURED  
Owner Gate B: BLOCKED — OVERLAY NOT IMPLEMENTED  
Network architecture: OPTION A ACCEPTED — TAILSCALE + OIDC FEDERATION  
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

`OWNER_GATE_B_PRECONDITION=implement_tailscale_oidc_overlay`  
`OWNER_GATE_B_PRECONDITION=verify_repository_secret_name_conflicts`

Owner decision (2026-10-23): **Option A accepted**. Primary join method is **GitHub Actions OIDC → Tailscale workload identity federation**. A reusable Tailscale auth key is **not** the selected design.

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

## Option A — Tailscale overlay with GitHub OIDC federation (ACCEPTED)

Desired shape:

- Production host makes/maintains **outbound** overlay connectivity.
- GitHub-hosted runner obtains a **short-lived GitHub OIDC** identity token.
- Tailscale validates that identity against a narrowly scoped **federated identity**.
- The runner joins the tailnet as an **ephemeral** `tag:gha-production` node and is removed after the job.
- Public TCP 22 stay owner/admin CIDRs only.
- Standard SSH over Tailscale provides reachability; host auth remains the dedicated Production Actions Ed25519 key.
- Environment `production` approval still gates the mutating jobs.
- UAT is not on the same ACL path.

### Primary authentication (REQUIRED DEFAULT)

`PRIMARY_TAILSCALE_AUTH=GitHub Actions OIDC → Tailscale workload identity federation`

`AUTH_KEY_STATUS=FALLBACK ONLY — NOT SELECTED`

No reusable `PROD_TAILSCALE_AUTHKEY` in the preferred design. Do not mint a standing Actions auth key.

Fallback order (each step needs a separate security review and owner authorization):

1. Workload identity federation — **required default**
2. OAuth client — only if federation is proven unavailable
3. Reusable auth key — last-resort only

Do **not** introduce a Tailscale client secret for the preferred path.

### Federated identity (plan only — do not create now)

| Field | Planned value |
| --- | --- |
| Issuer | `https://token.actions.githubusercontent.com` |
| Tailscale scope | `auth_keys` |
| Runner tag | `tag:gha-production` |
| Production host tag | `tag:cohestra-production` |
| Repository | `fad16papa/Cohestra` |
| Environment | `production` |
| Ref | `refs/heads/main` |
| Runner environment | GitHub-hosted |
| Config identifiers | `PROD_TAILSCALE_CLIENT_ID`, `PROD_TAILSCALE_AUDIENCE` |

`PROD_TAILSCALE_CLIENT_ID` and `PROD_TAILSCALE_AUDIENCE` are configuration identifiers, not reusable credentials. Store them later as Environment `production` variables or secrets per repository convention. Do not create them in this pass.

The federated identity must authorize **only** the intended Cohestra Production workload. It must not grant other repositories, UAT, arbitrary Actions jobs, personal tailnet devices, exit nodes, or subnet routes.

### GitHub OIDC subject (do not hardcode)

Repository created `2026-07-13`. GitHub’s immutable default OIDC subject applies automatically only to repositories created **after 2026-07-15**. Cohestra may still use the older Environment-based subject unless immutable/custom subjects were enabled later.

Expected **legacy candidate** (not authoritative until bootstrap verifies the live subject):

`repo:fad16papa/Cohestra:environment:production`

If immutable subject claims are enabled, use the actual ID-bound subject. Fail closed on mismatch.

Later implementation must also validate, where Tailscale federation supports it:

- issuer `https://token.actions.githubusercontent.com`
- repository `fad16papa/Cohestra`
- environment `production`
- ref `refs/heads/main`
- GitHub-hosted runner
- exact verified subject
- exact Tailscale federated-identity audience

Do not authorize feature-branch, PR, UAT, or unrelated workflow identity.

### Workflow permissions (later implementation)

Add `id-token: write` **only** on `deploy` and `rollback` (both already `environment: production`).

Do **not** grant `id-token: write` to `require-main`, `validate-sha`, CI, UAT, or workflow-global permissions unless a later review proves it unavoidable.

Preferred Environment-job permissions:

```yaml
permissions:
  contents: read
  actions: read
  checks: read
  pull-requests: read
  id-token: write
```

`id-token: write` requests an OIDC token. It is not repository write. Still forbid `contents: write`, `actions: write`, `checks: write`, `pull-requests: write`.

Later implementation may use `tailscale/github-action` **pinned to a reviewed commit SHA**. Do not use a floating `@v4` tag. Resolve the SHA in the implementation pass.

### Tailnet ACL

Required effective rule only:

`tag:gha-production` → `tag:cohestra-production:22`

Actions must not reach UAT, PostgreSQL, Redis, Docker ports, the owner workstation, arbitrary tailnet nodes, subnet routes, or exit nodes. The Production node must not be an exit node, UAT subnet router, or general gateway. The GitHub runner must not be an exit node.

### SSH model

**Standard SSH over Tailscale connectivity**, not Tailscale SSH, for Story 46.3.

Preserve future secret `PROD_DROPLET_SSH_KEY`. Do not reuse the owner workstation key, UAT Actions key, Cursor key, or root.

### Identities

- Inventory identity (immutable): `159.223.55.242`
- Transport identity (later): Production Tailscale IPv4 or tightly validated Production-only MagicDNS

Do not replace inventory validation with arbitrary hostname acceptance. Split `production inventory host` from `production SSH transport host`.

### Firewall

`PUBLIC_SSH_FIREWALL_CHANGE=NONE`  
`TAILSCALE_HOST_FIREWALL_INTEGRATION=VERIFY_DURING_BOOTSTRAP`

Do not add shared GitHub/Azure runner ranges. Later bootstrap must prove tailnet TCP 22 works without weakening public TCP 22.

### WireGuard

Owner accepted Tailscale. WireGuard is no longer the selected path. Recorded only as a historical alternative.

**Option A verdict:** ACCEPTED by owner. Primary auth is OIDC federation. Auth keys are fallback only.

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

**Owner-accepted path: Option A — Tailscale overlay with GitHub Actions OIDC federation.**

Rationale: dedicated, deterministic, cheap, available on this personal account, compatible with the 46.2 firewall, and now using short-lived OIDC instead of a reusable overlay secret.

Cost impact: $0 expected (Tailscale personal + existing droplet). No extra droplet. No GitHub plan change.

Owner action required (later authorized implementation, not this pass):

1. Option A is already accepted. Do not reopen B–E.
2. Verify the live GitHub OIDC subject for Environment `production` before configuring Tailscale trust.
3. Create the Tailscale federated identity (issuer, audience, `auth_keys` scope, `tag:gha-production` only).
4. Join the Production host as `tag:cohestra-production` (outbound only; no exit node; no UAT subnet route).
5. Authorize a later implementation PR: job-level `id-token: write` on `deploy`/`rollback` only; pin `tailscale/github-action` to a reviewed SHA; split inventory host from overlay SSH host.
6. Only then create `deploy`, mint the dedicated Actions SSH key, and populate Gate B names.

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

Later overlay implementation will also need Environment configuration identifiers `PROD_TAILSCALE_CLIENT_ID` and `PROD_TAILSCALE_AUDIENCE`. These are not reusable auth credentials. Do **not** create `PROD_TAILSCALE_AUTHKEY` unless federation and OAuth are both proven unavailable and separately authorized (`FALLBACK ONLY — NOT SELECTED`).

`PROD_DROPLET_HOST` remains the inventory IPv4 even if SSH travels over overlay. `appleboy` `host:` is currently hardcoded to `159.223.55.242`; an implementation PR must split inventory allowlist from overlay SSH destination. `validate-production-target.sh` today refuses any host other than that IPv4 and forbids hostname substitution — that is correct for inventory identity and must be extended, not deleted, when overlay lands.

## Required later changes (not in this pass)

Firewall: **no** new public 22 sources. **no** hosted-runner CIDRs. **no** `0.0.0.0/0`.  
`PUBLIC_SSH_FIREWALL_CHANGE=NONE`

UFW: **no** public 22 expansion.  
`TAILSCALE_HOST_FIREWALL_INTEGRATION=VERIFY_DURING_BOOTSTRAP`

Workflow (later authorized implementation only):

- keep `workflow_dispatch`, Environment `production`, provenance, fail-closed secrets
- add `id-token: write` only on `deploy` / `rollback`
- join Tailscale via OIDC federation only on those Environment jobs
- pin `tailscale/github-action` to a reviewed SHA
- SSH as `deploy` over Tailscale with `PROD_DROPLET_SSH_KEY`
- do not move `validate-sha` onto the overlay and do not give it `id-token: write`
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
| Overlay credential theft | Preferred path has no reusable auth key. OIDC token is short-lived. Client ID/audience are not credentials. |
| Another repository obtaining Production tailnet identity | Bind issuer + repository `fad16papa/Cohestra` + Environment `production` + verified subject. |
| PR workflow obtaining Production identity | Do not trust `pull_request` / feature-branch subjects. Bind `refs/heads/main`. |
| UAT obtaining Production identity | Separate Environment `uat`. No UAT tag on the Production ACL. |
| Forged OIDC subject / wrong audience / repo / env / ref | Fail closed. Verify live subject before Tailscale trust is configured. |
| `id-token: write` on `validate-sha` or workflow-global | Forbidden. Job-level on `deploy`/`rollback` only. |
| Long-lived Tailscale credential leakage | Auth key is fallback only and not selected. |
| Broad Tailscale tags / lateral access / MagicDNS | ACL is `tag:gha-production` → `tag:cohestra-production:22` only. No arbitrary hostname accept. |
| Exit-node / subnet-router exposure | Forbidden on host and runner. |
| Actions SSH as root / owner or UAT key reuse | Contract refuses `root`. Dedicated Actions key later. |
| Public TCP 22 expansion | `PUBLIC_SSH_FIREWALL_CHANGE=NONE`. |
| Tailscale/UFW conflict | `TAILSCALE_HOST_FIREWALL_INTEGRATION=VERIFY_DURING_BOOTSTRAP`. |
| Jump-host compromise | Extra standing host. Not selected as the Actions path. |
| Environment approval bypass | Overlay join stays on Environment jobs only. `validate-sha` stays off Environment and off SSH. |
| Accidental Production dispatch | Still `workflow_dispatch` only. This pass does not dispatch. |

BLOCKERS: 0 against this planning artifact. The connectivity gap **blocks Gate B**, not this investigation.  
MAJORS: 0. Remaining Gate B precondition: repository `PROD_*` name conflicts remain unverified by the bot.

Do not retain “bot cannot inspect Settings” as a configuration BLOCKER. Do retain “hosted runner cannot traverse the 46.2 SSH allowlist” as the Gate B block.

## Hard stop

Do not implement overlay, populate `PROD_*`, mint keys, dispatch Production, SSH Production, write the ledger, deploy workloads, mutate the database, change DNS, enable live Paddle, or start Story 46.4 from this investigation.
