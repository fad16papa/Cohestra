---
title: Security review — Autonomous Development Control Program planning package
status: fail
reviewer: security (planning-only)
date: 2026-10-25
subject: _bmad-output/planning-artifacts/autonomous-development-control-program-2026-10-25/
baseline_claimed: main e962c8c3eead953a1f56f2b397b3e9d4fc669041
production: NO-GO
epic_46: must remain untouched
verdict: FAIL
unresolved_blockers: 4
unresolved_majors: 7
focus:
  - secret isolation
  - least privilege
  - Production isolation
  - webhook / API key handling
  - audit
  - privilege expansion
---

# Security review — ADCP planning artifacts

**Verdict: FAIL.** Do not implement. Do not create Environments, API keys, or workflows. Do not sign D1–D10 as written. Owner approval is a prerequisite for any later implementation; this review does not authorize one.

This is a planning-package security review, not an application-code review and not a request to build ADCP. Severity follows `_bmad/custom/mandatory-code-review-loop.md`: BLOCKER includes security issues and architectural violations with meaningful risk. Unresolved BLOCKER or MAJOR blocks close.

## Scope read

| Artifact | Read |
| --- | --- |
| `README.md` | yes |
| `01-discovery.md` | yes |
| `02-brief.md` | yes |
| `03-prd.md` | yes |
| `04-governance.md` | yes |
| `05-orchestration-options.md` | yes |
| `architecture/ARCHITECTURE-SPINE.md` | yes |
| `06-milestone-reports.md` | yes |
| `07-implementation-proposal.md` | yes |
| `08-epics-and-stories.md` | yes |
| `09-owner-decision-register.md` | yes |

Checked against (read-only): Epic 45 AD-1..AD-12, Epic 46 AD-6/AD-7 and paradigm sentence, `autonomous-merge-policy.md` (APPROVED 2026-10-15), `epic-46/production-security-model.md`, `.github/workflows/deploy.yml` / `deploy-production.yml` / `ci.yml` / `inspect-production-oidc.yml`, `deploy/fail-closed-production-secrets.sh`, `deploy/fail-closed-uat-secrets.sh`, Cursor Cloud Agents API v1 docs (endpoints, secrets, webhooks; fetched 2026-10-25).

Asked checks: secret isolation; least privilege; Production isolation; webhook/API key handling; audit; privilege expansion.

No application code was changed. No GitHub settings, secrets, or Epic 46 files were modified for this review.

## Verdict in one paragraph

The package correctly *labels* a new Environment, owner-created keys, `persist-credentials: false`, fail-closed missing **names**, and “not `uat` / not `production`.” It does not *design* isolation. A job on Environment `control-plane` still sees repository and organization secrets; the only contract test is a `PROD_DROPLET_*` prefix denylist; the Cursor API key the job would hold can inject `envVars`, manage Cloud Agent secrets/environments, and launch against unconstrained `repos[]`. Unattended `adcp/task` / `/adcp run` / optional `schedule` is privilege expansion with no actor allowlist, no dedicated automation identity, and no Environment required-reviewer row. The architecture-halt path set cannot see the dispatcher YAML, `ci.yml`, UAT deploy, or this spine — so an executor that merges under the existing UAT policy can rewrite the privilege boundary and still auto-deploy UAT. `main` is unprotected. Signing the register as drafted would adopt that system. **Do not implement it.**

---

## Focus scorecard

| Focus | Result |
| --- | --- |
| Secret isolation | **FAIL (BLOCKER).** Intent is sound; mechanism is a denylist plus “new Environment.” Repo/org inheritance, Cursor Cloud secrets, `envVars`, and the v1 secrets API are unspecified. |
| Least privilege | **FAIL (BLOCKER).** `GITHUB_TOKEN` has no workflow-level default-deny; 07 vs 47.2 disagree; Cursor user key is allowed; API surface is unbounded; no invocation ACL. |
| Production isolation | **FAIL (BLOCKER).** Halt is dispatch-time and misses the files that *are* the Production/UAT control plane. Success path mutates UAT. Owner personal Cursor key can sit on the same identity that reviews Environment `production`. |
| Webhook / API key handling | **FAIL (BLOCKER + MAJOR).** Pilot correctly avoids v1 webhooks. `issue_comment` is still an unauthenticated-to-ADCP command channel. Cursor key is treated as “launch only.” Option B has no HMAC/secret class. |
| Audit | **FAIL (MAJOR).** NFR-3 is not carried into 04 or 47.3. Actor, follow-up, cancel, ChatGPT call, and secret-name checks are missing. `AUTHOR_ROLE` is self-asserted. |
| Privilege expansion | **FAIL (BLOCKER).** Option A *is* a new write-permission set and a new secret class. FR-19 has no AC. D3/D5 are not that gate. Dispatcher YAML is outside the halt glob. |

---

## Findings

### B-1 — Unattended dispatch is control-plane privilege expansion without an actor allowlist, dedicated identity, or Environment protection

**Severity:** BLOCKER  
**Focus:** privilege expansion; least privilege; webhook/API key handling

`autonomous-merge-policy.md` (already APPROVED) still owner-gates:

- new GitHub Actions write permissions
- expanded Environment secrets / additional secret classes
- changing GitHub Environment protection rules
- broadening destructive infrastructure capability
- new external-service credentials

Option A (`05-orchestration-options.md`) triggers on `workflow_dispatch`, **`issues` labeled `adcp/task`**, **`issue_comment` (`/adcp run`)**, and optional **`schedule`**. `07` then grants that job `issues:write` and `pull-requests:write`. Discovery already recorded: `main` is **not** branch-protected; no CODEOWNERS; squash and rebase allowed; Environment `uat` has no protection rules.

There is no D-row for:

- who may apply `adcp/task` or comment `/adcp run` (human allowlist vs any collaborator vs the launched agent)
- whether a Cursor agent may re-label or re-comment and spawn a new `POST /v1/agents` outside the original retry budget (FR-14 forbids infinite self-dispatch; 47.2 has no AC; 07 only “forbid workflow from triggering itself on its own PRs **without a label**,” which still allows labeled self-reentry)
- Cursor identity = dedicated service account (Epic 45 AD-10) vs the owner’s **personal** user API key (`07` explicitly allows either)
- required reviewers on the new Environment (spine defers this; D4 is the **name** only)
- GHA permission set as a privilege-expansion decision (`contents:write`, `actions:write`, `id-token:write` never denied)
- `schedule` as standing unattended automation

D3 (“pick A/B/C”) is an orchestrator topology choice, not a privilege-expansion approval. D5 mints keys after D1+D3+D4, still without D8 and without an invocation ACL.

Combined with `04` allowing “UAT-path merge when policy holds” and Epic 45 auto-deploy of `main` via `deploy.yml`, a labeled issue from any collaborator — or a looping agent comment — can launch an executor that merges to `main` and mutates UAT. If the Cursor key is the owner’s user key, the executor is seated on the same human identity that Environment `production` required-reviewers are supposed to represent (`production-security-model.md`: “no self-approve if possible”).

`issue_comment` `/adcp run` is a command channel. GitHub authenticates that a comment occurred; ADCP never authenticates that the **actor is authorized** to spend the Cursor key. That is webhook-equivalent invocation without a shared secret and without an ACL.

**Required planning change (owner must accept before any implementation):** Dedicated owner decisions for (1) invocation ACL — human allowlist; agents cannot `/adcp run` or apply `adcp/task`, (2) dedicated automation identity — no owner personal Cursor key, (3) Environment required reviewers before the first key is stored, (4) GHA permission set including an explicit deny of `contents:write`, `actions:write`, `id-token:write`, (5) self-dispatch contract. Pilot triggers = `workflow_dispatch` only until those rows exist. Do not treat this paragraph as permission to build the workflow.

---

### B-2 — Secret isolation is not designed; the denylist is a prefix, and the Cursor API key can move secrets into the executor

**Severity:** BLOCKER  
**Focus:** secret isolation; webhook/API key handling; least privilege

Correct instincts: new Environment; not `uat`; not `production`; owner creates keys; `persist-credentials: false`; fail-closed `MISSING_SECRET=<NAME>`; evidence should be names/SHAs/URLs.

Insufficient engineering:

1. **Name collision with the already-adopted Production control plane.** Epic 46 spine (final): “GitHub Actions plus Environment `production` is the control plane.” `05` then says Option A “Reuses GitHub as the already-adopted control plane (Epic 45/46).” Proposed Environment name `control-plane` (D4, AD-5, 47.2) is the collision. An implementer who takes those sentences literally puts `CURSOR_API_KEY` on Environment `production`, or attaches `environment: production` to the dispatcher because that is “the control plane.”

2. **GitHub secret inheritance is unmentioned.** A job with `environment: control-plane` still receives **repository** and **organization** secrets. Epic 45 AD-2 exists to stop repo-level production-shaped secrets. This package never requires an owner inventory of remaining repo/org secrets, and never requires the ADCP job to run with an explicit allowlist of secret *names* (`CURSOR_API_KEY` and optional ChatGPT key only). GitHub has no job-level “ignore repo secrets” switch; the only control is “do not reference them” plus keeping production-shaped values off repo/org scope. Neither is a story AC.

3. **47.2 denylist is `PROD_DROPLET_*` and “Production host `.env` names.”** Live names from `production-security-model.md` and the workflows include `DROPLET_SSH_KEY` / `DROPLET_HOST` / `DROPLET_USER` (UAT), `UAT_AUTO_*` passwords, `UAT_OTP_MAILBOX_SECRET`, `PROD_DROPLET_SSH_KEY`, `PROD_PUBLIC_BASE_URL`, plus host `.env` classes: JWT signing key, Redis password, live Paddle keys, Paddle webhook secret, SendGrid, reCAPTCHA secret, backup encryption key. A workflow can `${{ secrets.DROPLET_SSH_KEY }}` or `${{ secrets.PROD_DROPLET_SSH_KEY }}` and still pass the written AC if those names are not listed as *required*. Environment-scoped UAT/Production secrets are empty when the job is not on that Environment — the AC never encodes that model, so it cannot fail a job that *does* attach the wrong Environment.

4. **FR-17 is about what agents receive, not what YAML names.** Cursor Cloud Agents API v1 (docs 2026-10-25):

   - `POST /v1/agents` `envVars`: session-scoped values **injected into the agent’s shell**.
   - Secret resolution order: create-time `envVars`, then the Cloud environment’s secrets, then the user’s personal secrets, then the team’s secrets.
   - `/v1/secrets`, `/v1/environments/{id}/secrets`, `/v1/team/secrets`, `/v1/me/secrets` can **create and update** secret values (GET responses omit values; writes do not).
   - `mcpServers[].env` / `headers` can carry runtime secrets into the VM.

   The ADCP job that holds `CURSOR_API_KEY` is therefore a secret *broker*, not a launch button. The package never forbids passing `${{ secrets.* }}` into `envVars`, never scopes the Cursor Cloud environment used for ADCP to empty/no Production/UAT names, never forbids the secrets-management endpoints, and never says `GITHUB_TOKEN` / `CURSOR_API_KEY` / `OPENAI_API_KEY` must not be forwarded into the executor. Injecting the Cursor key into the agent is recursive privilege (the executor can `POST /v1/agents` again).

5. **`07` “Never `startingRef` a Production host checkout”** is a category error (`startingRef` is a git ref). It does not prevent secret mixing.

6. **Two keys, one Environment.** `CURSOR_API_KEY` and `OPENAI_API_KEY` share blast radius. Compromise of the dispatcher leaks both. Least privilege would split classes or at least name the combined blast radius as an owner-accepted risk. D6 is still OPEN while D5 already co-locates “optional ChatGPT API key.”

7. **Outbound ChatGPT payloads are not redacted.** Issue bodies and diffs sent to OpenAI can contain secrets if an agent committed them, plus tenant PII on later stories. FR-18 only cites Epic 45 AD-4 for evidence artifacts. Merge policy already owner-gates “new external-service credentials”; it does not, in this package, owner-gate the **data flow**.

**Required planning change (not implementation):** Rename the Environment so it cannot be read as Epic 46’s Production control plane. Deny-list every Production *and* UAT secret name from the existing workflows and the 46.9 audit list. State that repository/org secrets must not be production-shaped (owner inventory) and that the ADCP workflow references an explicit name allowlist only. State that Cursor Cloud environments used for ADCP have no Production/UAT secrets and that `envVars` / secrets APIs / MCP env are forbidden to the dispatcher. Redact outbound advisor payloads. Do not mint keys to prove this.

---

### B-3 — Production and UAT isolation halt cannot see the privilege boundary; post-launch diffs and UAT auto-deploy are in the success path

**Severity:** BLOCKER  
**Focus:** Production isolation; privilege expansion; secret isolation

FR-15 / AD-6 halt on “architecture-path changes.” `04-governance.md` defines the path set as:

- `_bmad-output/planning-artifacts/architecture/**`
- Production compose / `deploy/production-*.sh` / `deploy/validate-production-*.sh`
- `.github/workflows/deploy-production.yml` and provenance scripts
- `ProductionSecurityValidator`, tenant filters, recaptcha/CORS/JWT/Paddle guards
- GitHub Environment names, required reviewers, or secret classes (prose, not a path)
- New external vendors, always-on services, public ports

Story 47.1 AC only fixtures `docker-compose.production.yml` “or an architecture spine” and `web/lib/plan-limit-utils.test.ts`.

**Not in the halt set**, and therefore silently editable by a dispatched executor that is allowed to open PRs and (per `04`) merge on the UAT path:

| Path | Why it is a security boundary |
| --- | --- |
| `.github/workflows/adcp-dispatch.yml` (structural seed) | The job that will hold `CURSOR_API_KEY`. Editing it can add `environment: production`, `id-token: write`, or `${{ secrets.DROPLET_SSH_KEY }}`. |
| `.github/workflows/ci.yml` | No `permissions:` block today (permissive default). An ADCP PR can add `environment: control-plane` and exfiltrate the new key on the next `pull_request` from a same-repo branch if the Environment has no required reviewers. |
| `.github/workflows/deploy.yml`, `docker-compose.uat.yml`, `deploy/remote-deploy.sh` | Epic 45 UAT isolation. NFR-5 says must not weaken it. CI success on `main` deploys UAT. |
| `.github/workflows/inspect-production-oidc.yml` | `environment: production` + `id-token: write`. Copying that pattern onto ADCP mints Production-audience OIDC. |
| `autonomous-merge-policy.md`, `_bmad/custom/mandatory-code-review-loop.md` | Merge authority and close gate. |
| this program’s `architecture/ARCHITECTURE-SPINE.md` | Glob is `planning-artifacts/architecture/**`, not `**/ARCHITECTURE-SPINE.md`. |
| Epic 46 story/spine paths | AD-10 / FR-8 is a prose rule, not a detector. |

Halt detection in Option A is `paths` filters plus a **pre-launch** label/path gate. Triggers are not `pull_request`. The executor opens the PR **after** that gate. Spine flowchart reaches `Review -->|Production path| PO` only after Exact-HEAD CI. Recovery “leave the draft PR” leaves a Production-touching diff mergeable on an unprotected `main`.

NFR-2 says orchestrator **failures** must not leave Production or UAT mutated. Epic 45 `deploy.yml`: CI success on `main` deploys UAT. ADCP governance allows UAT-path merge. A **successful** ADCP task that merges **does** mutate UAT by design. Changing `deploy-production.yml` on `main` does not auto-deploy Production, but it **does** change the next owner `workflow_dispatch` — a control-plane supply chain on the UAT merge path.

D10 recommends leaving `main` unprotected (“later; does not block ADCP pilot”). That choice, combined with unattended merge volume, is how Epic 46 AD-7 two-parent provenance breaks (squash/rebase allowed; no story AC forbids it). Direct-to-main is possible via API field `workOnCurrentBranch: true` against `startingRef: main` (see B-4). Discovery already recorded `protected: false`.

**Required planning change (not implementation):** Halt set is the union of every `ARCHITECTURE-SPINE.md`, merge policy, `_bmad/custom/`, UAT *and* Production deploy/compose/provenance/OIDC inspect, **all** `.github/workflows/*`, Environment/workflow privilege files, and Epic 46 paths. Post-launch PR diffs must cancel the agent, fail CI, and block merge. NFR-2 must be rewritten so UAT mutation via approved merge is explicit, or UAT merge must be out of the pilot. Do not implement a halt script as a substitute for owner-signed path set and merge-method rules.

---

### B-4 — The Cursor API key is an unbounded control-plane credential; the package treats it as “POST /v1/agents”

**Severity:** BLOCKER  
**Focus:** least privilege; webhook/API key handling; secret isolation; privilege expansion

Verified against Cursor Cloud Agents API v1 (public beta, docs 2026-10-25):

| API capability the key unlocks | Specified in ADCP? | Risk if unspecified |
| --- | --- | --- |
| `repos[].url` — any repository the key can access | No pin to this Cohestra remote | Issue body / dispatch input launches an agent on another repo the owner’s user key can see |
| `startingRef` | Defaults to `main`; “never a Production host checkout” | Attacker-controlled ref |
| `workOnCurrentBranch: true` | **Absent.** Default is false | Push **directly to `main`** on an unprotected default branch; bypasses draft-PR policy (FR-10) |
| `envVars` injected into the agent shell | Absent | Secret forwarding (B-2) |
| `mcpServers` with `env` / `headers` | Absent | Third-party tool creds in the VM |
| `customSubagents` | Absent. AD-3 says one executor; child agents need an ADR | Fan-out without the ADR |
| Environments CRUD + `/v1/*/secrets` writes | Absent | Key can persist secrets into Cursor Cloud |
| Artifacts list + 15-minute **presigned S3 URL** | FR-12 names list/download; 47.2 AC omits them | Secret-bearing screenshots posted into issue comments; URLs world-reachable for 15 minutes |
| Auth: user API key **or** service-account key; Basic or Bearer | `07` allows either | User key inherits the owner’s repos, spend, and attribution. Service accounts are the AD-10 shape and are Enterprise-gated — not an owner row |
| v0 webhooks HMAC-SHA256 (`X-Webhook-Signature`); v1 “coming soon” | Pilot correctly tagged `[ASSUMPTION]` no v1 webhooks | No secret class, rotation, or verify-or-drop rule for the day they are enabled |

`07` permission matrix constrains **`GITHUB_TOKEN`**, not the Cursor key. The executor’s GitHub identity is Cursor’s source-control integration, which is how branches and PRs are written. Least privilege for that identity (contents limited to this repo, no Actions, no Environments, no Administration, no Secrets) is unwritten.

`47.2` AC: “Permissions are read/write issues and PRs only — no `production` Environment.” That sentence is false as a least-privilege spec:

- Checkout needs `contents:read` (`07` has it; the AC would fail a correct workflow).
- Neither document requires a **workflow-level** `permissions:` default-deny. Existing `deploy.yml` and `deploy-production.yml` pin this; `ci.yml` does **not**. Copying `ci.yml` is the leaky default (`GITHUB_TOKEN` write in many repo settings).
- `actions:write` and `id-token:write` are not listed as forbidden. `actions:write` can `gh workflow run` Production. `id-token:write` plus `environment: production` is the Tailscale OIDC path already present in `inspect-production-oidc.yml`.
- `pull-requests:write` can approve/label; merge typically also needs `contents:write`. The deny of `contents:write` is implicit in 07 and absent from 47.2.

Basic auth (`-u $CURSOR_API_KEY:`) plus `set -x` or Actions debug logging is a classic key leak. The package says “names-only logging” and never forbids printing `Authorization` headers or using unmasked env in `curl -v`.

**Required planning change (not implementation):** Pin `repos[].url` to this repository. Forbid `workOnCurrentBranch`, `envVars`, MCP env, customSubagents, environments/secrets write endpoints, and artifact URL publication. Require a dedicated service-account key with spend cap; owner personal keys are out. Workflow-level `permissions:` default-deny matching `deploy-production.yml` style, plus an explicit deny list. Bearer auth only; no Basic; no debug dump of headers. Webhook enablement (Cursor v1 or GitHub inbound for Option B) is its own owner-gated secret class with HMAC verify-or-drop. Do not create the key to “try” the pin.

---

### M-1 — Webhook and command-channel handling has no verify-or-drop design, including for deferred Option B and v1

**Severity:** MAJOR  
**Focus:** webhook/API key handling

What is correct: v1 webhooks are tagged `[ASSUMPTION]` not-generally-available; the pilot is GitHub events + polling; Option B is deferred as privilege expansion (D9).

What is missing:

- Option B: “Subscribes to GitHub webhooks” with no `X-Hub-Signature-256` secret, rotation, raw-body verify, replay window, or IP/allowlist. A dedicated orchestrator host with an unverified inbound webhook is remote code execution against the Cursor key.
- Cursor v0 webhooks already document HMAC-SHA256 (`sha256=<hex>` on `X-Webhook-Signature`) and `X-Webhook-ID`. No ADCP secret name (`CURSOR_WEBHOOK_SECRET`), no “unsigned drop,” no retry/idempotency rule. When v1 ships, the same gap returns.
- Option A `issue_comment` `/adcp run` has no additional authenticator. The prompt is the issue body. Untrusted text becomes `POST /v1/agents` instructions (prompt injection: ignore review, set `workOnCurrentBranch`, dispatch Production, request privilege expansion). Governance forbids ChatGPT “instructing Cursor to bypass review”; it does not forbid the orchestrator copying the issue into the executor prompt.
- `workflow_dispatch` inputs for `startingRef` / prompt are unconstrained.
- No key rotation runbook, no revocation on workflow disable (pilot rollback says “revoke the API keys” as prose, not an AC), no dual-control to read the Environment value.

This is MAJOR rather than BLOCKER because the pilot text currently avoids Cursor webhooks. It becomes BLOCKER if D9 or a later “enable webhooks” sentence is signed without the HMAC contract.

**Required planning change:** Threat model and owner rows for (a) GitHub command-channel ACL (see B-1), (b) prompt isolation — issue text is data, not instructions, (c) Option B / v1 webhook secret class, HMAC, replay, and unsigned-drop. Rollback must include key revocation as a recorded owner action, not a bullet in 07.

---

### M-2 — Audit cannot satisfy NFR-3; 04, 06, and 47.3 disagree; actor and cancel/follow-up are missing

**Severity:** MAJOR  
**Focus:** audit

NFR-3: every **dispatch, follow-up, cancel, and owner decision** is attributable in GitHub (workflow log, issue comment, or PR comment).

`04` minimum record:

- issue or PR number that authorized the run
- orchestrator workflow run URL
- Cursor agent id and run id
- model id requested
- branch and HEAD SHA
- CI check-run conclusions
- owner decision id if any gate fired

Missing from 04, and required for a control-plane audit:

- `github.actor` / `github.triggering_actor` / event name (`workflow_dispatch` vs labeled issue vs `/adcp run` vs `schedule`)
- follow-up / steer payload metadata (redacted) and Cursor run ids per follow-up
- cancel reason, canceller, Cursor cancel response
- ChatGPT request id / model / whether routing was skipped
- secret-name presence checks (`MISSING_SECRET=…` / allowlist evaluation) without values
- whether `repos[]`, `workOnCurrentBranch`, `envVars`, MCP were present on the create call (must be absent)
- Environment name actually used (`control-plane` vs accidentally `production`)

`06` template section 10 has PR, SHA, CI URL, agent id, workflow URL — still no actor, no follow-up, no cancel. Completeness refuses `MILESTONE=complete` without SHA, CI SUCCESS, BMAD review, architecture ADR, and GitGuardian success **only for Production-related tasks**. `47.3` AC then weakens that to “fails without 40-hex SHA **or** CI URL” and GitGuardian `neutral` cannot satisfy a Production-provenance complete flag. FR-11 is exact PR number **and** SHA **and** CI URL. NFR-3 is not mapped to any story.

`AUTHOR_ROLE: owner | chatgpt | cursor-agent | orchestrator` is self-asserted in a comment. It is not evidence of who spent the key.

Actions logs are not a durable audit store (retention is finite). Presigned artifact URLs in comments (B-4) are an audit leak and a secret leak.

**Required planning change:** One audit schema that is the union of NFR-3, 04, and 06 section 10, with actor and every API verb. 47.3 AC must match FR-11 (`and`, not `or`) and must record follow-up/cancel. `AUTHOR_ROLE` cannot substitute for `github.actor`.

---

### M-3 — FR-19 is uncovered; D5 can mint a new secret class before the architecture or the privilege gate exists

**Severity:** MAJOR  
**Focus:** privilege expansion; secret isolation

FR-19: privilege expansion (new write permissions, new secret classes, weakening gates) is an owner gate, matching the merge policy.

Story 47.2 claims FR-16..19. Its ACs test Environment name, mock/live, issue/PR permissions wording, timeout cancel, `MISSING_SECRET=CURSOR_API_KEY`, and the `PROD_DROPLET_*` denylist. **FR-19 has no AC.** Loop termination (`05`) escalates when “agent requests privilege expansion” — a prose branch with no detector.

D5 prerequisites are D1+D3+D4, not D6 (ChatGPT data flow), not D8 (adopt ADs), not an invocation ACL, not Environment protection. Keys can be minted — a new external credential **and** a new secret class — before the owner adopts AD-1..AD-10.

Creating Environment `control-plane` without required reviewers is itself “changing GitHub Environment protection rules” in the negative (an unprotected secret store). Spine lists required reviewers as deferred. Merge policy says that change is an owner gate. It is not a D-row.

Option A “Fits current ADs: Yes, after Environment owner gate” is false. Option A *is* new write permissions and a new secret class. Fitting current ADs would require the privilege-expansion decision first, then the topology choice.

**Required planning change:** A D-row whose text is the merge-policy privilege-expansion list, required before D5. 47.2 cannot exist until that row is signed. D5 cannot precede D8, invocation ACL, and Environment reviewers.

---

### M-4 — Environment `control-plane` plus deferred reviewers is a secret-exfiltration pattern against same-repo PRs

**Severity:** MAJOR  
**Focus:** secret isolation; least privilege; Production isolation

GitHub Environment secrets are available to jobs that request the Environment. Without required reviewers, a same-repo `pull_request` workflow that adds `environment: control-plane` receives `CURSOR_API_KEY`. `ci.yml` has no `permissions:` pin and is not in the halt set (B-3). After the first key exists, every subsequent ADCP-merged workflow edit is in the blast radius.

`07` mentions “GitHub Environment + required reviewer (owner)” as a dependency. D4 options are `control-plane` / other / **defer creation**. Deferring creation is safe. Creating without reviewers is not. The register can be signed as `control-plane` without the protection half.

Pilot rollback (“disable the workflow (`on:` empty or `if: false`)”) leaves the Environment and keys in place. Disable without revoke is not isolation.

**Required planning change:** Environment protection (required reviewers, restricted branches, no self-approve) is part of D4 or a new D-row, not a deferred spine bullet. No key lands in an unprotected Environment. Rollback = disable **and** revoke **and** empty the Environment.

---

### M-5 — GitGuardian `neutral`, squash merges, and unattended volume break the Production provenance the package claims to inherit

**Severity:** MAJOR  
**Focus:** Production isolation; audit

Inherited Epic 46 AD-7: two-parent merge; `merge_commit_sha == deploy_sha`; GitGuardian SUCCESS on `${deploy_sha}^2`. Discovery: `main` allows squash and rebase; no branch protection. Merge policy does not specify merge method. No story AC forbids squash/rebase of ADCP PRs. Any ADCP-merged SHA that later becomes a Production deploy target fails Layer A/B.

Loop termination treats GitGuardian not-`success` only when the task **claimed** a merge-ready Production-provenance PR. Completeness / 47.3 bar `neutral` from the Production-provenance **complete flag** only. `neutral` is a completed check-run. UAT autonomous merge has no `neutral` predicate. A NEUTRAL conclusion on a routine ADCP task can look green and merge, then later ship.

This is a security finding because provenance is the Production SHA trust boundary (`production-security-model.md`). Increasing unattended merge volume on unprotected `main` is how that boundary fails.

**Required planning change:** Merge method (merge commit only) is an owner row. GitGuardian `success` (not `neutral`) is required to merge, not only to tick a Production-provenance report flag. D10 “later, does not block pilot” is incompatible with unattended merge.

---

### M-6 — Least-privilege `GITHUB_TOKEN` matrix is internally contradictory and copies the wrong existing workflow

**Severity:** MAJOR  
**Focus:** least privilege

| Source | Permission set |
| --- | --- |
| `07` | `contents:read`, `issues:write`, `pull-requests:write`, `actions:read` |
| `47.2` AC | “read/write issues and PRs only” |
| `deploy-production.yml` (the repo’s actual Production least-privilege pattern) | workflow-level pin; job-level adds; `id-token` only on inspect |
| `ci.yml` (easy copy-paste source for a new workflow) | **no `permissions:` key** |

Checkout needs `contents:read`. Commenting check-run URLs needs `actions:read`. The story AC as written fails a correct 07 workflow and passes a dangerously defaulted `ci.yml` clone.

Missing explicit forbids: `contents:write`, `actions:write`, `id-token:write`, `packages`, `security-events`, `environments`, `checks:write`. Missing: `persist-credentials: false` as an AC (it is only in 07 prose). Missing: do not pass `GITHUB_TOKEN` into `POST /v1/agents`, `envVars`, or ChatGPT.

**Required planning change:** One matrix, quoted in 07 and 47.2, modeled on `deploy-production.yml` (workflow-level default-deny). 47.1 AC “No workflow YAML yet that holds API keys” must be rewritten: YAML may name secrets; it must never contain values; 47.2 must be allowed to *reference* `CURSOR_API_KEY`.

---

### M-7 — ChatGPT in the control plane is a security-assessment substitution of Epic 45 AD-12

**Severity:** MAJOR  
**Focus:** privilege expansion; audit

Epic 45 AD-12 (final, inherited): Grok 4.6 owns control-plane decisions. Prevents Composer 2.5 owning architecture, security, CI/CD, secrets, billing, authz, review signoff, or merge.

This package restates that in the inherited table and in `09` “Already binding,” then assigns architecture impact assessment, BMAD routing, and “may review” to ChatGPT (FR-2, `04` step 1, spine four-role paradigm). AD-2 “non-authoritative” does not reconcile AD-12. D7 pins the *executor* model. D6 chooses OpenAI API vs human vs none — none of those options is “Grok 4.6 remains the only control-plane advisor.” `02-brief.md` `[ASSUMPTION]` already defines ChatGPT as the OpenAI API.

Security effect: a ChatGPT PR comment can be mistaken for the Grok 4.6 review required by merge-policy point 3, and a ChatGPT impact assessment can classify a Production-path or privilege-expansion diff as routine. That is privilege of assessment without an amendment of AD-12. Outbound source and issue text to OpenAI is also a new data egress (M-1/B-2) with no residency row.

**Required planning change:** Owner either amends AD-12 in a recorded decision, or ChatGPT is removed from architecture assessment, skill routing, and review. Grok 4.6 remains the only merge-policy reviewer either way.

---

### m-1 — Fail-closed missing names is specified; fail-closed extra names is not

**Severity:** MINOR  
**Focus:** secret isolation

AD-3 reuse (`MISSING_SECRET=<NAME>`) is correct for absent `CURSOR_API_KEY`. There is no corresponding `UNEXPECTED_SECRET=<NAME>` if the job’s environment contains `DROPLET_SSH_KEY` or `PROD_*`. Isolation needs both directions.

### m-2 — Artifact download and milestone “spot-check” are not an evidence control

**Severity:** MINOR  
**Focus:** audit; secret isolation

FR-18 / Epic 45 AD-4: no secret values in artifacts. 47.4 “No control-plane log contains secret values (spot-check)” is a human glance, not a contract. Cursor artifact download (presigned URL) is in FR-12 and not in any AC. Screenshots of terminals are how keys leak.

### m-3 — `startingRef` defaults to `main` with no ref allowlist

**Severity:** MINOR  
**Focus:** Production isolation; least privilege

`07`: defaults to `main` unless the task names an approved feature branch. No AC that `startingRef` is `main` or `cursor/*` only. Combined with `workOnCurrentBranch` (B-4) this is the direct-push path; even without it, an arbitrary ref can be a force-push target the agent then PRs from.

### m-4 — Governance mermaid seats ChatGPT on the approve edge

**Severity:** MINOR  
**Focus:** privilege expansion

`PO -->|approve / refuse| CG` reads as the owner approving ChatGPT rather than approving ChatGPT’s outputs. Downstream readers will treat ChatGPT as a gated authority instead of an advisor.

### m-5 — Key material in workflow YAML AC is ambiguous

**Severity:** MINOR  
**Focus:** webhook/API key handling

47.1: “No workflow YAML yet that holds API keys.” Values must never be in git. Names must appear in 47.2. As written the AC is either trivial or it forbids the dispatcher from referencing `CURSOR_API_KEY`.

---

### n-1 — Spine altitude `feature` for a credential-bearing control program

**Severity:** NIT

Epic 45/46 spines are `altitude: epic`. ADCP will hold a key that can launch writers against `main`. `feature` understates blast radius.

### n-2 — Option A comparison row “Security: Environment-scoped keys; no droplet SSH”

**Severity:** NIT

True as far as it goes, and it hides B-2/B-4. “No droplet SSH in Cursor” is Epic 45 AD-1; it is not a complete security comparison with Option C.

---

## What is not a finding

- Not writing `sprint-status.yaml`, not creating Environments/keys, not dispatching Production, not editing Epic 46 stories in this planning pass. Those constraints were kept.
- Owner-creates-keys, not `uat` / not `production`, `persist-credentials: false`, fail-closed missing **names**, evidence-should-be-names-only. Correct instincts; they are not a design (B-2).
- Option B deferred as privilege expansion (D9). Correct instinct; inbound webhook HMAC is still missing (M-1).
- Pilot target “docs-only / test-only” and Production NO-GO language. Consistent with Epic 46 AD-13. Not a substitute for halt-set and invocation ACL.
- Cursor API v1 webhook assumption tagged `[ASSUMPTION]`. Fine; the command channel that remains is still B-1/M-1.
- Structural seed listing `adcp-dispatch.yml` only after owner approval. The stories still encode Option A (out of this review’s implementation-readiness scope except where that encoding is a silent privilege decision — see B-1/M-3).

## Residual risk if the owner signs D1–D10 as written

A GitHub Actions job with write access to issues/PRs, a Cursor API key (possibly the owner’s user key), comment- and label-triggered dispatch, and optional cron, on a repository whose `main` is unprotected, would be authorized to run executors that can merge under the 14-point policy and auto-deploy UAT. That key can inject `envVars`, manage Cursor secrets, and — if `workOnCurrentBranch` is ever set — push to `main` directly. The halt script would not see edits to the dispatcher, to `ci.yml`, to UAT isolation, or to this spine. ChatGPT, not Grok 4.6, is documented as the architecture assessor. Environment `control-plane` is one mistaken `environment:` line away from the Production secret store, or one unprotected Environment away from PR exfiltration. Signing the register as currently drafted would adopt that system.

## Gate for a re-review

Re-review only after the **planning package** is rewritten so that:

1. Invocation is `workflow_dispatch` + human allowlist; agents cannot `/adcp run`; dedicated service-account identity; Environment required reviewers exist as a D-row **before** D5.
2. Secret isolation is an allowlist plus owner inventory of repo/org secrets plus an explicit forbid of `envVars` / Cursor secrets APIs / MCP env / key-forwarding; Environment name cannot be read as Epic 46’s Production control plane.
3. Halt glob covers this spine, all workflows, UAT isolation, merge policy, `_bmad/custom/`, Epic 46 paths, and **post-launch** PR diffs; NFR-2 and merge method are consistent with UAT auto-deploy.
4. Cursor API surface is pinned (this repo only; no `workOnCurrentBranch`; no webhook enablement without HMAC secret class).
5. One audit schema satisfying NFR-3 with actor + every verb; FR-19 has an AC; D5 cannot precede the privilege-expansion decision; Epic 45 AD-12 is obeyed or explicitly amended.

Until then: **FAIL.** Production remains NO-GO. Epic 46 remains independent.

**Do not implement. Do not create secrets. Do not adopt AD-1..AD-10. Owner approval of a rewritten register is required before any later implementation story is in scope.**
