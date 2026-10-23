# tailscale/github-action pin review (sanitized)

Date: 2026-10-23 (Asia/Singapore)
Reviewed commit: `99a8333667fff04fdd6cffb46dfd409f8329a7bf`
Upstream tags at review time: `v4`, `v4.3.0`
Repository: `https://github.com/tailscale/github-action`
Commit URL: `https://github.com/tailscale/github-action/commit/99a8333667fff04fdd6cffb46dfd409f8329a7bf`

`CODE PATH IMPLEMENTED != LIVE OVERLAY BOOTSTRAPPED`

## Provenance

- Merge commit message: bump default Tailscale version to 1.104.2.
- Action definition: `runs.using: node24`, `main: dist/index.js`, `post: dist/logout/index.js`.
- Federation inputs exist: `oauth-client-id`, `audience`, `tags`.
- Authkey and `oauth-secret` inputs exist but are unused by Cohestra Production.
- Default version `1.104.2` satisfies federation requirement `>= 1.90.1`.

## Token handling

- Workload identity path calls GitHub `core.getIDToken(audience)` and passes `--client-id` + `--id-token` to `tailscale up`.
- OIDC token is issued dynamically by GitHub. No reusable Tailscale auth key is selected.
- `authkey` / `oauth-secret` are masked when present. Cohestra workflows must not pass them.
- Command execution uses silent logging unless Actions debug is enabled. Production appleboy `debug` stays false. Do not enable Actions debug on Production jobs.

## Ephemeral node and cleanup

- Federation client-id is constructed with `preauthorized=true&ephemeral=true`.
- Default `statedir` is empty → in-memory tailscaled state.
- Post step `dist/logout/index.js` logs the node out after the job.
- Runner tag in Cohestra is exactly `tag:gha-production`.

## Residual behavior reviewed and mitigated

- Upstream `tailscale up` includes `--accept-routes` before caller `args`.
- Cohestra passes `--accept-routes=false --advertise-exit-node=false --ssh=false` and re-applies those flags with `tailscale set` before SSH.
- Grants template still denies anything except `tcp:22` to `tag:cohestra-production`.
- Built-in `ping` input is used, plus an independent fail-closed overlay ping with no public-IP fallback.

## Decision

Use the immutable SHA. Do not float `@v4` in the Production workflow.

If this SHA moves, stop and re-review before adopting a replacement.
