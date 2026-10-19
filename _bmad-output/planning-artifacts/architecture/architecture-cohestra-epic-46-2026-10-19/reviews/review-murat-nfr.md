---
reviewer: Murat (TEA / NFR)
artifact: Epic 46 planning set
date: 2026-10-19
verdict: PASS for planning / 46.1 start; Production GO is FAIL by design
---

# Murat NFR review — Epic 46 planning

## Verdict

NFR strategy is adequate to start implementation. DR and observability are honestly **not ready** today; the plan refuses to fake them. Security baseline from Epics 13/17/18/44/45 is reusable; Production still needs 46.9. I would fail any story that claims backup readiness without an isolated restore, or Production GO without the cutover phrase.

## Quality attributes

| Attribute | Planning status | Block 46.1? |
| --- | --- | --- |
| Security | Model written; evidence later | No |
| Reliability | `/ready` frozen; SHA chain specified | No |
| Observability | Architecture written; code missing | No |
| DR | Strategy written; restore unproven | No (blocks 46.14 backup=PASS) |
| Performance | Measure-don't-invent | No |
| Evidence honesty | Missing = FAIL | No |

## Findings

### Blocker (for Production GO, not for planning)

- No isolated restore proof
- No OTel pipeline
- No Production Environment
- No dedicated droplet
- Cutover not authorized

These are correctly represented as stories + NO-GO, not as green checkmarks.

### Major (must not be lost in stories)

1. **Collector failure must not take down the API** — present in 46.6 AC. Keep it.
2. **Alert noise** — matrix has consecutive-check and ratio+volume guards. 46.7 must not page INFO.
3. **PII in logs** — SendGrid `{ToEmail}` is a known leak; 46.6 AC addresses it. Do not ship OTel that exports request bodies.
4. **Load tests on production DNS** — forbidden until there are no customers, and still discouraged. 46.12 AC is correct.
5. **Redis unavailability** — fail-closed 503 is existing; Production Redis password is new. 46.4/46.9 must not introduce fail-open.

### Minor

- RPO 24h vs 1h two-phase is honest; do not advertise 1h early.
- Hypercare 14 days is an assumption; owner may change duration without a new epic.

## Test design notes

- Add a compose contract test: Production file must not publish 5432/6379 (mirror UAT `validate-uat-isolation.sh`).
- Add a workflow contract test: Production workflow must use `environment: production` and must not trigger on every `main` CI the way UAT does.
- Keep TenantIsolation required.
- `bmad-testarch-nfr` evidence audit belongs after 46.6/46.5/46.9 produce artifacts — not in this planning pass.

## Independence

UAT Playwright must not be retargeted at `cohestra.app`. Separate evidence names.

## Production

**NO-GO**
