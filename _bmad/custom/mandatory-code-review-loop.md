# Mandatory Code Review Loop

**Status:** locked  
**Applies to:** every Cohestra implementation story and implementation PR — Epic 25 close-out work, Cohestra AI, Epic 19, and all future BMAD Loop development.

Canonical file. Skills load this via `file:` persistent facts. Do not treat code review as optional or one-shot.

## Mandatory loop

Every implementation story MUST pass code review before it can be marked DONE.

```
IMPLEMENT
→ BUILD
→ TEST
→ BMAD CODE REVIEW
→ FINDINGS?
    YES → CLASSIFY → FIX → BUILD → TEST → CODE REVIEW AGAIN
    NO  → PRODUCT / UX ACCEPTANCE
→ ACCEPTANCE FAILS?
    YES → FIX → BUILD → TEST → CODE REVIEW AGAIN → ACCEPTANCE AGAIN
    NO  → STORY DONE
```

Code review is not one-shot.

Run `bmad-code-review` repeatedly until the **final implementation HEAD** passes.

## Code review must check

Review the actual changed implementation against:

1. Story acceptance criteria
2. Product intent
3. Existing Cohestra architecture
4. Brownfield reuse / duplicate implementation
5. Domain boundaries
6. API contracts
7. Data correctness
8. Persistence behavior
9. Tenant isolation
10. Authorization / permissions
11. Security
12. Input validation
13. Error handling
14. Concurrency where relevant
15. Null / edge cases
16. Performance where relevant
17. Cache consistency
18. Background worker behavior where relevant
19. Observability / logging
20. Privacy / sensitive-data handling
21. Maintainability
22. Regression risk
23. Test quality
24. Missing test cases
25. Frontend state correctness
26. Accessibility where relevant
27. Responsive behavior where relevant
28. Product/UX consistency
29. Dead code / temporary hacks
30. Unsupported assumptions

Layer these checks on top of the Blind Hunter / Edge Case Hunter / Acceptance Auditor pass. The existing `patch` / `defer` / `dismiss` buckets still apply for action routing. **Every kept finding also gets a severity.**

## Finding severity

Classify every review finding:

**BLOCKER**
- security issue
- tenant isolation failure
- data loss/corruption risk
- broken acceptance criterion
- incorrect product behavior
- deterministic test failure
- architectural violation with meaningful risk

**MAJOR**
- likely regression
- important edge case missing
- poor failure handling
- incorrect persistence/cache behavior
- significant maintainability problem
- important missing test

**MINOR**
- localized quality issue
- small maintainability concern
- non-critical UX issue

**NIT**
- stylistic preference
- optional cleanup

Story cannot close with unresolved BLOCKER or MAJOR findings.

MINOR findings should normally be fixed when the change is small and directly related to the story.

NIT findings must not create endless polishing loops.

## Review fix law

When code review finds an issue:

Do not create a new story automatically.

Fix it inside the current story when it belongs to the current acceptance scope.

Then rerun:

```
BUILD
→ TEST
→ CODE REVIEW
```

Review the **NEW final HEAD**.

Do not rely on a review of an older commit after fixes have been pushed.

## Test failure loop

If tests fail after a review fix, classify the failure as:

- implementation defect
- regression
- stale test
- flaky test
- environment issue
- unrelated pre-existing failure

Then resolve appropriately.

Never weaken production behavior merely to make tests green.

Never skip a deterministic failing test to close the story.

After the fix:

```
TEST AGAIN
→ CODE REVIEW AGAIN
```

## PR review loop

For PR-based implementation:

```
story implementation
→ PR
→ CI
→ BMAD code review
→ findings
→ fixes
→ new HEAD
→ CI again
→ BMAD code review again
→ product/UX acceptance
→ final HEAD verification
→ merge
```

The merge candidate must be the exact HEAD that passed:

- CI
- tests
- code review
- product acceptance

Do not approve a PR because an earlier commit passed.

`bmad-checkpoint-preview` is human walkthrough. It does **not** replace `bmad-code-review`.

Docs-only tracker or planning updates are not implementation stories. They do not require this loop unless they change product behavior.

## Epic final review

After all stories pass individually, run a final cross-story epic review.

Check for:

- integration gaps between stories
- inconsistent patterns
- duplicated logic
- broken end-to-end journeys
- permission/tenant inconsistencies
- cross-feature regressions
- missing observability
- production-readiness gaps

If final epic review finds a BLOCKER or MAJOR issue:

reopen the appropriate story or create the **minimum** corrective story,
implement,
test,
code review,
and run epic acceptance again.

## Definition of PASS

A story is DONE only when all of these pass on the **final implementation HEAD**:

| Gate | Required |
|------|----------|
| SPEC | ✅ |
| IMPLEMENTATION | ✅ |
| BUILD | ✅ |
| TESTS | ✅ |
| BMAD CODE REVIEW | ✅ no unresolved BLOCKER / MAJOR |
| PRODUCT ACCEPTANCE | ✅ |
| UX / VISUAL ACCEPTANCE | ✅ where applicable |
| CI | ✅ |
| FINAL HEAD REVIEW | ✅ |

Only then:

```
CLOSE STORY
→ UPDATE TRACKER
→ NEXT STORY
```

Never mark sprint-status `done` from implementation alone. `review` means implementation finished and the code-review loop is in progress or required. `done` means this definition of PASS holds for the current HEAD.
