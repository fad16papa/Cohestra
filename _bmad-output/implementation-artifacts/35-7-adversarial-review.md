# Epic 35 — Adversarial review (bmad-review-adversarial-general)

**Scope:** Full Epic 35 delta on branch `cursor/modern-form-experience-system-a139`  
**Tone:** Cynical product/security review

## Findings (addressed or accepted)

1. **Legacy preset vs Experience layout ambiguity** — Advanced layouts can override Experience layout; UI warns when non-classic preset is active. **Accepted** with copy in Design tab; precedence matches `pickRegistrationPublicShellKind`.

2. **Form Preview without save** — Depends on parent `designDraftTheme` state; if Design tab never opened, Form Preview uses persisted theme only. **Accepted**; operator path documented in e2e.

3. **Conversational final-step validation edge** — Fixed in 35.5 (`firstInvalidIndex` on full validation failure). **Resolved.**

4. **Basic API bypass** — Integration tests for split/poster/conversational 403; unit gate tests for Basic/Core. **Mitigated**; expand if new experience dimensions added.

5. **Poster e2e assertion weak** — Uses h1 visibility; could false-positive on centered. **Mitigated** by serial theme apply before each test.

6. **No Playwright in default CI web job** — Matrix only in Docker smoke. **Mitigated** by extending `ci-docker-smoke.sh`.

7. **FormTemplatePlanLimit flake** — `ClearDefaultTenantFormTemplatesAsync` added in 35.5; deterministic isolation. **Resolved** pending CI observation.

8. **Style dimensions partially exposed** — Only modern/minimal in Studio; editorial/bold/soft not offered (no dead controls). **Accepted** per 35.6 scope.

9. **Reduced motion** — Conversational uses `motion-safe:` transitions; no live SR session in CI. **Non-blocking** unless PRD mandates SR runtime.

10. **Hidden preview rerender** — Form tab Preview panel unmounted in build mode; Design live preview intentional. **Accepted**; no full-tree render on every keystroke in Form build mode.

## Blockers for Epic close

- None — CI Docker Epic 35 e2e green on HEAD `c0e9fcc` (run 35454127263).
