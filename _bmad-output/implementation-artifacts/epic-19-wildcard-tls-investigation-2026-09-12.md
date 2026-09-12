# Epic 19.2 — Wildcard TLS investigation (2026-09-12)

## BMAD workflows invoked

- bmad-sprint-status (reconciled Epic 19 / 19.1 / 19.2)
- bmad-investigate (live TLS + repository doctrine)
- bmad-agent-architect (shared edge / DNS-01 / persistence)
- bmad-agent-dev (scripts + tenant URL builders)
- bmad-tea (isolation contract + unit tests)

## Live topology (read-only, no SSH)

| Probe | Result |
|-------|--------|
| `https://uat.cohestra.app/ready` | 200 Healthy |
| `https://thesocialcollectivesg.com/ready` | 200 Healthy |
| SNI `uat.cohestra.app` | CN=uat.cohestra.app; SAN **only** DNS:uat.cohestra.app |
| SNI `creativorare.uat.cohestra.app` | **Wrong cert** — CN=thesocialcollectivesg.com |
| DNS `uat.cohestra.app` | 129.212.235.2 |
| DNS `creativorare.uat.cohestra.app` | 129.212.235.2 |

## Conclusion

Platform HTTPS from prior HTTP-01 `apply-additive-tls.sh` is operational but **does not satisfy** tenant wildcard TLS. Story 19.2 requires DNS-01 re-issue with both SANs and `server_name uat.cohestra.app *.uat.cohestra.app` in `zz-cohestra-uat.conf`.

## Blockers

1. **Owner SSH** — Cloud Agent cannot mutate droplet; owner runs scripts as `deploy@129.212.235.2`.
2. **DNS-01 owner gate** — GoDaddy TXT at `_acme-challenge.uat.cohestra.app` when certbot runs.

## Outbound URL defect (repo)

`TenantPublicWebUrlBuilder` and `buildTenantDashboardUrl` emitted production `*.cohestra.app` from UAT apex — patched in this branch.

## Persistence gap

`zz-cohestra-uat.conf` may exist only in container writable layer. `persist-cohestra-vhost.sh` exports to host; second bind mount on existing nginx service remains **CONDITIONAL** follow-up.
