---
story: 45.5
head: 8b66b53a54a3565f394c387b1d57a6f82333af93
reviewer: grok-4.6
date: 2026-10-15
---

# Exact-HEAD review — 45.5 `8b66b53a`

## Layers

- Blind hunter: no droplet SSH; `contents: read` unchanged; mailbox names already listed on Environment `uat`; no new Actions permission.
- Edge cases: missing names fail closed; personal inbox refused; unrelated To address ignored; OTP not archived; IMAP errors log exception type only.
- Acceptance: dedicated IMAP is the proposed provider; Playwright skips without secrets; live OTP remains gated on owner-populated names.

## Findings

| Sev | Finding | Disposition |
| --- | --- | --- |
| BLOCKER | none | — |
| MAJOR | none | — |
| MINOR | Signup Playwright path cannot assert a session until mailbox names exist and the live form is exercised | accepted — skip-if-missing; 19.3 Layer B completes the path |
| NIT | IMAP searches newest 20 inbox messages | accepted for dedicated UAT mailbox |

## Privilege

Wiring already-documented Environment `uat` names into the existing `environment: uat` job is not a privilege expansion.

## Verdict

PASS — BLOCKER=0, MAJOR=0 on exact HEAD `8b66b53a`.
