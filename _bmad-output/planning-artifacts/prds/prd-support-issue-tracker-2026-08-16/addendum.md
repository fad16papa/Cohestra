---
title: Support Issue Tracker — addendum
status: draft
created: 2026-08-16
---

# Addendum (mechanism, not PRD)

## Why not mailto / email-only

User requirement: “issue tracker id” + “platform admin issue tracker and report.” Email without a row cannot satisfy that.

## Why global SUP numbers (not per-tenant)

Platform admins search one inbox. `SUP20260816000003` must uniquely identify one issue across all tenants. Registration numbers are unique per tenant; copying that uniqueness rule here would collide in the platform list.

## Email vs ticket product

v1: Gmail on techsolutions@ is the human reply channel. Cohestra owns identity and status. Do not sync Zendesk IDs in v1.

## Insertion points (code)

| Concern | Follow |
|---|---|
| Human ID | `RegistrationNumberGenerator` → `SupportIssueNumberGenerator` (global prefix scan) |
| Operator API | `BrandingAssetsController` multipart + `TenantOperator` |
| Platform API | `PlatformTenantsController` list/detail + `IgnoreTenantFilters` |
| Emails | Two outbox types; extend `EmailMessage` with file attachments + ReplyTo |
| Storage | New private directory; do not use `PublicCampaignAssetsController` |
| Reports | New `PlatformSupportReportService`; do not extend tenant `ReportService` |
| Nav | `platform-header.tsx` add Support |
| Settings | New section in `settings-page-content.tsx` |

## Rejected alternatives

| Idea | Why rejected for v1 |
|---|---|
| mailto:techsolutions@ | No ID, no screenshots, no platform report |
| Public `/contact` | Wrong audience; spam |
| Reuse campaign asset upload | Public URLs |
| Tenant reports page | Wrong auth boundary |
