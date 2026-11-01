# Permanent UAT readiness workflow

Read-only, event-driven readiness evidence for every current and future UAT
candidate. This is not merge permission, UAT commissioning, SSH, or Production
authorization.

## What it is

A repository-owned GitHub Actions workflow plus a shared Python validator that
consumes pinned GitHub API evidence and writes:

- `artifacts/uat-readiness.json` — versioned machine-readable report
- `artifacts/uat-readiness.md` — sanitized owner-facing summary
- `artifacts/uat-readiness-notice.json` — idempotent notify payload

The Product Owner is notified only for a **new**
`READY_FOR_OWNER_MERGE_DECISION`,
`READY_FOR_OWNER_UAT_COMMISSIONING_DECISION`, or a new material blocker.

## Automatic injection

The workflow runs on:

- `pull_request` opened / synchronize / reopened / ready_for_review / labeled
- `pull_request_review` and PR `issue_comment` changes
- `workflow_run` completion of **CI** (not itself)
- `check_suite` completion for GitGuardian / GitHub Actions
- `push` to protected `main`
- hourly `schedule` reconciliation
- read-only diagnostic `workflow_dispatch`

A PR targeting `main` is a UAT candidate when it has the `uat` label **or**
touches `deploy/**`, `web/e2e-uat/**`, `docs/deploy/**`, `ci.yml`,
`uat-readiness.yml`, or any `deploy*.yml` workflow. PR numbers are not
hardcoded.

CI `uat-isolation` always runs the readiness contract tests and a live
`CI_CONTRACT` evaluation of the current SHA.

Deploy UAT calls the same validator on every evaluation. When
`UAT_DEPLOY_GATE_ACTIVE` is not exact `true`, the existing HOLD-first path is
unchanged: both HOLD evidence files are written, SSH stays skipped. When the
gate is later enabled, missing, stale, or failed readiness **refuses SSH**.
Readiness is revalidated immediately before SSH.

## Fail-closed evidence

READY requires the exact immutable PR HEAD and base SHAs, current required
PR checks, native GitGuardian SUCCESS, and authentic independent BMAD +
CAT-SEC reviews bound to that HEAD (`BLOCKER=0`, `MAJOR=0`).

Authentic reviews come from **one** of these fail-closed channels, and the two
roles must still be **distinct identities**:

1. Issue/review comments from distinct `OWNER`/`MEMBER`/`COLLABORATOR`
   humans (not the PR author, not bots).
2. GitHub App **check-runs** on the exact HEAD from two owner-installed
   apps (`cohestra-bmad` and `cohestra-cat-sec` by default). Check names
   are `Cohestra BMAD` and `Cohestra CAT-SEC`. `github-actions`,
   `cursor`, and other forbidden slugs never count.

Both channels require:

```html
<!-- cohestra-independent-review v1 -->
```

followed by JSON `{role, head_sha, blocker, major, minor, nit, verdict,
independent:true}`. PR body assertions, self-reviews, bots, one shared
identity, SHA mismatches, and PASS-with-BLOCKER are rejected.

### Owner-only GitHub App setup (no secret values in this repository)

This PR is the **consumer**. It does not create apps, store private keys,
or dispatch Cursor agents. The Product Owner, outside this PR:

1. Create two GitHub Apps, e.g. `Cohestra BMAD` and `Cohestra CAT-SEC`.
   Permissions: **Checks: Read & write**, **Metadata: Read**. No contents
   write, no administration, no Environments, no Actions write.
2. Install both on `fad16papa/Cohestra` only.
3. Optionally pin repository **variables** (not secrets):
   `UAT_READINESS_BMAD_APP_SLUG`, `UAT_READINESS_CATSEC_APP_SLUG`,
   `UAT_READINESS_BMAD_APP_ID`, `UAT_READINESS_CATSEC_APP_ID`.
4. Keep each app private key only in the future Issue #536 review runner
   or a dedicated Cursor environment. Do not paste key values into issues
   or this PR.
5. Until both apps post exact-SHA check-runs, readiness stays
   `REVIEW_EVIDENCE_MISSING` / `HOLD`. That HOLD is correct.

The producer that asks those apps to post check-runs after independent
Cursor BMAD and CAT-SEC reviews belongs in Issue #536, not this reporter.

`GitGuardian exact-SHA API scan` is required on push-main and is not required
when CI skipped it on a pull request.

`UAT_ACCEPTED` requires live deploy + required acceptance evidence. A green
shell job is not enough. `CI_CONTRACT` is never live proof.

## Prohibitions

- No `pull_request_target`
- No ADCP
- No autonomous merge, draft toggle, gate change, Deploy UAT dispatch, SSH,
  restore, or Production action
- No silent release-branch architecture migration
- `UAT_DEPLOY_GATE_ACTIVE` stays owner-controlled; this workflow does not set it
