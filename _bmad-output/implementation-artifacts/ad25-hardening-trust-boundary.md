# AD25-HARDENING — reproduced trust-boundary evidence

**Baseline loader:** `9ccca77e7297dc28b0a843d3435e9603dc803da7` `deploy/lib/ad25_sync_allowlist.py`  
**Reproduction:** `deploy/reproduce-ad25-trust-boundary.sh` (local fixtures only)  
**Label:** AD25-HARDENING

The baseline helper is a mutable PR-head script. It is **not** an independent authorization root. Recorded behavior:

| Case | Baseline result | Class |
| --- | --- | --- |
| `../src/Api/Program.cs` | ACCEPTED (count 22) | Exploitable gap |
| `/etc/passwd` | ACCEPTED | Exploitable gap |
| `.env` | ACCEPTED | Exploitable gap |
| `deploy/.env` | ACCEPTED | Exploitable gap |
| `config/.env.local` | ACCEPTED | Exploitable gap |
| `deploy/provision-production-droplet.sh` | ACCEPTED | Exploitable gap |
| `deploy/production-remote-deploy.sh` | ACCEPTED | Exploitable gap |
| `deploy/harden-production-host.sh` | ACCEPTED | Exploitable gap |
| `.github/workflows/deploy-production.yml` | REFUSED | Existing defense |
| `.github/workflows/inspect-production-oidc.yml` | ACCEPTED | Exploitable gap |
| `.github/CODEOWNERS` | ACCEPTED | Exploitable gap |
| `.github/dependabot.yml` | ACCEPTED | Exploitable gap |
| Duplicate `deploy/ad25-sync-allowlist.txt` | ACCEPTED (count 22) | Exploitable gap |
| Blank / comment-only extra lines | skipped | Baseline accept (benign) |
| `deploy/foo bar.sh` | ACCEPTED | Exploitable gap |
| `./deploy/validate-prd-ad23.test.sh` | ACCEPTED | Exploitable gap |
| `deploy/../src/Api/Program.cs` | ACCEPTED | Exploitable gap |
| `SRC/Api/Program.cs` | ACCEPTED | Exploitable gap |
| Unicode ZWSP prefix / division-slash / backslash | ACCEPTED | Exploitable gap |
| `deploy/adcp-dispatcher.sh` | REFUSED | Existing defense |
| `src/Api/Program.cs` / `web/package.json` | REFUSED | Existing defense |
| Working-tree symlink to an outside file | ACCEPTED | Exploitable gap |
| Git mode `120000` symlink blob | ACCEPTED | Exploitable gap |
| Malicious PR rewrites allowlist **and** validator | PR-head `authorize` returns success | Exploitable gap |

## What was already defended

Prefix checks refuse literal `src/`, `web/`, case-sensitive `adcp`, and the exact Production workflow path `.github/workflows/deploy-production.yml`. Exact-tree comparison already refuses missing dest blobs, wrong SHAs, and extra dest paths **when the executing validator is trusted**.

## What was exploitable

1. **No canonicalization.** Traversal, absolute paths, dot segments, case-folded application paths, Unicode, and whitespace entries become allowlist members.
2. **No secret / Production / privileged `.github` denylist** beyond one workflow filename.
3. **No duplicate or symlink checks.**
4. **Self-authorization.** Both `deploy/ad25-sync-allowlist.txt` and `deploy/lib/ad25_sync_allowlist.py` are on the 21-path set. A PR that changes them together and is evaluated by its own copy can approve `src/Api/Program.cs`. The same extra is refused if the *baseline* loader is used — proving the trust boundary is “which copy runs,” not the allowlist text.

## Hardened in-repo behavior

The new loader refuses every exploitable row above when **this** module runs. `authorize_from_trusted_ref` extracts the validator blob from `trusted_ref` and runs that copy, so a PR-head rewrite cannot create the authorization signal.

Residual risk (cannot be closed by a file in the PR): a PR-head workflow or wrapper that **does not call** `authorize_from_trusted_ref` and instead runs its own always-return-success helper. That is an external enforcement problem. See the owner-control design.
