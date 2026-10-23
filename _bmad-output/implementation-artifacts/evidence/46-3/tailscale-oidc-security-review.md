# Story 46.3 Tailscale OIDC security review (Grok 4.6)

HEAD under review: implementation PR (this branch)
Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor, deployment-security
Date: 2026-10-23 (Asia/Singapore)

`CODE PATH IMPLEMENTED != LIVE OVERLAY BOOTSTRAPPED`

## Verdict

BLOCKERS = 0  
MAJORS = 0  
Unresolved MINOR: upstream action still injects `--accept-routes` before caller args; mitigated by explicit `--accept-routes=false`, `tailscale set`, and Grants `tcp:22` only.

## Blind Hunter

| Attack | Result |
| --- | --- |
| OIDC permission leaking to `require-main` / `validate-sha` | FAIL closed by workflow contract. Global `id-token: write` is absent. |
| Authkey reintroduced | FAIL closed. `authkey`, `oauth-secret`, and `PROD_TAILSCALE_AUTHKEY` are forbidden. |
| Floating `tailscale/github-action@v4` | FAIL closed. Immutable SHA required. |
| Arbitrary Tailscale host / MagicDNS | FAIL closed. IPv4 CGNAT `100.64.0.0/10` only. |
| Public IP fallback | FAIL closed. `159.223.55.242` is inventory, never appleboy host. Overlay ping has no public TCP 22 fallback. |
| UAT target substitution | FAIL closed. `129.212.235.2` refused. UAT workflow unchanged. |
| Overlay lateral movement / wildcard Grants | FAIL closed. Single grant `tag:gha-production → tag:cohestra-production tcp:22`. |
| Exit node / subnet routes | FAIL closed in join args, bootstrap command, and Grants (`via` forbidden). |
| Production root SSH / owner or UAT key reuse | Username remains `PROD_DROPLET_USER` (must be `deploy`). Bootstrap does not install a key. |
| Raw JWT / request-token leakage | Inspection decoder reads `ACTIONS_ID_TOKEN_REQUEST_URL` / `ACTIONS_ID_TOKEN_REQUEST_TOKEN` in-process only. Echo, print, upload, persist, and job-output of the request token or raw JWT fail the contract. Legitimate reads are not treated as leaks. |
| Automatic diagnostic workflow | `workflow_dispatch` only + Environment `production`. Push/PR mutations fail tests. |
| Accidental Deploy Production | Still manual, main-only, Environment-gated. This PR does not dispatch. |
| Firewall weakening | 46.2 harden/provision scripts still refuse `0.0.0.0/0:22`, `::/0:22`, and shared runner CIDRs. |

## Edge Case Hunter

- Empty/whitespace overlay vars → `MISSING_OVERLAY_CONFIG=<NAME>` only.
- Leading-zero IPv4, host:port, IPv6, loopback, RFC1918, link-local → REFUSE.
- Addresses immediately below/above `100.64.0.0/10` → REFUSE.
- Authkey-shaped client id (`tskey-*`) → REFUSE.
- Overlay validator stdout never includes the host value.
- Inspection audience is local (`cohestra-production-oidc-inspect`) and refuses Tailscale audiences.
- Missing claims print `ABSENT`.
- Bootstrap scripts refuse non-root, UAT hostname, and test-harness execution.
- `deploy` sudoers / passwordless sudo → REFUSE if present.
- Host→GitHub read credential is documented as a separate later secret. Not created here.

## Acceptance Auditor

Owner authorization covered the code-side control plane only. Live bootstrap, federated identity, secret population, OIDC inspection dispatch, and Production SSH remain unauthorized and were not performed.

Required return-state after this PR:

- Owner Gate A: PASS
- Network architecture: ACCEPTED
- Code implementation: IMPLEMENTED / NOT LIVE
- Owner Gate B: BLOCKED
- Production: NO-GO
- Story 46.4: not started

## Deployment-security

Transport is standard OpenSSH over Tailscale, not Tailscale SSH. Dedicated SSH-key authentication remains. Public firewall posture is unchanged. Cursor is not the Production SSH client.
