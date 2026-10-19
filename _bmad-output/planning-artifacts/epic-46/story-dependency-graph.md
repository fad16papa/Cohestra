---
title: Epic 46 story dependency graph
status: final
created: 2026-10-19
---

# Story dependency graph

```mermaid
flowchart TB
  s1[46.1 architecture baseline]
  s2[46.2 dedicated host]
  s3[46.3 GitHub production CD]
  s4[46.4 runtime secrets isolation]
  s5[46.5 backup restore DR]
  s6[46.6 OTel instrumentation]
  s7[46.7 metrics dashboards alerts]
  s8[46.8 Platform Admin signals]
  s9[46.9 security hardening]
  s10[46.10 Paddle live]
  s11[46.11 SendGrid]
  s12[46.12 performance load]
  s13[46.13 DNS TLS smoke]
  s14[46.14 final acceptance]
  s15[46.15 cutover NO-GO]

  s1 --> s2
  s1 --> s3
  s1 --> s6
  s1 --> s9
  s1 --> s12
  s2 --> s4
  s3 --> s4
  s4 --> s5
  s4 --> s13
  s6 --> s7
  s6 --> s8
  s4 --> s10
  s4 --> s11
  s9 --> s14
  s5 --> s14
  s7 --> s14
  s8 --> s14
  s10 --> s14
  s11 --> s14
  s12 --> s14
  s13 --> s14
  s14 --> s15
```

## Hard arrows

| From | To | Why |
| --- | --- | --- |
| 46.1 | 46.2 | Host follows the compose/network contract |
| 46.1 | 46.3 | CD references compose names and SHA contract |
| 46.1 | 46.6 | Instrumentation targets known process boundaries |
| 46.2 + 46.3 | 46.4 | Host + environment needed to isolate runtime config |
| 46.4 | 46.5 | Cannot backup a database that is not specified |
| 46.6 | 46.7 / 46.8 | Dashboards and Platform Admin need signals |
| 46.4 | 46.10 / 46.11 | Live providers need Production config home |
| 46.13 | 46.14 | Edge smoke is an acceptance input |
| 46.14 | 46.15 | Cutover is forbidden before the matrix |

## Soft arrows

46.9 can proceed in repo (headers, tests, recaptcha verifier assertions) in parallel with 46.2; host-specific SSH/firewall evidence waits on 46.2.

46.10 webhook URL for live Paddle prefers 46.13 DNS but can use a dark-host URL for configuration rehearsal without charges.

46.12 load tests can use local Production-like compose after 46.1; they must not hit customer DNS.

## Owner gates on the graph

- 46.2: droplet purchase
- 46.3: populate production secrets (workflow code itself is not a gate)
- 46.5: OPTION B purchase if selected
- 46.7: paid observability if selected
- 46.10: live Paddle credentials and any real charge
- 46.11: Production email DNS records if externally controlled
- 46.13: Production DNS/TLS when public
- 46.15: `PRODUCTION CUTOVER: AUTHORIZED`
