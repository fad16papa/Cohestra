# Story 46.3 checkout bootstrap security review (Grok 4.6)

HEAD under review: this follow-up PR
Layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor, deployment-security
Date: 2026-10-24 (Asia/Singapore)

## Verdict

BLOCKERS = 0  
MAJORS = 0

## Blind Hunter

| Attack | Result |
| --- | --- |
| Wrong repository | Production origin is hardcoded to `https://github.com/fad16papa/Cohestra.git`. Existing checkouts with any other origin REFUSE. |
| Malicious pre-existing `.git` | Wrong origin REFUSE. Root-owned or foreign-owned `.git` REFUSE. Symlinked `.git` REFUSE. Unexpected non-empty directory REFUSE without deletion. |
| Symlinked target | `-L` target REFUSE. |
| Path traversal | `..` in the path REFUSE. Absolute path required. Basename must be `cohestra-production`. |
| Arbitrary remote URL | Production cannot override the origin. Test harness refuses network remotes. |
| Branch-tip / short SHA | Empty, `HEAD`, `latest`, `main`, and short/malformed SHAs REFUSE. Only 40-hex ancestor of `origin/main`. |
| Root-owned Git repository | Existing root-owned `.git` REFUSE. Production chown is `deploy:deploy` after a successful pin. |
| Credential / private-key introduction | No tokens, SSH URLs, `GIT_ASKPASS`, or key material. Public HTTPS only. |
| UAT substitution | UAT hostname and UAT IPv4 REFUSE. |
| Compose / database start | Script contains no compose or database commands. Tests fail if they appear. |

## Edge Case Hunter

- Test harness cannot target `/home/deploy`.
- Non-root live execution REFUSE.
- Idempotent second run on a correct checkout PASS.
- SHA not on `origin/main` REFUSE.
- Unexpected files are left in place.

## Acceptance Auditor

Owner authorization covers the checkout **contract** only. Cursor did not SSH, did not run the script live, and did not populate Gate B.

## Deployment-security

This bootstrap is checkout-only. It does not deploy containers, run migrations, start services, install an Actions SSH key, or dispatch Production.
