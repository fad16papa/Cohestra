# Reviewer — version-reality (named technology)

Lens: every Stack row is current and matches the brownfield repo; no invented versions; named GitHub Actions pins exist in `.github/workflows/deploy.yml` and `.github/workflows/ci.yml`.

Spine read: `ARCHITECTURE-SPINE.md` only (Stack table lines 149–161). Repo confirmation against `/workspace` as authorized. Spine not modified.

**Verdict: PASS**

No invented versions. Every Stack row is a real, published artifact that the brownfield repo already uses. Every named Actions SHA exists in `deploy.yml` and/or `ci.yml` and resolves to the claimed tag.

---

## Method

| Check | Source |
| --- | --- |
| Next.js | `web/package.json` (`next`: exact `16.3.6`), `web/package-lock.json` |
| .NET | `src/Api/Api.csproj` `TargetFramework=net9.0`; all other `*.csproj` the same; `ci.yml` `dotnet-version: 9.0.x` |
| Node | `deploy.yml` / `ci.yml` `node-version: 22`; AGENTS.md Node 22 |
| PostgreSQL | `docker-compose.yml`, `docker-compose.uat.yml`, `docker-compose.production.yml` `postgres:16-alpine`; `ci.yml` service `postgres:16-alpine` |
| Action SHAs | literal `uses:` lines in `deploy.yml` and `ci.yml` |
| Action tag ↔ SHA | GitHub API `git/refs/tags` + commit objects (2026-11-01) |
| ggshield | `ci.yml` `pip install 'ggshield==1.56.1'`; PyPI `ggshield` 1.56.1 (2026-10-26), current latest |
| Upstream “latest” | used only to detect invented upgrades, not to demand a spine bump |

Brownfield ratification is the pass bar. A newer upstream release that the repo has not adopted is **not** a fail.

---

## Stack row audit

| Stack row | Spine version | Brownfield evidence | Upstream check | Result |
| --- | --- | --- | --- | --- |
| .NET | 9.0 | `net9.0` on every csproj; CI `9.0.x`; NuGet refs `9.0.11` | Exists; repo is on 9, not a later major | **Match** |
| Next.js | 16.3.6 | `web/package.json` + lockfile exact `16.3.6` | Real npm/GitHub tag `v16.3.6` (2026-09-22 security fix). Later 16.3.8 / 16.4.3 exist; repo has not moved | **Match** (brownfield, not latest) |
| Node | 22 | `node-version: 22` in `ci.yml` (frontend + Playwright) and `deploy.yml` (Playwright + UAT acceptance) | Current LTS line used by CI | **Match** |
| PostgreSQL | 16 | Compose + CI image `postgres:16-alpine` | Major 16 is the image family in use | **Match** (tag grain is `16-alpine`, not invented) |
| GitHub Actions checkout | 4.4.0 pin `11d5960a326750d5838078e36cf38b85af677262` | SHA + `# v4.4.0` on every `deploy.yml` checkout; `ci.yml` exact-SHA + GitGuardian jobs | Tag `v4.4.0` **is** that SHA (commit 2026-07-16). Latest checkout is v7.x | **Match**; pin exists |
| GitHub Actions upload-artifact | 4.6.2 pin `ea165f8d65b6e75b540449e92b4886f43607fa02` | `deploy.yml` (5 jobs) and `ci.yml` (1 job) | Tag `v4.6.2` **is** that SHA. Latest upload-artifact is v7.x | **Match**; pin exists |
| GitHub Actions download-artifact | 4.3.0 pin `d3f86a106a0bac45b974a628896c90dbdf5c8093` | `deploy.yml` delivery-outcome + Playwright gather (6 uses). Not used in `ci.yml` | Tag `v4.3.0` **is** that SHA. Latest download-artifact is v8.x | **Match**; pin exists in `deploy.yml` |
| appleboy/ssh-action | 1.2.2 pin `2ead5e36573f08b82fbfce1504f1a4b05a647c6f` | `deploy.yml` SSH deploy + remote Playwright (2 uses). Also `deploy-production.yml` | Tag `v1.2.2` **is** that SHA. Latest is v1.2.5 | **Match**; pin exists in `deploy.yml` |
| ggshield | 1.56.1 | `ci.yml` `GitGuardian exact-SHA API scan` `pip install ... 'ggshield==1.56.1'` | PyPI latest = 1.56.1 (2026-10-26), not yanked | **Match**; current |

No Stack row is a fabricated version, a training-data guess, or a SHA that does not exist.

---

## Named pin existence (deploy.yml / ci.yml)

| Pin | `deploy.yml` | `ci.yml` |
| --- | --- | --- |
| `actions/checkout@11d5960a326750d5838078e36cf38b85af677262` | yes (all checkout steps) | yes (`exact-sha-scan`, `gitguardian-exact-sha-api`) |
| `actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02` | yes | yes |
| `actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093` | yes | not used (allowed; pin is real where named) |
| `appleboy/ssh-action@2ead5e36573f08b82fbfce1504f1a4b05a647c6f` | yes | not used (allowed) |
| `ggshield==1.56.1` | not used | yes |

SHA ↔ tag verification (GitHub API, 2026-11-01):

```
actions/checkout          v4.4.0  = 11d5960a326750d5838078e36cf38b85af677262
actions/upload-artifact   v4.6.2  = ea165f8d65b6e75b540449e92b4886f43607fa02
actions/download-artifact v4.3.0  = d3f86a106a0bac45b974a628896c90dbdf5c8093
appleboy/ssh-action       v1.2.2  = 2ead5e36573f08b82fbfce1504f1a4b05a647c6f
```

---

## Findings

None that fail the lens. Observations only — do not force a spine rewrite.

### 1. MINOR — Stack overstates checkout-pin uniformity in `ci.yml`

`ci.yml` still uses floating `actions/checkout@v4` on `.NET`, integration, frontend, UAT isolation, and Playwright jobs. The SHA pin is only on the two exact-SHA / GitGuardian jobs. The Stack row is still true: that pin exists and `v4` currently resolves to the same `11d5960` commit. It is not an invented version. A later `v4` move would make the row incomplete, not false today.

**Action:** optional note that pre-merge CI still floats `@v4`; not required for this verdict.

### 2. MINOR — `deploy.yml` also pins `actions/setup-node` and the Stack omits it

`deploy.yml` uses `actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0` (confirmed = tag `v4.4.0`). `ci.yml` still floats `actions/setup-node@v4` and `actions/setup-dotnet@v4`. Omission is completeness, not invention.

**Action:** optional add if the Stack is meant to inventory every deploy pin; ignore if the table is only the pins this feature newly binds.

### 3. NIT — listed Actions majors are older than current upstream

checkout 4.4.0 vs latest v7.0.1; upload-artifact 4.6.2 vs v7.0.2; download-artifact 4.3.0 vs v8.0.2; ssh-action 1.2.2 vs v1.2.5. Spine correctly ratifies the repo. Inventing a v5/v7/v8 bump would fail this lens.

### 4. NIT — Next.js 16.3.6 is the repo pin, not npm latest

npm also has 16.3.8 and 16.4.3. `eslint-config-next` in the same `package.json` is still `16.2.9` (not a Stack row). Do not change the spine to 16.4.x.

### 5. NIT — PostgreSQL grain is major-only

Repo image is `postgres:16-alpine`. Spine `16` is the correct major and matches Epic 46 / project-context. Not invented.

---

## Explicit non-findings

- No greenfield starter; no live-default check required.
- `.NET 9.0` vs CI `9.0.x` vs packages `9.0.11` is the correct stack grain.
- README “Node.js 20+” is stale docs, not a spine error. Workflows and AGENTS.md are Node 22.
- Redis 7 / nginx 1.27 exist in compose and are correctly **not** listed; this feature does not bind them.
- `tailscale/github-action@99a8333667fff04fdd6cffb46dfd409f8329a7bf` in `deploy-production.yml` is outside this Stack and this feature’s NO-GO on Production.

---

## Gate

**PASS.** Every Stack row is a real, current-in-repo version. No invented pins. Named checkout / upload-artifact / download-artifact / ssh-action / ggshield versions exist in `deploy.yml` / `ci.yml` with SHA-tag identity confirmed.
