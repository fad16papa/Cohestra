---
title: Autonomous Development Control Program
status: draft
created: 2026-10-25
updated: 2026-10-25
production: NO-GO
epic_46: untouched
proposed_epic: OWNER_GATE (next unused number is 47; stories use ADCP-P* until D2)
---

# Autonomous Development Control Program

Planning-only package. No application code, GitHub settings, secrets, or Epic 46 files were changed.

**STOP AT OWNER_GATE.** Architecture and infrastructure choices in this folder are proposals.

| Artifact | Role |
| --- | --- |
| [01-discovery.md](./01-discovery.md) | Repository / BMAD / GitHub / Cursor evidence |
| [02-brief.md](./02-brief.md) | Product brief |
| [03-prd.md](./03-prd.md) | Requirements (capabilities, not implementation) |
| [04-governance.md](./04-governance.md) | Authority matrix and ADR rules |
| [05-orchestration-options.md](./05-orchestration-options.md) | GitHub-native vs dedicated orchestrator |
| [architecture/ARCHITECTURE-SPINE.md](./architecture/ARCHITECTURE-SPINE.md) | Invariants (proposed ADs) |
| [06-milestone-reports.md](./06-milestone-reports.md) | Mandatory report templates |
| [07-implementation-proposal.md](./07-implementation-proposal.md) | Sequence, pilot, risks |
| [08-epics-and-stories.md](./08-epics-and-stories.md) | Proposed story breakdown |
| [09-owner-decision-register.md](./09-owner-decision-register.md) | Owner-selected direction versus explicit architecture/security approval gates |
| [10-architecture-amendment-proposal.md](./10-architecture-amendment-proposal.md) | Architecture amendment packet A1–A6 (PROPOSED, not adopted) |
| [11-solo-owner-governance-proposal.md](./11-solo-owner-governance-proposal.md) | Permanent sole-owner approvals and secure unattended-path constraints (PROPOSED) |
| [12-exact-owner-security-review-packet.md](./12-exact-owner-security-review-packet.md) | Exact branch/Environment/permissions review packet (PROPOSED) |
| [13-review-bootstrap-model-integrity.md](./13-review-bootstrap-model-integrity.md) | Independent Grok review start / unverified helper-model hard blocker and owner decision (PROPOSED) |
| [14-code-review-security-loop.md](./14-code-review-security-loop.md) | Owner-approved CAT-SEC methodology: cataloged BMAD code review + security, fix/test/re-review loops; execution still gated |
| [15-d17-verification-options-and-tests.md](./15-d17-verification-options-and-tests.md) | Source-verified D17 model-integrity alternatives, tests and owner decision packet (PROPOSED only) |

Baseline for this branch: `main` `e962c8c3eead953a1f56f2b397b3e9d4fc669041`.

## Current architecture reconciliation status

Owner selected GitHub-native orchestration as the **pilot direction**, but has **not adopted AD-1..AD-10** or authorized production, credentials or live agent dispatch. The draft package now separates controlled pilot from future fully event-driven autonomy, requires Grok 4.6 on all engineering runs, preserves human Product Owner architecture authority and requires protection of privileged GitHub workflows before any secret-backed run.

This planning PR remains a draft and cannot be merged or called implementation-complete based solely on a successful CI run. **Independent current-HEAD Grok 4.6 BMAD adversarial, edge-case and security reviews are still required**, followed by explicit owner architecture decisions. Historical first-pass FAIL reviews remain historical evidence.

