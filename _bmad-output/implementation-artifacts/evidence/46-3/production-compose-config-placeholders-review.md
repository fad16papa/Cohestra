# Story 46.3 compose-config placeholder fix review (Grok 4.6)

HEAD under review: this follow-up PR
Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor, deployment-security
Date: 2026-10-24 (Asia/Singapore)
Model routing: Grok 4.6 exclusively

## Verdict

BLOCKERS = 0
MAJORS = 0

## Blind Hunter

| Attack | Result |
| --- | --- |
| Secret persistence | Placeholders are exported only in-process when `.env` is absent. No write to `.env`, GitHub secrets, or artifacts. Tests fail if `.env` appears. |
| Secret leakage | Wrapper still discards interpolated compose. Placeholder sentinels must not appear in stdout. Compose stderr is parsed for variable names only. |
| Weakening runtime contract | `${VAR:?}` remains mandatory in `docker-compose.production.yml`. `up` does not receive placeholders. |
| Masking a real `.env` | Placeholders apply only when `.env` is absent. Existing host values are not overwritten. |
| docker-group / sudo / socket / TCP | Unchanged. Bootstrap still refuses those states. |
| compose up / DB / firewall | Config-only. No `up`, `run`, migrate, UFW, Tailscale, or SSH changes. |

## Edge Case Hunter

- New `${NEW_VAR:?}` fails the helper contract and the bootstrap fixture until a placeholder is added.
- Config `--output` remains REFUSE.
- Socket-less `docker info` failure still allows `config`.
- Partial `.env` is not backfilled; compose failure may emit `MISSING_CONFIG_VAR=<name>` only.

## Acceptance Auditor

Fix is scoped to the owner-run prerequisite config-only path. Production `.env` is not created. Story 46.4 is not started. Live Docker bootstrap is not executed from Cursor.

## Deployment-security

Config-only placeholders are not Production secrets and must never be treated as a SendGrid or database credential bootstrap.
