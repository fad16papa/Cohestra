# Autonomous merge policy

Status: **APPROVED** 2026-10-15 by owner (`APPROVE autonomous-merge-policy`).

Applies to routine **non-production** Cohestra development and UAT pull requests only.

Production/live cutover remains owner-gated.

## Approved rule

Grok 4.6 may autonomously merge a non-production development/UAT PR when **all** are true:

1. Work belongs to an approved story/epic.
2. Requirements are materially unambiguous.
3. The exact final HEAD received Grok 4.6 code review.
4. BLOCKER = 0 and MAJOR = 0 on that exact HEAD.
5. Required exact-head CI is green.
6. Applicable security gates are green.
7. Tenant-isolation gates are green.
8. Migrations are reviewed/tested when present.
9. No production/live mutation.
10. No irreversible customer-data action.
11. No new external financial charge.
12. No live Paddle mutation unless separately authorized.
13. No production DNS/certificate/config mutation.
14. No unresolved secret/bootstrap owner gate exists.

Implementation changes after review invalidate that review. A new exact-HEAD Grok 4.6 review is then mandatory.

Routine CI/UAT failures do not require owner intervention. The loop investigates, repairs, reviews, retests, and continues.

## Control-plane privilege boundary

Even under this policy, **stop for owner authorization** if a change **expands** the agent/control-plane privilege boundary, including:

- new GitHub Actions write permissions
- expanded access to GitHub Environment secrets or additional secret classes
- changing SSH authorized principals / trust scope
- changing GitHub Environment protection rules
- weakening branch protection
- disabling required review/security gates
- enabling production/live credentials
- allowing UAT automation to reach production
- weakening tenant isolation
- weakening reCAPTCHA/security enforcement
- broadening destructive infrastructure capability

Refactoring or hardening an already-approved privilege path does not by itself require another owner gate if privileges are not expanded.

Epic 45's already-described UAT-only execution plane is approved. Production remains excluded.

## Still owner-authorized after approval

- Production/live cutover
- Live Paddle / live money movement
- Production credential activation
- Live DNS / certificate ownership
- Destructive customer-data operations
- New external-service credentials
- Legal/business policy decisions
- Ambiguous material product decisions
- Control-plane privilege expansion (above)
