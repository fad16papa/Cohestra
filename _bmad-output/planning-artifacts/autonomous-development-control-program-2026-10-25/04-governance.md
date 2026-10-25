---
title: ADCP governance architecture
status: draft
created: 2026-10-25
---

# Governance architecture

## Authority model

```mermaid
flowchart TB
  PO[Product Owner — final authority]
  CG[ChatGPT — on-demand advisor + orchestrator]
  ORCH[Orchestrator runner — GitHub Actions proposed]
  BMAD[Installed BMAD skills]
  CUR[Cursor Cloud Agent — executor]
  GH[GitHub — source of truth]
  UAT[Environment uat — existing]
  PROD[Environment production — owner only]

  PO -->|approve / refuse| CG
  PO -->|approve architecture and Production| GH
  CG -->|approved task contract + catalog-checked BMAD route| GH
  GH -->|authorized dispatch| ORCH
  ORCH -->|invoke| BMAD
  ORCH -->|POST /v1/agents| CUR
  CUR -->|branch + draft PR| GH
  GH -->|CI / artifacts| ORCH
  GH -->|Deploy UAT after main CI| UAT
  PO -->|workflow_dispatch only| PROD
```

## Responsibility matrix

| Domain | Product Owner | ChatGPT | Cursor / BMAD | GitHub Actions |
| --- | --- | --- | --- | --- |
| Product strategy and functionality | **Decide** | Advise | Execute approved stories | Record |
| System / code / infra / security / data architecture | **Decide + ADR** | Propose alternatives + impact assessment | Halt if material; implement after approval | Protected paths **and semantic review**; fail closed |
| Significant technical decisions | **Decide** | Options + risks | No silent adoption | Audit |
| Routine story implementation | Authorize epic/story and boundaries | Author approved GitHub contracts, select catalog-verified BMAD route, coordinate evidence | Execute under Grok 4.6 | CI and durable state |
| Code review (BMAD) | May override | May comment | `bmad-code-review` required | Exact-HEAD checks |
| UAT deploy | Already automated | Observe | No SSH | Existing `deploy.yml` |
| Production authorization | **Only** | Never | Never | `deploy-production.yml` after owner dispatch |
| Secrets creation | **Only** | Never | Never | Consume Environment secrets |
| Merge to main (UAT/non-prod) | Policy already approved | Advise | Allowed only if 14-point policy holds | N/A |
| Merge / deploy Production | **Only** | Never | Never | Dispatch-only |

## What is “material architecture”

Treat as material (halt) if the change would let two future stories diverge, or if it touches any of:

- `_bmad-output/planning-artifacts/architecture/**`
- this program folder `_bmad-output/planning-artifacts/autonomous-development-control-program-2026-10-25/**`
- `_bmad-output/planning-artifacts/autonomous-merge-policy.md`
- `_bmad-output/planning-artifacts/autonomous-delivery-loop.md`
- `_bmad/custom/**`
- `docker-compose.production.yml`, `docker-compose.uat.yml`
- `deploy/production-*.sh`, `deploy/validate-production-*.sh`, `deploy/validate-uat-*.sh`, `deploy/remote-deploy.sh`, `deploy/uat-*.sh`
- `.github/workflows/**` (including `ci.yml`, `deploy.yml`, `deploy-production.yml`, and any future ADCP dispatcher)
- provenance scripts and `ProductionSecurityValidator`, tenant filters, recaptcha/CORS/JWT/Paddle guards
- GitHub Environment names, required reviewers, or secret classes
- New external vendors, new always-on services, new public ports

Halt is evaluated at **dispatch** (story/changed-path preview) **and again on the exact PR HEAD diff** before milestone completion or merge consideration. **File paths are only the minimum safeguard.** A semantic impact review must also detect material changes to API contracts, tenancy, auth, database schemas, billing, privileges, infrastructure, observability data exposure, and software/system design anywhere in the tree. If the detector or reviewer is unavailable, uncertain, or disagrees with the approved story contract, stop at OWNER_GATE. An executor that adds Production or workflow files after launch still stops.

Routine story UI/API work inside an approved contract is **not** material unless it expands privilege or weakens a gate.

## Required path for material decisions

1. ChatGPT (or the executing agent) writes an impact assessment (template in milestone reports).
2. Product Owner participates (comment, review, or recorded decision).
3. Explicit approval: `OWNER_APPROVE ADR-<id>` (or equivalent recorded phrase).
4. ADR appended to the program spine or a dated ADR file. Status `[ADOPTED]` only after that phrase exists.
5. Implementation may resume on a new HEAD. Prior review is invalid.

## ChatGPT role limits

Inherited Epic 45 AD-12 remains binding: **Grok 4.6 owns architecture, security, CI/CD, and BMAD review signoff.** ChatGPT does not replace that.

**Proposed owner-approved role clarification:** ChatGPT may author task instructions directly in GitHub, choose **catalog-verified** BMAD workflows for already-approved stories, assess PR/CI/security evidence, post technical reviews, coordinate follow-ups when actively invoked and prepare architecture alternatives and risk assessments for the Product Owner. It is **not** the mandatory Grok 4.6 reviewer and may not amend Epic 45 AD-12 without an owner-approved ADR. A standing OpenAI API adviser is a **separate, not-yet-approved design**.

Forbidden: adopting ADRs; claiming Production GO; inventing BMAD skills; storing secrets; instructing Cursor to bypass review; representing ChatGPT feedback as Grok 4.6 review signoff; acting as a continuously running daemon; autonomously deploying Production; approving material design decisions. Existing specific UAT merge policy remains separate; this program grants no new blanket merge authority.

## Cursor / BMAD role limits

Allowed: `bmad-dev-story` / `bmad-quick-dev` inside an approved story; tests; draft PRs; BMAD code review; UAT-path merge when policy holds.

Forbidden: Production dispatch; creating Environments or secrets; editing GitHub protection; weakening fail-closed validators; closing source PRs the owner asked to keep open.

## Audit trail

Minimum record for each dispatched run:

- GitHub issue or PR number that authorized the run
- `github.actor` of the human who labeled, commented, or dispatched
- Orchestrator workflow run URL
- Cursor agent id and run id
- Cursor model ID explicitly requested and availability evidence (Grok 4.6 / `GET /v1/models`); actual runtime usage independently attested or marked unknown
- Immutable task/dispatch idempotency key and retry/cost budget
- Branch and HEAD SHA produced
- CI check-run conclusions (including GitGuardian)
- Follow-ups, steers, and cancels
- Owner decision id if any gate fired

Dispatch is refused unless `github.actor` is on an owner-maintained allowlist. Agents and bots cannot authorize a new run by labeling or commenting. The dispatcher workflow must ignore events it created.

## Least-privilege dispatch job (proposed, D3=A)

Quoted by `07-implementation-proposal.md` and ADCP-P2. Modeled on `deploy-production.yml` workflow-level default-deny.

```yaml
permissions: {}   # workflow default-deny
# job may grant only:
#   contents: read
#   issues: write
#   pull-requests: write
#   actions: read
# forbidden: id-token:write, actions:write, contents:write on main,
#            environment: production, environment: uat
```

Secret **name** allowlist the job may reference: `CURSOR_API_KEY` and optional ChatGPT key. YAML may name those secrets; it must never contain values.

Creating Environment `adcp` without required reviewers is privilege expansion (D4 + D12). Before **any** key-backed live dispatcher, protect `main` and policy/workflow-sensitive changes (D10) and inventory repo/org secret scopes. A same-repo `pull_request` workflow that adds `environment: adcp` after a key exists is in the blast radius; `ci.yml` must not request that Environment. GitHub's optional **prevent-self-review** can prohibit the sole owner from releasing a job they themselves initiated; D4 requires a vetted separate reviewer or an explicitly analyzed owner-approved alternative, without silently disabling protections.

## Execution and privileged-operation policy (PROPOSED)

- `workflow_dispatch` by a GitHub allowlisted human is the **only** pilot trigger. Issue/PR comments and bot events are NOT launch authorization until D11 authorizes and tests their ACL.
- Agent work stays on an isolated draft branch; model ID must be explicitly pinned after authenticated inventory; avoid any fallback, including child/review agents.
- The credential-bearing dispatcher must not use unreviewed PR code, expose Cursor credentials to agents through environment or MCP configuration, or consume `production`/`uat` Environments.
- New privilege scopes, control workflows, secrets, branch/ruleset settings, service accounts, OpenAI API data egress, and semantic architecture changes require owner approval.
- Repo main remains unprotected at the 2026-10-25 baseline; this is a **blocking prerequisite for live credential-backed dispatch**, not deferred pilot debt.
- Existing UAT auto-deploy on main is a potential side effect of merging; the **first pilot cannot merge**. A merge is never Production authorization.
