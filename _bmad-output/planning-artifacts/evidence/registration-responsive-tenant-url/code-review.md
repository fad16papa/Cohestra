# Code review — registration-responsive-tenant-website

**HEAD reviewed:** pending this commit (diff vs `origin/main` + working tree)
**Layers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor
**Spec:** `specs/spec-registration-responsive-tenant-url/SPEC.md`

## Iteration 1

MAJOR: Tailwind `@sm`/`@lg` container aliases are 384/512, not 640/1024 — columns would 2-col inside a 390px preview.
MAJOR: embed e2e used a Next homepage `innerHTML` swap (hydration restored the homepage) and later a top-level-only embed check.

## Iteration 2 (this HEAD)

Fixed:

- Layout-critical rules use `@min-[640px]` and `@min-[1024px]` so 320–412 and 390 preview stay stacked; split two-col starts at 1024.
- Embed e2e: PATCH tenant allow-list, same-origin `__embed-harness` iframe at 320px, assert no iframe document overflow.
- Confirmation overflow e2e at 375.

## Triage

| Severity | Finding | Resolution |
| -------- | ------- | ---------- |
| MAJOR | Wrong container aliases | Fixed |
| MAJOR | Embed not proven in iframe | Fixed |
| MINOR | Confirmation untested | Fixed (375 e2e) |
| NIT | Split panel leftover viewport `lg:sticky` | Accepted — grid contract is container-min; panel chrome is not the overflow defect |
| NIT | Template name-only update skips normalize | Accepted — next schema write + public plan gate still hide the feature |
| NIT | Source-contract lookbehind | Tests now assert `@min-[640px]` |

**Unresolved BLOCKER:** none  
**Unresolved MAJOR:** none  
**Verdict:** PASS
