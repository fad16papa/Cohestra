# Reviewer — version-reality (named technology)

Lens: every Stack row is a real published artifact; brownfield pins match the authorized confirmation sources; no invented versions; named GitHub Actions SHA+tag pairs exist in `/workspace/.github/workflows/deploy.yml`.

Spine read: `ARCHITECTURE-SPINE.md` only (Stack table lines 161–173; Q2 SHA; AD-1 live tip-pin). Confirmation limited to:

- `/workspace/web/package.json` (`next` 16.3.6)
- `/workspace/src/Api/Api.csproj` (`net9.0`)
- `/workspace/.github/workflows/deploy.yml` (action SHA pins, `node-version: 22`, live `origin/main` tip-pin)

Spine not modified.

**Verdict: PASS**

No invented versions. Every Stack row that those three files can prove matches them exactly. Action SHA↔tag comments in `deploy.yml` match the spine. `ggshield` 1.56.1 is a real current PyPI release (not present in the three files; not a contradiction). Q2’s short SHA is the current `origin/main` tip.

---

## Method

| Check | Source |
| --- | --- |
| Next.js | `web/package.json` `"next": "16.3.6"` (exact, uncaret) |
| .NET | `src/Api/Api.csproj` `<TargetFramework>net9.0</TargetFramework>`; package refs `9.0.11` |
| Node | `deploy.yml` `node-version: 22` (browser + lifecycle jobs) |
| PostgreSQL | not in the three authorized files; major `16` not contradicted |
| Action SHAs | literal `uses:` lines + `# vX.Y.Z` comments in `deploy.yml` |
| ggshield | not in the three files; PyPI `ggshield` 1.56.1 (2026-10-26) is current latest |
| Q2 SHA | `git rev-parse origin/main` = `22ffe6350f5198a1b5f67536e243f8a644df13e6` |
| AD-1 live path | `deploy.yml` `workflow_run.branches: [main]`; `ORIGIN_MAIN_REF: origin/main` |

Brownfield ratification is the pass bar. A newer upstream release the repo has not adopted is **not** a fail.

---

## Stack row audit

| Stack row | Spine version | Authorized evidence | Upstream / extra | Result |
| --- | --- | --- | --- | --- |
| .NET | 9.0 | `Api.csproj` `net9.0`; NuGet refs `9.0.11` | Exists; repo is on 9, not a later major | **Match** |
| Next.js | 16.3.6 | `web/package.json` exact `16.3.6` | Real npm version. Same `package.json` still has `eslint-config-next` `16.2.9` (not a Stack row) | **Match** |
| Node | 22 | `deploy.yml` `node-version: 22` (2 jobs) | Current LTS line used by Deploy UAT | **Match** |
| PostgreSQL | 16 | not in package.json / Api.csproj / deploy.yml | Major-only grain; nothing in authorized files contradicts it | **Unconfirmed here**; not invented |
| GitHub Actions checkout | 4.4.0 pin `11d5960a326750d5838078e36cf38b85af677262` | 6 `uses:` in `deploy.yml`, all `# v4.4.0` | SHA comment identity holds | **Match** |
| GitHub Actions upload-artifact | 4.6.2 pin `ea165f8d65b6e75b540449e92b4886f43607fa02` | 5 `uses:` in `deploy.yml`, all `# v4.6.2` | SHA comment identity holds | **Match** |
| GitHub Actions download-artifact | 4.3.0 pin `d3f86a106a0bac45b974a628896c90dbdf5c8093` | 7 `uses:` in `deploy.yml`, all `# v4.3.0` | SHA comment identity holds | **Match** |
| appleboy/ssh-action | 1.2.2 pin `2ead5e36573f08b82fbfce1504f1a4b05a647c6f` | 2 `uses:` in `deploy.yml`, both `# v1.2.2` | SHA comment identity holds | **Match** |
| ggshield | 1.56.1 | not in the three files | PyPI latest = 1.56.1 (2026-10-26); changelog security release; not yanked | **Real / current**; brownfield pin not in authorized files |

No Stack row is a fabricated version, a training-data guess, or a SHA that does not appear in `deploy.yml` where the spine claims an Actions pin.

---

## Named pin existence (`deploy.yml`)

| Pin | In `deploy.yml` |
| --- | --- |
| `actions/checkout@11d5960a326750d5838078e36cf38b85af677262` `# v4.4.0` | yes (all checkout steps) |
| `actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02` `# v4.6.2` | yes |
| `actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093` `# v4.3.0` | yes |
| `appleboy/ssh-action@2ead5e36573f08b82fbfce1504f1a4b05a647c6f` `# v1.2.2` | yes |
| `actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020` `# v4.4.0` | yes — **omitted from Stack** |
| `ggshield==1.56.1` | no (expected; not a Deploy UAT step) |

`deploy.yml` live path still matches AD-1: `workflow_run` listens to CI on `main`; both gate evaluations set `ORIGIN_MAIN_REF: origin/main`. Option B is not pretending the cutover already landed in the workflow file.

---

## Named commit (Q2)

Q2 asks whether the initial `release/uat` SHA should be current `main` `22ffe635`.

`origin/main` is `22ffe6350f5198a1b5f67536e243f8a644df13e6` (`Merge pull request #530`). The short SHA is that tip. Local checkout `main` is behind (`e962c8c3`); Q2 correctly names the remote tip, not the stale local ref. Open question only — not a Stack invention.

---

## Findings

None that fail the lens. Observations only — do not force a spine rewrite.

### 1. MINOR — `deploy.yml` also pins `actions/setup-node` and the Stack omits it

`deploy.yml` uses `actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0` on browser and lifecycle jobs. Proposed post-merge / merge-controller workflows that set up Node could float `@v4` or pick another SHA if this pin is not inherited.

**Action:** optional add if the Stack is meant to inventory every Deploy UAT pin; ignore if the table only binds pins this feature newly decides. Completeness, not invention.

### 2. MINOR — `ggshield` 1.56.1 is real and current, but not proveable from the authorized files

PyPI latest is 1.56.1 (2026-10-26). It does not appear in `package.json`, `Api.csproj`, or `deploy.yml`. AD-17 still names `GitGuardian exact-SHA API scan` as a required post-merge job. The version is not invented; this pass simply cannot ratify the brownfield install line from the three files.

**Action:** none for this verdict. Keep 1.56.1; do not bump or drop.

### 3. NIT — Next.js 16.3.6 is the repo pin; same file still has `eslint-config-next` 16.2.9

`web/package.json` exact-pins `next` at 16.3.6 and `eslint-config-next` at 16.2.9. The Stack row is the app runtime, which is correct. Do not “fix” the spine to 16.2.9 or invent a 16.4.x bump.

### 4. NIT — PostgreSQL `16` is unverified against the three files

Major-only grain. Nothing in the authorized sources contradicts it. Not a fail.

### 5. NIT — listed Actions majors are older than current upstream

checkout 4.4.0, upload-artifact 4.6.2, download-artifact 4.3.0, ssh-action 1.2.2 are the repo pins. Inventing a v5/v7/v8 bump would fail this lens.

---

## Explicit non-findings

- No greenfield starter; no live-default check required.
- `.NET 9.0` vs packages `9.0.11` is the correct stack grain.
- React `19.2.4` in `package.json` is correctly **not** listed; this feature does not bind it.
- AD-1’s “still tip-pins `origin/main`” claim matches `deploy.yml` today.
- Q2 `22ffe635` is a real `origin/main` tip, not a hallucinated SHA.
- Redis / nginx / Production `tailscale/github-action` are correctly **not** listed.

---

## Gate

**PASS.** Authorized confirmation sources match the Stack pins they can prove. No invented SHAs or versions. Omissions (`setup-node`, ggshield brownfield line, PostgreSQL image grain) are completeness, not fiction.
