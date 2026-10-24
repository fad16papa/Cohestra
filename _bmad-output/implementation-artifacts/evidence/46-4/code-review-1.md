# Story 46.4 code review 1 — HEAD `5bca15f0`

Reviewer: Grok 4.6 (Blind Hunter + Edge Case Hunter + Acceptance Auditor)
Mandatory Code Review Loop: current HEAD at review time was `5bca15f0`.

## Severity summary

| Severity | Count | Disposition |
| --- | --- | --- |
| BLOCKER | 1 | patched on successor HEAD |
| MAJOR | 4 | patched on successor HEAD |
| MINOR | several | in-scope items patched |
| NIT | several | left / wording only |

## Kept findings

1. **BLOCKER** — `PlatformAdminSeed:Enabled` rejected on every Production environment, breaking UAT one-shot bootstrap. **Patch:** dedicated plane only.
2. **MAJOR** — classified compare PASSed when required names were omitted. **Patch:** required-name set + incomplete inventory FAIL.
3. **MAJOR** — Redis loopback inspected only the first comma token. **Patch:** scan every non-option endpoint.
4. **MAJOR** — host `--check-names` accepted any https URL / UAT sender. **Patch:** apex-only URL, sender, JWT length.
5. **MAJOR** — `PUBLIC_BASE_URL` accepted any tenant host. **Patch:** apex `cohestra.app` / `www.cohestra.app` only; CORS still allows tenant labels.

This review is stale after the patch commit. Re-review the new HEAD.
