# Exact-HEAD review: Story 19.5 UAT PlatformAdmin lifecycle

Reviewed SHA: `8688116fdee8aa58fe2c696e98ae8134676b3b42`

Reviewer: Grok 4.6 (primary). Composer 2.5: none.

## Scope

Owner-authorized UAT-only PlatformAdmin lifecycle automation for Story 19.5.
Reuses `PlatformAdminSeeder` and existing `/api/v1/platform/tenants*` APIs.
Does not invent a second administration system. Does not add GITHUB_TOKEN write permissions.

## Tests executed on this HEAD

- `npx vitest run e2e-uat/lifecycle` — 18 passed
- `dotnet test … --filter FullyQualifiedName~PlatformAdminSeedOneShotTests` — 12 passed
- `bash deploy/validate-uat-lifecycle.sh` — 26 passed
- `bash deploy/validate-deploy-uat-workflow.sh` — 34 passed
- `bash deploy/validate-uat-playwright.sh` — pass

## Security architecture

- Opt-in: `UAT_AUTO_LIFECYCLE_ENABLED == true` AND committed `19-5-lifecycle-gate.json.lifecycleOpen`.
- Environment: GitHub Environment `uat` + public base must be `uat.cohestra.app`.
- Mutation pin: tenant id/slug only from the Create response of the same run.
- Hard refuse: `default`, `picklemania`, `creativorare`, missing prefix, production hosts, external tenant id env, Paddle/billing/complimentary URLs.
- URL allowlist is method-aware (POST create/mutate, GET me/audits/door/home only).
- One-shot seed exits before `app.Run()`, does not replace the running API, does not persist `.env`.
- Seeder collision errors no longer interpolate the seed email.
- Evidence is sanitized and secret-like files are deleted before upload.

## Findings

| Severity | Finding | Disposition |
| -------- | ------- | ----------- |
| BLOCKER | none | — |
| MAJOR | none | — |
| MINOR | One-shot non-zero exit is mapped to `platform_admin_bootstrap_conflict` even for transient compose/DB errors. Fail-closed; owner can distinguish from a real TenantAdmin collision via auth retry. | accept |
| NIT | Acceptance summary story tag remains `19.3`. Out of scope. | accept |

## Verdict

**PASS.** BLOCKER=0. MAJOR=0.

This HEAD is eligible for CI and merge under the owner authorization. Live UAT still has to prove PlatformAdmin secret presence, role exclusivity, and the public maintenance/404 matrix. After live PASS: `OWNER_GATE=launch_signoff`. Do not fabricate Operator/PM signatures. Production remains NO-GO.
