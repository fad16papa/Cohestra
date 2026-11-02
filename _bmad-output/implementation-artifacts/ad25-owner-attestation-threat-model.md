---
label: AD25-OWNER-AUTH
status: threat-model
authority: issue-538
as_of: 2026-11-02T20:50:00+08:00
---

# Owner attestation threat model

Do not claim that owner-named GitHub events establish human presence.

## Four identities (do not collapse)

| Identity | What GitHub proves | What it does not prove | #541 evidence |
| --- | --- | --- | --- |
| **Owner-account** (`login=fad16papa`) | The credential belongs to that user | A human typed the action | `ready_for_review` actor was fad16papa |
| **App installation** (`cursor[bot]`, App `1210556`) | The Cursor installation token performed the action | Owner intent | `merged_by=cursor[bot]` |
| **Verified human authorization** | Nothing GitHub-native on a personal repo | Human at keyboard | Not a GitHub field |
| **Independent policy authorization** | A **different** App posted a pinned check | Human presence | Does not exist until Layer B is installed |

Comment `OWNER_APPROVE_CONTROL_PLANE sha=<SHA>` is **owner-account identity**. Cursor Cloud can mint it if it holds a fad16papa user token (PAT in `GH_TOKEN`, or a user-to-server token). #541 already showed user-attributed events.

## Attack register

| ID | Attack | Channel | Blocked by HMAC+pinned check? | Residual |
| --- | --- | --- | --- | --- |
| T1 | Installation-token merge | Cursor IAT `contents:write` | **Yes**, once `AD25-Owner-Policy` is required and pinned and the check is `failure` | Probe must confirm GitHub returns a failed-status-check error |
| T2 | User-token merge as fad16papa | PAT / UAT | **Yes** for the check (merge still blocked while check is red); **No** as human-presence | Owner-looking `mergedBy=fad16papa` after a valid HMAC is still not human-presence |
| T3 | Comment-only attestation | User token posts `sha=` without MAC | **Yes** (evaluator FAILURE) | — |
| T4 | Stolen HMAC | Secret in Cursor chat, Cohestra secrets, or App logs | **No** if secret leaks | Secret hygiene; rotate |
| T5 | Replay MAC onto new HEAD | Same MAC, new commit | **Yes** (HMAC message includes SHA) | — |
| T6 | Replay MAC onto another PR or base | Same MAC, different PR/base | **Yes** (message includes repo+pr+base+sha) | — |
| T13 | Stolen Owner-Policy private key | Check `success` without evaluator | **No** | Rotate App key; pin still trusts this App |
| T14 | Owner-token ruleset unpin | Administration / PAT | **No** | Process: no PAT with admin in Cursor secrets |
| T7 | PR-head job named `AD25-Owner-Policy` | Actions 15368 | **Yes** if ruleset pin is live; **No** if `integration_id` is null | Abort if pin missing |
| T8 | Cursor App posts the same check name | 1210556 `checks:write` | **Yes** if pinned | — |
| T9 | Evaluator `exec` of main Python | Supply chain | **Yes** by design (forbidden) | Don't add it later |
| T10 | App `deployments:write` to `uat`/`production` | Permission creep | **Yes** if permissions stay none | Abort if granted |
| T11 | Soft conclusion `neutral`/`skipped` | Check API | **Yes** in prototype (refused) | Host must not map timeouts to skipped |
| T12 | Paste MAC into Cursor | Process | **No** | Owner procedure: GitHub.com only |

## Stronger optional methods (ranked)

1. **HMAC (default, this plan).** Secret only in App env + owner password manager. CLI in the prototype mints the comment line. Cursor cannot compute the MAC without the secret.
2. **Second GitHub account** not connected to Cursor, whose comments are the only accepted `owner_logins`. Stronger identity split; more account overhead.
3. **App-hosted approval page** with GitHub OAuth and a freshly entered HMAC or WebAuthn, never a GitHub issue comment. Best UX for human-presence *approximation*; not built in this prototype.
4. **Hardware key / GitHub sudo-mode only in the browser.** Cannot be required via API. Process control for the final merge click.

Comment-only remains **rejected**. Environment `pending_deployments` remains **rejected** as a human-presence root (user-token mintable) and would need `deployments:write` if the App created deployments.

## Residual-risk register (accepted unless the owner chooses otherwise)

| Risk | Status | Why accepted |
| --- | --- | --- |
| Cursor IAT still has `contents:write` | Accepted on the Cloud-Agent-preserving path | Installer cannot downgrade; pin blocks merge |
| fad16papa user token can still click merge after HMAC | Accepted | Single-owner GitHub identity; HMAC is the extra factor |
| HMAC secret leak via owner paste into Cursor | Process residual | Documented abort |
| No GitHub-native human-presence bit | Accepted | Cannot be invented |
| Cloud Agent breakage if Cohestra is removed from Cursor | Optional path | Owner decision |

`OWNER_CONTROL_READY` means T1 and T7 are closed by a live pin plus HMAC, not that T2/T12 are gone.
