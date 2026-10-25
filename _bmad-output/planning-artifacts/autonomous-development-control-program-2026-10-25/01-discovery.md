---
title: ADCP repository discovery
status: draft
created: 2026-10-25
evidence_class: independently-inspected
---

# Phase 1 — Repository and BMAD discovery

Sources are named. Skill and workflow names below are copied from the installed catalog, not invented.

## 1. Installed BMAD workflows and skills

Catalog: `_bmad/_config/bmad-help.csv` (BMad Method 6.9.0, `_bmad/bmm/config.yaml`).

**Required planning/solutioning sequence (catalog `required=true`):**

1. `bmad-prd` (Create Edit and Review PRD)
2. `bmad-architecture` (Architecture spine)
3. `bmad-create-epics-and-stories`
4. `bmad-check-implementation-readiness`
5. `bmad-sprint-planning`
6. `bmad-create-story` (create)
7. `bmad-dev-story`

**Implementation loop already locked for Cohestra:**

- `bmad-code-review` + `_bmad/custom/mandatory-code-review-loop.md`
- `bmad-checkpoint-preview`
- `bmad-sprint-status`
- `bmad-retrospective`
- `bmad-correct-course`

**Analysis / advisory skills actually installed:** `bmad-investigate`, `bmad-brainstorming`, `bmad-market-research`, `bmad-domain-research`, `bmad-technical-research`, `bmad-product-brief`, `bmad-prfaq`, `bmad-ux`, `bmad-spec`, `bmad-forge-idea`, `bmad-document-project`, `bmad-generate-project-context`, `bmad-quick-dev`, `bmad-help`, `bmad-party-mode`, `bmad-customize`.

**Review skills:** `bmad-review-adversarial-general`, `bmad-review-edge-case-hunter`, `bmad-editorial-review-prose`, `bmad-editorial-review-structure`.

**Test Architecture Enterprise:** `bmad-teach-me-testing`, `bmad-testarch-test-design`, `bmad-testarch-framework`, `bmad-testarch-ci`, `bmad-testarch-atdd`, `bmad-testarch-automate`, `bmad-testarch-test-review`, `bmad-testarch-nfr`, `bmad-testarch-trace`.

**CIS:** `bmad-cis-innovation-strategy`, `bmad-cis-problem-solving`, `bmad-cis-design-thinking`, `bmad-cis-storytelling`.

**Team overrides (real files in `_bmad/custom/`):** `bmad-agent-dev.toml`, `bmad-checkpoint-preview.toml`, `bmad-code-review.toml`, `bmad-correct-course.toml`, `bmad-create-story.toml`, `bmad-dev-story.toml`, `bmad-generate-project-context.toml`, `bmad-quick-dev.toml`, `bmad-retrospective.toml`, `bmad-sprint-status.toml`, `config.toml`, `mandatory-code-review-loop.md`.

Authoritative routing allowlist for this program is `_bmad/_config/bmad-help.csv` **union** `_bmad/custom/*.toml` skill names. `.agents/skills/` may contain additional installed skills (for example CIS personas and `bmad-tea`); they are legal only if they also appear in that union. Discovery does not claim the CSV is exhaustive of the disk.

There is **no** installed skill named “ChatGPT orchestrator”, “Cursor Cloud dispatcher”, or “ADCP”. Those would be new.

## 2. Architecture and planning artifacts already established

| Artifact | Status | Relevance |
| --- | --- | --- |
| `_bmad-output/project-context.md` | complete (2026-09-05) | Brownfield stack and agent rules |
| `architecture-cohestra-enterprise-2026-07-15` | final | Tenant isolation, Platform Admin claim |
| `architecture-cohestra-epic-45-2026-10-15` | final | Control / execution / evidence planes |
| `architecture-cohestra-epic-46-2026-10-19` | final | Two-plane Production; SHA provenance |
| `epics-autonomous-delivery.md` | approved 2026-10-15 | Epic 45 (done) |
| `autonomous-delivery-loop.md` | ACTIVE for non-prod/UAT | Existing loop |
| `autonomous-merge-policy.md` | APPROVED 2026-10-15 | UAT/non-prod merge only |
| `epics-production-launch-readiness.md` | Epic 46 in-progress | Must not be disrupted |
| `sprint-status.yaml` | live tracker | Highest epic **46**; no epic 47 |

## 3. GitHub branching, CI, review, security

Independently inspected:

- Workflows: `.github/workflows/ci.yml`, `deploy.yml` (Environment `uat`), `deploy-production.yml` (`workflow_dispatch` from `main` only), `inspect-production-oidc.yml`.
- CI jobs: .NET build/test, API integration, Next.js, UAT isolation contracts, Docker smoke. GitGuardian app check is attached to PRs; Layer B requires `conclusion == success`.
- `main` is **not** branch-protected (`protected: false`). No repository rulesets. No `CODEOWNERS`. Squash and rebase are allowed.
- Environment `production` has required reviewers + custom branch policy. Environment `uat` has no protection rules.
- Provenance: `deploy/validate-production-provenance.sh` — two-parent merge, GitGuardian SUCCESS on `${deploy_sha}^2`.
- Branch naming used by Cloud Agents: `cursor/<slug>-<id>`.

## 4. Cursor rules, hooks, agent instructions

Independently inspected:

- Repo-root `AGENTS.md` and `web/AGENTS.md` / `web/CLAUDE.md`.
- `_bmad-output/project-context.md` (LLM rules).
- `_bmad/custom/mandatory-code-review-loop.md`.
- **No** `.cursor/` directory, **no** Cursor hooks, **no** `.cursorrules` in this repository.
- Cloud Agent environments exist as a Cursor product feature (this run used them); they are not encoded as repo hooks.

## 5. Repository architecture and deployment boundaries

- Modular monolith: `Cohestra.sln` (.NET 9 API + Application/Domain/Infrastructure/Contracts) and `web/` (Next.js 16).
- Planes: Development; UAT (`cohestra-uat`, shared host, Environment `uat`); dedicated Production (`cohestra-production`, Environment `production`).
- Cursor must not hold droplet SSH (Epic 45 AD-1). Production dispatch is owner-gated (Epic 46).
- Jobs stay in the API process. No second worker service.

## 6. Existing product and release governance

Already approved and still binding:

- Product Owner is the only Production/live authority.
- Autonomous merge applies to **non-production / UAT** when the 14-point policy holds.
- Owner gates: missing protected secret **names**, new external credentials, Production cutover, live Paddle/money, Production DNS/TLS, privilege expansion, ambiguous material product decisions.
- Story DONE requires SPEC, IMPLEMENTATION, BUILD, TESTS, BMAD CODE REVIEW (0 BLOCKER/MAJOR), PRODUCT ACCEPTANCE, UX where applicable, CI, and FINAL HEAD REVIEW on the same HEAD — then post-merge `main` verification.
- Grok 4.6 owns architecture/security/CI/CD/review. Composer 2.5 is light-only. Auto routing disabled.

## Gap this program must fill

Epic 45 automated **UAT deploy and evidence**. It did **not** define:

- ChatGPT as a durable engineering orchestrator
- programmatic Cursor Cloud Agents API dispatch
- architecture-change detection and ADR enforcement
- milestone reporting that separates verified evidence from agent claims
- a control-plane environment for Cursor/ChatGPT API keys

Those gaps are this program. They are not an Epic 46 change.
