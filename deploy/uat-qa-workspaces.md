# UAT QA workspaces

Owner-controlled provisioning for the two acceptance workspaces. This document does not create them. Do not run it against Production. Do not open public signup. Do not change GitHub secrets until both workspaces and their administrators are verified.

Proposed workspaces:

| Role | Name | Slug | Host | Plan | Seats |
| --- | --- | --- | --- | --- | --- |
| Basic | Cohestra QA Basic | `cohestra-qa-basic` | `cohestra-qa-basic.uat.cohestra.app` | Basic | 1 |
| Pro | Cohestra QA Pro | `cohestra-qa-pro` | `cohestra-qa-pro.uat.cohestra.app` | Pro | 10 |

These names are the acceptance contract. They are not a claim that the rows already exist.

## Who may provision

Use an existing PlatformAdmin session on UAT. The API is `POST /api/v1/platform/tenants` and `POST /api/v1/platform/tenants/{tenantId}/bootstrap-admin`. Both require PlatformAdmin. Bootstrap invites a TenantAdmin through the existing invite email. It does not grant PlatformAdmin and it does not run for a workspace that already has a member.

Public self-serve signup stays closed. Do not insert rows into the UAT database. Do not call Paddle. Complimentary create sets `IsComplimentary` and leaves billing Free, so these workspaces do not start a live subscription.

## Create

Create Basic first, then Pro. Stop on any status other than 201. A 409 means the slug is already in use. Do not reuse `default`, `creativorare`, `picklemania`, or any other existing organization. Do not suspend, archive, or edit those organizations.

```json
{
  "name": "Cohestra QA Basic",
  "slug": "cohestra-qa-basic",
  "plan": "Basic",
  "adminContactEmail": "<UAT_AUTO_BASIC_EMAIL>",
  "isComplimentary": true
}
```

Repeat with `Cohestra QA Pro`, `cohestra-qa-pro`, `Pro`, and `<UAT_AUTO_PRO_EMAIL>`.

Confirm each 201 response has `status` Active, `isComplimentary` true, the requested `plan`, and the requested `slug`. Basic must remain the one-seat plan. Pro must be Pro, which carries 10 seats. Do not pass a second member onto the Basic workspace.

## First administrator

Call bootstrap once per new workspace. The email must be the dedicated automation mailbox for that plan. It must not be an existing organization admin and it must not be a PlatformAdmin.

```json
{ "email": "<UAT_AUTO_BASIC_EMAIL>" }
```

Use `<UAT_AUTO_PRO_EMAIL>` for the Pro workspace. A second call returns 409 because bootstrap is one-time.

The invite email links to `https://<slug>.uat.cohestra.app/invite/accept`. Accept it in the browser as that new user and choose the password there. That password is the value the owner later stores as `UAT_AUTO_BASIC_PASSWORD` or `UAT_AUTO_PRO_PASSWORD`. Do not put the password in the repository or in this document.

The Basic admin must not be a member of the Pro workspace, and the Pro admin must not be a member of the Basic workspace.

## Verify before changing GitHub

On each tenant host, as that workspace's new admin:

1. `GET /api/v1/public/door` returns `kind` `active`, `tenantSlug` equal to that workspace, and `plan` Basic or Pro.
2. `GET /api/v1/admin/shell` returns the same `tenantSlug`, `tenantName` `Cohestra QA Basic` or `Cohestra QA Pro`, `plan` Basic or Pro, and `limits.seats` 1 or 10.
3. A shell read on the other host, with the other admin, returns the other slug. Neither credential may satisfy the other workspace.

Only after both checks pass, set:

```
UAT_AUTO_BASIC_SLUG=cohestra-qa-basic
UAT_AUTO_PRO_SLUG=cohestra-qa-pro
```

Leave the email and password keys on the dedicated accounts that accepted the invites. Do not point those keys at an older organization.

## Fixtures the current suite needs

The desktop Pro walk creates and then unpublishes its own activities. Do not pre-load customer activities, registrations, or campaign lists.

| Fixture | Workspace | How it is verified | Who creates it |
| --- | --- | --- | --- |
| Active complimentary tenant, exact name and slug | Both | Public door `kind=active` and shell slug, name, plan, seats | Owner, once, through the APIs above |
| One TenantAdmin, dedicated mailbox | Both | Shell on that host only | Owner accepts the bootstrap invite |
| Published public website | Pro | `GET /api/v1/public/site` returns a `published` document on `cohestra-qa-pro` | Pro admin publishes once in Website Studio. Not created by this run. |
| Core-locked website and Pro-locked campaigns | Basic | Existing page headings | No extra data. Basic plan produces the locks. |
| Community `19.5 Harness`, category `19.5 Category`, two activities, two registrations, CSV export | Pro | The desktop acceptance test creates them and unpublishes the activities | The test, on the Pro QA host only |
| Campaign test-send | Pro | `POST /api/v1/admin/campaigns/send-test` succeeds for the signed-in admin only | The test. UAT SendGrid sandbox must already be configured. Do not call the list-send endpoint. |

No fixture is created on the live UAT host by the change that added this document.
