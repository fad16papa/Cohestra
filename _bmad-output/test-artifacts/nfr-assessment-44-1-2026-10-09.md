# NFR evidence — Story 44.1

Date: 2026-10-09

| NFR | Verdict | Evidence |
| --- | ------- | -------- |
| NFR-44-1 Security | PASS | PlatformAdminOnly class attribute; TenantIsolation 403s; 429 body has no `@` / member identifiers |
| NFR-44-2 Minimization | PASS | Recovery 429/503 copy is generic; existing Epic 28 messages unchanged |
| NFR-44-8 Abuse | PASS | Per-actor Redis limiter; fail-closed 503 via `RateLimiterUnavailableException` |
| NFR-44-9 Isolation | PASS | TenantAuthz ops routes tagged TenantIsolation |
| NFR-44-6 `/ready` | PASS | Not modified |
| NFR-44-4/5/7/10 | N/A or inherit | No new lists/UI/metrics; Epic 19 independence unchanged |

Residual: HTTP 503 path is exercised with a throwing limiter stub plus unit wrap of Redis faults. A live multiplexer disconnect is not separately simulated.
