# Reviewer — adversarial divergence

Verdict: pass after AD-3/AD-4/AD-7/AD-8

Attempted incompatible pairs one level down:

1. Deploy job vs acceptance job both "using secrets" — AD-2 + AD-3 force Environment `uat` and name-only fail-closed. They cannot invent repo-level production secrets without violating the rule.
2. Layer A vs Layer B both "proving signup" — AD-7 forbids solving the live challenge and forbids test keys on live UAT. A story that writes test keys into `docker-compose.uat.yml` fails the spine.
3. Cursor vs Actions both "needing SSH" — AD-1 forbids Cursor holding the key. Actions may hold it.
4. Two stories emitting evidence — AD-8 requires `acceptance-summary.json` and treats missing evidence as FAIL, so a paste-only close is non-compliant.

No remaining pair that obeys every AD and still diverges on control/execution/evidence ownership.
