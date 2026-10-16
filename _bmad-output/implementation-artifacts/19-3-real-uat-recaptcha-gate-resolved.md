---
story: 19.3
status: in-progress
date: 2026-10-16
---

# REAL UAT RECAPTCHA OWNER GATE RESOLVED

Owner confirmed the real UAT reCAPTCHA names are installed privately in
`/home/deploy/cohestra/.env`. Values are not recorded here.

Expected names (presence only):

- `SelfServeSignup__Recaptcha__Enabled=true`
- `SelfServeSignup__Recaptcha__SecretKey` configured
- `NEXT_PUBLIC_RECAPTCHA_ENABLED=true`
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` configured

Expected absences:

- `SelfServeSignup__Recaptcha__TestBypassToken`
- `NEXT_PUBLIC_RECAPTCHA_TEST_TOKEN`

This commit is the legitimate Story 19.3 evidence + fail-closed Layer A
harness so main CI → Deploy UAT rebuilds the web image against those
build-time `NEXT_PUBLIC_*` values.

Independent verification is required before PASS:

1. Host probe: enabled/configured flags, bypass absent, no secret values
2. Playwright Layer A: widget/script, no site-key/domain/CSP failure, empty
   and invalid tokens rejected (no live solve)
3. Layer B remains the isolated CI path from #459
4. Exact SHA provenance on the resulting Deploy UAT run

Do not mark 19.3 done from this document alone. Production remains NO-GO.
