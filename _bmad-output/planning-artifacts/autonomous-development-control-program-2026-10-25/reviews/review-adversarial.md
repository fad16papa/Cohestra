---
title: Adversarial review — Autonomous Development Control Program planning package
status: fail
reviewer: bmad-review-adversarial-general
date: 2026-10-25
subject: _bmad-output/planning-artifacts/autonomous-development-control-program-2026-10-25/
baseline_claimed: main e962c8c3eead953a1f56f2b397b3e9d4fc669041
production: NO-GO
epic_46: must remain untouched
verdict: FAIL
unresolved_blockers: 4
unresolved_majors: 8
---

# Adversarial review — ADCP planning artifacts

**Verdict: FAIL.** Do not adopt AD-1..AD-10. Do not assign an epic number. Do not implement. Owner decisions D1–D10 remain unsafe to sign until the BLOCKER findings are rewritten.

This is a planning-package review, not a code review. Severity follows `_bmad/custom/mandatory-code-review-loop.md`: BLOCKER includes security issues and architectural violations with meaningful risk; unresolved BLOCKER or MAJOR blocks close.

## Scope read

| Artifact | Read |
| --- | --- |
| `README.md` | yes |
| `01-discovery.md` | yes |
| `03-prd.md` | yes |
| `04-governance.md` | yes |
| `05-orchestration-options.md` | yes |
| `architecture/ARCHITECTURE-SPINE.md` | yes |
| `07-implementation-proposal.md` | yes |
| `08-epics-and-stories.md` | yes |
| `09-owner-decision-register.md` | yes |
| `02-brief.md`, `06-milestone-reports.md` (supporting) | yes |

Checked against: `_bmad/_config/bmad-help.csv`, `.agents/skills/`, Epic 45 spine (final), Epic 46 spine (final), `autonomous-merge-policy.md` (APPROVED 2026-10-15), `epic-46/production-security-model.md`, `sprint-status.yaml` (highest epic 46), `.github/workflows/deploy.yml` / `deploy-production.yml`.

Asked checks: invented BMAD skill names; contradictions with Epic 45/46 inherited ADs; silent architecture adoption; Production secret mixing; missing owner gates; incomplete FR coverage; epic number assigned without owner.

## Verdict in one paragraph

The package is careful about *labels* (`[PROPOSED]`, `OWNER_GATE`, `sprint-status.yaml` untouched) and sloppy about *binding behavior*. Implementation stories already encode GitHub-native dispatch, Environment `control-plane`, and epic **47** while D2/D3/D4/D8 are OPEN. The inherited Epic 45 AD-12 (Grok 4.6 owns control-plane architecture/security/CI/CD/review) is restated, then replaced in practice by ChatGPT. The architecture-halt glob cannot see this program’s own spine or Epic 45 UAT isolation files, so the control that exists to stop silent architecture adoption would not fire on the most likely silent edits. Unattended `/adcp run` / `adcp/task` dispatch is privilege expansion without an actor allowlist. That is not a signable control program.

---

## Findings

### B-1 — Silent architecture adoption: stories and the implementation sequence treat OPEN decisions as already chosen

**Severity:** BLOCKER  
**Check:** silent architecture adoption; missing owner gates; epic number assigned without owner

`09-owner-decision-register.md` leaves D2 (epic number), D3 (orchestrator A/B/C), D4 (Environment name), D6 (ChatGPT invocation), and **D8 (adopt AD-1..AD-10)** OPEN. Governance says `[ADOPTED]` requires `OWNER_APPROVE ADR-<id>`. The spine marks every AD `[PROPOSED]`. README says STOP AT OWNER_GATE.

Then the rest of the package implements the unadopted choices:

- `07-implementation-proposal.md` Dependencies: “Owner decisions **D1–D7** in the register.” **D8 is omitted.** An implementer who followed 07 would build after secret creation and Option A selection without the owner adopting the architecture.
- Spine **AD-4** is written as an invariant: “Pilot dispatch uses GitHub Actions plus the Cloud Agents API.” Structural seed already names `.github/workflows/adcp-dispatch.yml`.
- `08-epics-and-stories.md` Story **47.2** is “GitHub-native dispatcher”; AC requires Environment `control-plane`. There is no story for Option B or C. D3/D4 are thereby decided in the epic breakdown.
- Story IDs are **47.1–47.4** throughout 07, 08, and D6’s recommendation text, while D2 is OPEN and `epic_assignment: OWNER_GATE`.
- `05-orchestration-options.md` heading “**Adopt Option A for the pilot (PROPOSED).**” plus memlog `(decision) Recommend GitHub-native orchestration` records a planner decision as if it were architecture.

This is the failure mode the program claims to prevent: architecture selected by artifact gravity rather than `OWNER_APPROVE`. Labeling `[PROPOSED]` does not cancel a story file that only has one topology.

**Required fix:** Implementation depends on D1+D3+D4+**D8** (and D2 before any `N.n` story ids). Stories must be numbered with a placeholder (`ADCP.1` / `EPIC-TBD.1`) until D2 is signed. Option A may be recommended, not encoded as the only epic path.

### B-2 — Architecture-halt glob cannot detect silent edits to this program, UAT isolation, or methodology overrides

**Severity:** BLOCKER  
**Check:** silent architecture adoption; incomplete FR coverage (FR-15, NFR-5); contradictions with Epic 45/46

FR-15 and AD-6 halt on “architecture-path changes.” `04-governance.md` defines the path set as:

- `_bmad-output/planning-artifacts/architecture/**`
- Production compose / `deploy/production-*.sh` / `deploy/validate-production-*.sh`
- `.github/workflows/deploy-production.yml` and provenance scripts
- `ProductionSecurityValidator`, tenant filters, recaptcha/CORS/JWT/Paddle guards
- GitHub Environment names, required reviewers, or secret classes

Story 47.1 AC only fixtures `docker-compose.production.yml` “or an architecture spine” and `web/lib/plan-limit-utils.test.ts`.

**Not in the halt set**, and therefore silently editable by a dispatched agent:

| Path | Why it matters |
| --- | --- |
| `.../autonomous-development-control-program-2026-10-25/architecture/ARCHITECTURE-SPINE.md` | This program’s ADs. Glob is `planning-artifacts/architecture/**`, not `**/ARCHITECTURE-SPINE.md`. |
| `autonomous-merge-policy.md` | Binding UAT merge authority. |
| `_bmad/custom/**` including `mandatory-code-review-loop.md` | Cohestra’s actual close gate. |
| `.github/workflows/deploy.yml`, `docker-compose.uat.yml`, `deploy/remote-deploy.sh`, UAT guards | Epic 45 UAT isolation. NFR-5 says must not weaken it. |
| `.github/workflows/ci.yml` | TenantIsolation / GitGuardian Layer A. |
| `_bmad-output/project-context.md` | Agent rules. |
| `epics-production-launch-readiness.md`, `46-*` story files | AD-10 / FR-8 isolation is a prose rule, not a halt path. |

The program’s purpose is to stop silent architecture adoption. As specified, an agent can amend ADCP AD-4 from `[PROPOSED]` to `[ADOPTED]`, weaken UAT isolation, or strip the mandatory review loop, and 47.1’s halt script would exit 0.

**Required fix:** Halt set is the union of (a) every `ARCHITECTURE-SPINE.md`, (b) merge policy, (c) `_bmad/custom/`, (d) UAT *and* Production deploy/compose/provenance, (e) Environment/workflow privilege files, (f) Epic 46 story/spine paths. 47.1 ACs must include a fixture that touches *this* spine and `deploy.yml`.

### B-3 — ChatGPT is seated in the control plane in contradiction of binding Epic 45 AD-12

**Severity:** BLOCKER  
**Check:** contradictions with Epic 45/46 inherited ADs

Epic 45 AD-12 (final, inherited here): Grok 4.6 owns control-plane decisions. Prevents Composer 2.5 owning architecture, security, CI/CD, secrets, billing, authz, review signoff, or merge. Primary model is Grok 4.6. Auto disabled.

This package restates that invariant in the spine inherited table, in discovery §6, and in `09` “Already binding — Grok 4.6 owns architecture/security/review.” It then assigns the same jobs to ChatGPT:

| Job | Epic 45 AD-12 | ADCP |
| --- | --- | --- |
| Architecture impact assessment | Grok 4.6 | FR-2 / governance step 1: ChatGPT writes it |
| BMAD routing | Grok 4.6 BMAD loop | FR-2 / FR-5: ChatGPT recommends the skill |
| Review commentary | Grok 4.6 `bmad-code-review` is the merge-policy reviewer | FR-2 ChatGPT “may review”; governance “May comment” |
| Control-plane paradigm | Cursor + BMAD + Grok 4.6 plan/review/decide | Spine: “Four-role control plane” with ChatGPT as Advisor |

AD-2 only says ChatGPT is “non-authoritative.” That does not reconcile AD-12. D7 only pins the *executor* model. D6 chooses OpenAI API vs human session vs none — none of those options is “Grok 4.6 remains the only control-plane advisor.” `02-brief.md` [ASSUMPTION] already defines ChatGPT as the OpenAI API.

A later reader can treat a ChatGPT PR comment as the Grok 4.6 review required by autonomous-merge-policy point 3 (“exact final HEAD received Grok 4.6 code review”). The package never forbids that substitution.

This is a silent amendment of a binding inherited AD, which AD-1 claims only the Product Owner may make.

**Required fix:** Either (a) an explicit owner decision that amends Epic 45 AD-12 to allow ChatGPT as advisor with Grok 4.6 remaining the only merge-policy reviewer, or (b) remove ChatGPT from architecture assessment, skill routing, and review. Do not inherit AD-12 and then ignore it.

### B-4 — Unattended dispatch is control-plane privilege expansion without an actor allowlist or a dedicated owner gate

**Severity:** BLOCKER  
**Check:** missing owner gates; Production/UAT mutation risk; FR-14/FR-19

`autonomous-merge-policy.md` (APPROVED) still owner-gates:

- new GitHub Actions write permissions
- expanded Environment secrets / additional secret classes
- broadening destructive infrastructure capability

Option A (`05`) triggers on `workflow_dispatch`, **`issues` labeled `adcp/task`**, **`issue_comment` (`/adcp run`)**, and optional `schedule`. `07` gives that job `issues:write` and `pull-requests:write`. Discovery already recorded: `main` is **not** branch-protected; squash and rebase allowed; no CODEOWNERS.

There is no D-row for:

- who may apply `adcp/task` or comment `/adcp run`
- whether a Cursor agent may re-comment `/adcp run` on its own issue (self-dispatch; FR-14 forbids infinite self-dispatch; 47.2 has no AC)
- whether the Cursor identity is a dedicated service account (Epic 45 AD-10) or the owner’s personal API key (`07` allows either)
- spend/retry budget as an owner-authorized cap
- required reviewers on the new Environment (spine defers this; not in the register)

D3 “pick A/B/C” is not a privilege-expansion approval. D5 creates keys after D1+D3+D4, still without D8 and without an invocation ACL. Combined with `04` allowing “UAT-path merge when policy holds” and Epic 45 auto-deploy of `main` via `deploy.yml`, a labeled issue from any collaborator (or a looping agent comment) can launch an executor that merges to `main` and mutates UAT. NFR-2 (“orchestrator failures must not leave Production or UAT in a mutated state”) is already false for the *success* path.

**Required fix:** Dedicated owner decisions for invocation ACL (human allowlist; agents cannot `/adcp run`), dedicated automation identity (no owner personal Cursor key), GHA permission set, Environment protection, and a self-dispatch contract test. Remove `issue_comment` from the pilot or make it `workflow_dispatch`-only until that gate exists.

---

### M-1 — Three incompatible BMAD closed-sets; FR-5 cannot route the required planning sequence

**Severity:** MAJOR  
**Check:** invented BMAD skill names; incomplete FR coverage (FR-5)

Discovery claims skill names are “copied from the installed catalog, not invented.” Invented names such as “ChatGPT orchestrator” are correctly rejected. The closed-set that *is* specified is still wrong in three places at once:

| Source | Closed set |
| --- | --- |
| FR-5 | `bmad-create-story`, `bmad-dev-story`, `bmad-code-review`, `bmad-sprint-status`, **plus “analysis/planning skills listed in discovery”** |
| Discovery “Analysis / advisory” bullet | investigate, brainstorming, market/domain/technical-research, product-brief, prfaq, ux, spec, forge-idea, document-project, generate-project-context, quick-dev, help, party-mode, customize |
| AD-9 | `_bmad/_config/bmad-help.csv` **or** `_bmad/custom/` |
| Story 47.1 AC | names absent from **`bmad-help.csv` only** |

Consequences:

- Read FR-5 narrowly and the orchestrator **must refuse** `bmad-prd`, `bmad-architecture`, `bmad-create-epics-and-stories`, `bmad-check-implementation-readiness`, `bmad-sprint-planning`, `bmad-checkpoint-preview`, `bmad-correct-course`, `bmad-retrospective` — the required sequence discovery itself listed.
- Discovery’s “actually installed” analysis list omits catalog skills `bmad-qa-generate-e2e-tests`, `bmad-agent-tech-writer`, `bmad-index-docs`, `bmad-shard-doc`.
- `.agents/skills/` also has CIS agent personas and `bmad-tea` that are not in the CSV; 47.1 would refuse them even if a human asked.
- 47.1 vs AD-9: team overrides in `_bmad/custom/` are legal per AD-9 and illegal per the story AC.

This is not an invented-name scandal. It is a broken routing contract. A “closed set” that disagrees with itself will either invent refusals of real skills or accept names the PRD forbids.

**Required fix:** One authoritative allowlist: `bmad-help.csv` union `_bmad/custom/*.toml` skill names. FR-5, AD-9, discovery, and 47.1 AC must quote the same rule. Discovery must not claim exhaustiveness it does not have.

### M-2 — FR coverage map is a grouping fiction; several FRs have no acceptance test

**Severity:** MAJOR  
**Check:** incomplete FR coverage

`08` maps FR-1..21 onto four stories. The ACs do not carry the FRs:

| FR | Claimed story | What the AC actually tests | Gap |
| --- | --- | --- | --- |
| FR-1 owner authority | 47.1 | halt script + skill router | No owner-authority contract |
| FR-2 ChatGPT cannot dispatch Production / adopt ADR | 47.1 | none | No negative test |
| FR-3 execute only inside approved story | 47.1 | none | — |
| FR-4 impact assessment + `OWNER_APPROVE` + ADR before resume | 47.1 | halt exit code only | No phrase/ADR check |
| FR-6 no implement without story / explicit `bmad-quick-dev` | 47.1 (via FR-5..8) | none | **Uncovered** |
| FR-7 mandatory code-review loop is the close gate | 47.1 | none | **Uncovered**; 06 completeness rule requires it, 47.3 does not |
| FR-8 Epic 46 isolation | 47.1 | “Epic 46 files unchanged” for *this* story | Not a durable detector |
| FR-10 `cursor/<slug>-<id>` + draft PRs | 47.2 | none | **Uncovered** |
| FR-11 exact PR number + SHA + CI URL | 47.3 | SHA **or** CI URL | PR number missing; `or` not `and` |
| FR-12 create, follow-up/steer, get, cancel, list artifacts | 47.2 | create/poll/cancel | steer + artifacts missing |
| FR-13 ChatGPT on-demand | 47.2 (implied) | none | — |
| FR-14 retry budget + timeout + escalate | 47.2 | timeout cancel only | retry budget and PO escalate **Uncovered** |
| FR-15 full material path set | 47.1 | two fixtures | See B-2 |
| FR-17 agents must not *receive* Production secrets | 47.2 | workflow YAML does not *name* `PROD_DROPLET_*` as required | Cursor Cloud environment / repo secrets / outbound ChatGPT payloads unaddressed |
| FR-18 evidence never contains secrets | 47.3 / 47.4 | 47.4 “spot-check” in 07 only | **Uncovered** in ACs |
| FR-19 privilege expansion is an owner gate | 47.2 | none | **Uncovered** |
| NFR-3 audit of dispatch/follow-up/cancel/owner decision | — | not mapped | 04 audit record vs 47.3 fields disagree |
| NFR-5 UAT isolation / Epic 46 provenance | 47.4 | Production compose untouched | No squash-merge ban; no UAT-guard AC |

`06-milestone-reports.md` refuses `MILESTONE=complete` without BMAD review evidence on that HEAD. Story 47.3 only fails without “40-hex SHA or CI URL.” The template and the story already disagree.

### M-3 — Production/UAT secret mixing is not actually designed; the denylist is a single prefix

**Severity:** MAJOR  
**Check:** Production secret mixing; FR-16, FR-17, Epic 45 AD-2, Epic 46 AD-6

Correct instincts: new Environment, not `uat`, not `production`; owner creates keys; persist-credentials false. Insufficient engineering:

1. **Name collision with Epic 46’s control plane.** Epic 46 spine: “GitHub Actions plus Environment `production` is the control plane.” `05` then says Option A “Reuses GitHub as the already-adopted control plane (Epic 45/46).” An implementer who takes that sentence literally puts `CURSOR_API_KEY` on Environment `production`. Proposed name `control-plane` makes the collision worse.
2. **GitHub secret inheritance is unmentioned.** A job with `environment: control-plane` still receives **repository** and **organization** secrets. Epic 45 AD-2 exists to stop repo-level production-shaped secrets; this package never inspects whether any remain, and never requires the control-plane workflow to run with an explicit empty/deny allowlist.
3. **47.2 denylist is `PROD_DROPLET_*` and “Production host `.env` names.”** Live mixing names from `production-security-model.md` and the workflows include `DROPLET_SSH_KEY` (UAT), Paddle live keys, SendGrid, JWT signing key, Redis password, recaptcha, backup keys, `PROD_PUBLIC_BASE_URL`. A workflow can `${{ secrets.DROPLET_SSH_KEY }}` or `${{ secrets.PROD_DROPLET_SSH_KEY }}` and still pass the written AC if Environment `production` is not attached — or fail closed only if those secrets are environment-scoped. The contract test as specified does not encode that model.
4. **FR-17 is about what agents receive**, not what the workflow YAML names. Cursor Cloud Agents clone the repo under a Cursor-issued GitHub token and whatever secrets exist in the **Cursor Cloud environment**. This package never says those dashboard/environment secrets are in scope. `07` “Never `startingRef` a Production host checkout” is a category error (`startingRef` is a git ref).
5. **Outbound ChatGPT payloads** are not redacted. Issue bodies and diffs sent to OpenAI can contain secrets if an agent committed them. FR-18 only cites Epic 45 AD-4 for evidence artifacts.

**Required fix:** Rename the Environment to something that cannot be read as Epic 46’s Production control plane (e.g. `adcp-secrets`). Deny-list every Production and UAT secret *name* from the existing workflows and the 46.9 audit list. State that repository/org secrets must not be readable by the ADCP job (explicit `secrets:` whitelist of `CURSOR_API_KEY` / optional ChatGPT key only). State that Cursor Cloud environments used for ADCP have no Production/UAT secrets. Redact outbound advisor payloads.

### M-4 — Inherited Epic 46 AD-7 (two-parent provenance) is restated and then left unenforceable

**Severity:** MAJOR  
**Check:** contradictions with Epic 45/46 inherited ADs; NFR-5

Spine inherit: “This program must not squash Production-bound history.” Discovery: `main` allows squash and rebase; no branch protection. Merge policy does not specify merge method. No story AC forbids squash/rebase of ADCP PRs. Any ADCP-merged SHA that later becomes a Production deploy target fails Epic 46 Layer A/B (`merge_commit_sha == deploy_sha`, GitGuardian on `${deploy_sha}^2`).

Story 47.3 only says GitGuardian `neutral` cannot satisfy a Production-provenance complete flag — a reporting rule, not a merge-method rule. Increasing unattended merge volume on an unprotected `main` is how provenance breaks.

### M-5 — Epic 45 AD-9 (stop only at real owner gates) is widened into a new owner-gate catalog without an amendment

**Severity:** MAJOR  
**Check:** contradictions with inherited ADs; missing owner gates

Epic 45 AD-9: test failures, container health, and review MAJOR findings are **not** owner gates. Fix and re-run.

`05` loop termination escalates to the Product Owner on retry exhaustion, wall-clock timeout, BMAD BLOCKER/MAJOR after three cycles, GitGuardian not success, missing secret names, Production path, privilege expansion.

Timeouts and unresolved review findings becoming owner gates silently amends AD-9. Escalation-as-stop is reasonable; calling it OWNER_GATE is not what AD-9 allows. The register does not ask the owner to amend AD-9.

### M-6 — Missing owner gates beyond B-4

**Severity:** MAJOR  
**Check:** missing owner gates

Present and good: D1 program; D2 epic number; D4 Environment name; D5 key creation; D8 AD adoption; FR-16 creating the Environment.

Absent from the register, and required by merge-policy privilege expansion or inherited ADs:

| Missing gate | Why it is a gate |
| --- | --- |
| GHA permission set (`issues:write`, `pull-requests:write`, `contents:read` vs write) | “new GitHub Actions write permissions” |
| Invocation ACL / label authority | unattended code execution |
| Cursor identity = service account vs owner user key | Epic 45 AD-10 dedicated automation identities |
| Required reviewers on the new Environment | spine deferred; not a D-row |
| Cost/spend cap for Cursor + OpenAI | NFR-4 is “no always-on VM,” not a budget |
| Merge method on ADCP PRs (no squash) | Epic 46 AD-7 |
| Amend Epic 45 AD-12 for ChatGPT | B-3 |
| First live dispatch (47.4) | new external automation on a live key |
| Outbound data to OpenAI (issue text, diffs) | new external-service data flow |
| `schedule` watchdog | standing unattended loop |

D5 prerequisites are D1+D3+D4, not D6 or D8 — keys can be minted before ChatGPT invocation or ADs are decided.

### M-7 — Epic number 47 is assigned in every executable artifact while D2 is OPEN

**Severity:** MAJOR  
**Check:** epic number assigned without owner

The letter of the constraint is kept: `sprint-status.yaml` is not edited; frontmatter says `OWNER_GATE`. The spirit is not. After this planning PR lands on `main`, the repo contains Epic 47 story IDs, an “Epic (proposed 47)” heading, README `proposed_epic: 47`, and D6 text “optional in 47.2.” That is assignment by publication. If the owner picks “other” or “later,” every AC, coverage row, and recommendation is wrong. Cohestra epic files (`epics-production-launch-readiness.md`) use the same `N.n` shape; downstream `bmad-create-story` will follow 47.n.

### M-8 — NFR-2 conflicts with Epic 45 auto UAT deploy; Option A success mutates UAT

**Severity:** MAJOR  
**Check:** contradictions with Epic 45/46; NFR-2

NFR-2: orchestrator failures must not leave Production **or UAT** in a mutated state. Epic 45 FR-45-5 / `deploy.yml`: CI success on `main` deploys UAT. ADCP governance allows UAT-path merge. Therefore a successful ADCP task that merges *does* mutate UAT by design. Failure-after-merge also leaves UAT mid-deploy (Epic 45 already chose not to cancel in-flight deploys). The NFR is either false or it secretly forbids merging, which would contradict FR-3 / the merge policy. Pick one and write it down.

---

### m-1 — Discovery completeness claim is false even where names are real

**Severity:** MINOR  
**Check:** invented BMAD skill names (adjacent)

No fabricated `bmad-*` names were found. The failure is the claim “independently-inspected” + “actually installed” while omitting catalog entries (see M-1). CIS is listed as four workflows; CIS *agent* skills present under `.agents/skills/` are omitted. Team override `bmad-agent-dev.toml` exists; `bmad-agent-dev` is not in the routing discussion.

### m-2 — 07 vs 47.2 permission matrix disagrees

**Severity:** MINOR

`07`: `contents:read`, `issues:write`, `pull-requests:write`, `actions:read`.  
`47.2` AC: “read/write issues and PRs only.”  
Checkout needs `contents:read`. Commenting check-run URLs needs `actions:read`. The story AC as written would fail a correct 07 workflow.

### m-3 — Spine `binds:` frontmatter is a subset of the ADs that follow

**Severity:** MINOR

Spine YAML binds FR-1, FR-2, FR-4, FR-9, FR-12, FR-16, NFR-1. AD-7 binds FR-14, AD-8 binds FR-11/20/21, AD-9 binds FR-5, AD-10 binds FR-8, AD-5 binds FR-19. Downstream traceability that trusts the frontmatter will under-count.

### m-4 — `02-brief` assumption vs D6

**Severity:** MINOR

Brief `[ASSUMPTION]`: “ChatGPT means the OpenAI API.” D6 is OPEN (API / human / none). Assumptions that pre-select an OPEN owner row are soft silent adoption.

### m-5 — 47.1 AC “No workflow YAML yet that holds API keys”

**Severity:** MINOR

Workflow YAML must never hold key *values*; it will hold secret *names*. The AC as written is either trivial (no values in git) or forbids the 47.2 workflow from referencing `CURSOR_API_KEY`.

### m-6 — Material-architecture list uses `architecture/**` but this spine was placed outside that tree

**Severity:** MINOR (root cause of B-2)

Deliberate or not, putting ADCP under `planning-artifacts/autonomous-development-control-program-2026-10-25/architecture/` instead of `planning-artifacts/architecture/` means the documented glob never matched the document that defined it.

---

### n-1 — Spine altitude `feature` for a cross-cutting control program

**Severity:** NIT

Epic 45/46 spines are `altitude: epic`. ADCP claims to bind all future BMAD dispatch. `feature` understates the blast radius.

### n-2 — Governance mermaid `PO -->|approve / refuse| CG`

**Severity:** NIT

The owner does not typically “approve ChatGPT”; the owner approves ChatGPT’s *outputs*. The edge is backwards relative to the matrix.

### n-3 — “Jobs stay in the API process. No second worker service” restated in discovery

**Severity:** NIT

True for the Cohestra runtime (Epic 46 AD-4). Irrelevant to a GitHub Actions orchestrator. Mixing runtime invariants into control-program discovery invites Option B being rejected for the wrong AD.

### n-4 — Ten-section milestone template vs “standard template in 06” wording in FR-20

**Severity:** NIT

Harmless as long as 06 remains the only template. No second template exists today.

---

## Asked-check scorecard

| Check | Result |
| --- | --- |
| Invented BMAD skill names | **No invented `bmad-*` names.** Closed-set is internally contradictory (M-1). Discovery over-claims completeness (m-1). |
| Contradictions with Epic 45/46 inherited ADs | **Yes.** AD-12 (B-3), AD-9 (M-5), AD-7 squash (M-4), AD-10 identity (B-4/M-6), Epic 46 “control plane” = Environment `production` (M-3), NFR-2 vs UAT auto-deploy (M-8). |
| Silent architecture adoption | **Yes, BLOCKER.** D8 skipped in 07; Option A / env name / epic 47 encoded in stories (B-1). Halt glob cannot see this spine or UAT isolation (B-2). |
| Production secret mixing | **Not proposed into Environment `production`, but not actually prevented** (M-3). Name collision + repo-secret inheritance + thin denylist. |
| Missing owner gates | **Yes, BLOCKER + MAJOR.** Unattended dispatch ACL (B-4); permission set, identity, spend, merge method, AD-12 amendment, live pilot (M-6). |
| Incomplete FR coverage | **Yes, MAJOR** (M-2). FR-6, FR-7, FR-10, FR-14 (retry/escalate), FR-18, FR-19, NFR-3 have no AC. |
| Epic number assigned without owner | **Yes, MAJOR** (M-7). Tracker clean; identifiers are not. |

## What is not a finding

- Not writing `sprint-status.yaml` and not editing Epic 46 stories in this planning pass. That constraint was kept.
- Not marking ADs `[ADOPTED]`. The silent-adoption problem is the *stories and 07 sequence*, not the AD status tags.
- Option B deferred as privilege expansion. Correct instinct; D9 exists.
- Pilot target “docs-only / test-only” and Production NO-GO language. Consistent with Epic 46 AD-13.
- Cursor API v1 webhook assumption tagged `[ASSUMPTION]`. Fine.
- Fail-closed `MISSING_SECRET=<NAME>` reuse from Epic 45 AD-3. Correct.

## Residual risk if the owner signs D1–D10 as written

A GitHub Actions job with write access to issues/PRs, a Cursor API key, and comment-triggered dispatch, on a repository whose `main` is unprotected, would be authorized to run executors that can merge under the 14-point policy and auto-deploy UAT — while ChatGPT, not Grok 4.6, is documented as the architecture assessor, and while the halt script would not see edits to this spine or to UAT isolation. Signing the register as currently drafted would adopt that system.

## Gate for a re-review

Re-review only after:

1. D8 is a hard dependency of any implementation story; D2 precedes any `N.n` identifiers.
2. Halt glob covers this spine, UAT isolation, merge policy, `_bmad/custom/`, and Epic 46 paths, with ACs.
3. Epic 45 AD-12 is either obeyed (ChatGPT out of architecture/review) or explicitly amended by the owner.
4. Dispatch is `workflow_dispatch` + human allowlist until a privilege-expansion decision exists.
5. One skill closed-set; FR-to-AC map with no orphan FRs; secret whitelist not a `PROD_DROPLET_*` prefix.

Until then: **FAIL.** Production remains NO-GO. Epic 46 remains independent. This package is not implementation-ready.
