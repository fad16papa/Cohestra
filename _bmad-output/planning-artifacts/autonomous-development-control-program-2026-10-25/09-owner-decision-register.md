---
title: ADCP owner decision register
status: draft
created: 2026-10-25
updated: 2026-10-25
---

# Owner decision register

**STOP AT OWNER_GATE.** No implementation, GitHub setting, or secret creation until the rows you accept are recorded.

Reply with `OWNER_APPROVE D<n>=<choice>` (or refuse).

| ID | Decision | Options | Recommendation | Status |
| --- | --- | --- | --- | --- |
| D1 | Authorize this program as a separate workstream | approve / defer / reject | approve | **OPEN** |
| D2 | Assign epic number in `sprint-status.yaml` | 47 / other / later | **47** (next unused; 46 is in-progress). Stories stay `ADCP-P*` until this is signed | **OPEN** |
| D3 | Pilot orchestrator | A GitHub-native / B dedicated service / C manual-only | **A** (recommendation only; ADCP-P2 exists only if A) | **OPEN** |
| D4 | Dedicated ADCP Environment name + required reviewers | `adcp` + owner as required reviewer / other name + reviewer / defer creation | **`adcp` + owner reviewer**. Not `production`, not `uat`, not `control-plane` | **OPEN** |
| D5 | Create Cursor API key + optional ChatGPT API key | create after D1+D3+D4+D8+D11 / never in this program | create only after those rows; **service-account** Cursor key, not a personal owner key | **OPEN** |
| D6 | ChatGPT invocation | OpenAI API from Actions / human ChatGPT only / none | **human ChatGPT only for the pilot**; OpenAI API is a later privilege expansion | **OPEN** |
| D7 | Executor model pin | Grok 4.6 only / owner default Cloud Agent model / per-task | Grok 4.6 for architecture/security/review; owner pins executor `model.id` | **OPEN** |
| D8 | Adopt AD-1..AD-10 as written | adopt / amend | adopt (required before any implementation story) | **OPEN** |
| D9 | Allow later Option B host | allowed to propose after pilot / forbidden | allowed to propose | **OPEN** |
| D10 | `main` branch protection hardening | do now / later / never | later (does not block ADCP pilot; remains a known risk) | **OPEN** |
| D11 | Dispatch actor allowlist | owner-maintained GitHub login list / defer (no unattended dispatch) | sign a login list before any label/comment trigger; default trigger is `workflow_dispatch` only | **OPEN** |
| D12 | Privilege-expansion list | inherit merge-policy control-plane list as written / amend | inherit. Creating Environment `adcp` and storing keys is itself privilege expansion and requires this row plus D4 | **OPEN** |

## Signing order

1. D1 (authorize workstream)
2. D8 (adopt or amend architecture) and D12 (privilege list)
3. D3 (topology) then D4 (Environment name + reviewers) then D11 (actor allowlist)
4. D2 (epic number) before any `N.n` story files or `sprint-status.yaml` rows
5. D5 (keys) only after D1+D3+D4+D8+D11+D12
6. D6, D7, D9, D10 may be signed independently; D6=API is privilege expansion

## Already binding (do not re-open)

- Epic 45 autonomous merge policy (UAT/non-prod only) — APPROVED 2026-10-15
- Epic 45 AD-1 (no Cursor SSH)
- Epic 45 AD-12 (Grok 4.6 owns architecture/security/CI/CD/review)
- Epic 46 Production NO-GO and provenance Layer A/B
- Mandatory Code Review Loop
- Auto routing disabled; Composer 2.5 remains light-only

## This planning PR does not

- Merge anything
- Close #502 / #503 / #504 / #505
- Create Environments or secrets
- Edit Epic 46 stories or `sprint-status.yaml`
- Dispatch Deploy Production
- Adopt AD-1..AD-10
