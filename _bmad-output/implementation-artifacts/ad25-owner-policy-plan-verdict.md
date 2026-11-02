---
status: HOLD
owner_control_ready: false
as_of: 2026-11-02T21:10:00+08:00
---

# Verdict — Owner-Policy enforcement implementation planning

**HOLD.** No App installed. No ruleset pin. No Cursor permission change.

| Deliverable | Location |
| --- | --- |
| Cursor permission options | `ad25-cursor-permission-mechanics.md` |
| App architecture + prototype | `ad25-owner-policy-app-implementation.md` + `cohestra-owner-policy-app/` |
| Threat model | `ad25-owner-attestation-threat-model.md` |
| Negative matrix | `ad25-owner-policy-negative-tests.md` (27 local tests OK) |
| Owner rollout A–I | `ad25-owner-policy-rollout.md` |
| Spine | `planning-artifacts/architecture/architecture-ad25-owner-policy-2026-11-02/` |
| CAT-SEC | `ad25-owner-policy-plan-cat-sec.md` |

Unresolved dependencies: owner hosts App; owner PATCHes rulesets; owner mints HMAC secret off Cursor; live T1/T7 probes; optional omit Cohestra from Cursor (breaks Cloud Agents).
