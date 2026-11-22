# UAT QA workspace

Owner-controlled provisioning for the Basic beta acceptance workspace. This document does not create it. Do not run it against Production. Do not open public signup. Do not create a Pro QA tenant. Do not point acceptance at another organization's tenant.

Live acceptance scope is `basic_beta`. That result is not Basic, Core, and Pro market readiness. Pro application features stay in the product and in isolated CI. Pro live end-to-end coverage is `NOT_TESTED`. A skipped or missing Pro browser test is not a pass.

| Role | Name | Slug | Host | Plan | Seats | Live acceptance |
| --- | --- | --- | --- | --- | --- | --- |
| Basic | Cohestra QA Basic | `cohestra-qa-basic` | `cohestra-qa-basic.uat.cohestra.app` | Basic | 1 | Required |
| Pro | none | none | none | unchanged in the product | n/a | `NOT_TESTED` |

`cohestra-qa-pro.uat.cohestra.app` is not a launch prerequisite.

## Who may provision

Use an existing PlatformAdmin session on UAT. The API is `POST /api/v1/platform/tenants` and `POST /api/v1/platform/tenants/{tenantId}/bootstrap-admin`. Both require PlatformAdmin. Bootstrap invites a TenantAdmin through the existing invite email. It does not grant PlatformAdmin and it does not run for a workspace that already has a member.

Public self-serve signup stays closed. Do not insert rows into the UAT database. Do not call Paddle. Complimentary create sets `IsComplimentary` and leaves billing Free, so this workspace does not start a live subscription.

## Create the Basic workspace

Stop on any status other than 201. A 409 means the slug is already in use. Do not reuse `default`, `creativorare`, `picklemania`, or any other existing organization. Do not suspend, archive, or edit those organizations. Do not create a second workspace for Pro.

```json
{
  "name": "Cohestra QA Basic",
  "slug": "cohestra-qa-basic",
  "plan": "Basic",
  "adminContactEmail": "<UAT_AUTO_BASIC_EMAIL>",
  "isComplimentary": true
}
```

Confirm the 201 response has `status` Active, `isComplimentary` true, `plan` Basic, and `slug` `cohestra-qa-basic`. Basic must remain the one-seat plan. Do not pass a second member onto the workspace.

## First administrator

Call bootstrap once. The email must be the dedicated Basic automation mailbox. It must not be an existing organization admin and it must not be a PlatformAdmin.

```json
{ "email": "<UAT_AUTO_BASIC_EMAIL>" }
```

A second call returns 409 because bootstrap is one-time.

The invite email links to `https://cohestra-qa-basic.uat.cohestra.app/invite/accept`. Accept it in the browser as that new user and choose the password there. That password is the value the owner later stores as `UAT_AUTO_BASIC_PASSWORD`. Do not put the password in the repository or in this document.

## Verify before changing GitHub

On the Basic tenant host, as that workspace's admin:

1. `GET /api/v1/public/door` returns `kind` `active`, `tenantSlug` `cohestra-qa-basic`, and `plan` Basic.
2. `GET /api/v1/admin/shell` returns the same `tenantSlug`, `tenantName` `Cohestra QA Basic`, `plan` Basic, and `limits.seats` 1.

Only after those checks pass, set:

```
UAT_AUTO_BASIC_SLUG=cohestra-qa-basic
```

`UAT_AUTO_PRO_EMAIL`, `UAT_AUTO_PRO_PASSWORD`, and `UAT_AUTO_PRO_SLUG` are not prerequisites for the Basic-beta browser job. Do not create them in order to launch this beta.

## What the live suite checks

| Check | Workspace | How it is verified |
| --- | --- | --- |
| Authenticated login | Basic | Email and password on the tenant host |
| Dashboard, activities, Core-locked website, Pro-locked campaigns | Basic | Existing page headings. Basic plan produces the locks. |
| Closed signup | Public | `POST /api/v1/public/signup` returns HTTP 403 `signup-closed` |
| CAPTCHA widget and closed-signup probes | Public | Layer A does not solve a live challenge. Empty and invalid tokens stay on the closed-signup response. |
| Pro end-to-end | none | Reported `NOT_TESTED` |

No fixture is created on the live UAT host by the change that updated this document.
