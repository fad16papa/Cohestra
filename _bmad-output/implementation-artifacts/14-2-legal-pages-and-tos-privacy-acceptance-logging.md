---
baseline_commit: b450275bcca089419d86606fc57e09f4357b455a
---

# Story 14.2: Legal pages and ToS/Privacy acceptance logging

Status: review

## Story

As a **prospect signing up**,
I want **accessible Terms and Privacy plus a required acceptance checkbox**,
So that **legal consent is explicit and versioned before an account is created**.

## Acceptance Criteria

1. **Given** apex routes `/terms` and `/privacy`  
   **When** visited before signup is enabled  
   **Then** both pages render readable legal content (launch gate)

2. **Given** self-serve signup (Basic or paid)  
   **When** the user has not checked ToS + Privacy acceptance  
   **Then** account creation is blocked

3. **Given** successful acceptance at signup  
   **When** the Tenant Admin (or Tenant) record is saved  
   **Then** `LegalAcceptedAt`, `TermsVersion`, and `PrivacyVersion` are stored

4. **Given** Stripe Tax  
   **When** v1 launches  
   **Then** Stripe Tax remains disabled; copy may note prices exclusive of applicable tax (no eng blocker)

## Tasks / Subtasks

- [x] Task 1: Legal content + apex pages (AC: 1, 4)
  - [x] 1.1 `/terms` and `/privacy` with readable sections (Midnight Atelier shell)
  - [x] 1.2 Version identifiers (`2026-07-21`) displayed on legal pages
  - [x] 1.3 Pricing page tax disclaimer (USD, exclusive of tax; Stripe Tax off)

- [x] Task 2: Tenant legal acceptance fields (AC: 3)
  - [x] 2.1 `Tenant.LegalAcceptedAt`, `TermsVersion`, `PrivacyVersion`
  - [x] 2.2 EF migration `AddTenantLegalAcceptance`
  - [x] 2.3 `ILegalComplianceService.ApplyToTenant` stamps versions on save

- [x] Task 3: API legal gate (AC: 2, 3)
  - [x] 3.1 `GET /api/v1/public/legal/versions`
  - [x] 3.2 `POST /api/v1/public/signup` rejects missing/stale acceptance (400); 501 until 14.3 completes signup
  - [x] 3.3 `LegalCompliance` config in appsettings

- [x] Task 4: Web signup shell + ToSCheckbox (AC: 2)
  - [x] 4.1 `ToSCheckbox` links to `/terms` and `/privacy`
  - [x] 4.2 `/signup` requires checkbox; calls API legal gate
  - [x] 4.3 Continue disabled until accepted

- [x] Task 5: Tests + verify
  - [x] 5.1 `LegalComplianceServiceTests` (4 tests)
  - [x] 5.2 `dotnet test` + `npm run build`

## Dev Agent Record

### Agent Model Used

Cursor Grok 4.5 (cloud agent)

### Completion Notes List

- Legal pages at `/terms`, `/privacy` with versioned content and MarketingShell.
- Tenant legal fields + migration; `LegalComplianceService` validates and stamps acceptance.
- Public API: legal versions + signup legal gate (501 until Story 14.3 implements full signup).
- `/signup` shell with ToSCheckbox; pricing tax disclaimer added.
- Story 14.3 will wire full tenant creation and call `ApplyToTenant`.

### File List

- `src/Domain/Tenants/Tenant.cs`
- `src/Infrastructure/Persistence/Configurations/TenantConfiguration.cs`
- `src/Infrastructure/Persistence/Migrations/*AddTenantLegalAcceptance*`
- `src/Application/Compliance/ILegalComplianceService.cs`
- `src/Infrastructure/Compliance/LegalComplianceService.cs`
- `src/Infrastructure/DependencyInjection.cs`
- `src/Contracts/Legal/LegalContracts.cs`
- `src/Api/Controllers/V1/PublicLegalController.cs`
- `src/Api/Controllers/V1/PublicSignupController.cs`
- `src/Api/appsettings.json`
- `src/Infrastructure.Tests/Compliance/LegalComplianceServiceTests.cs`
- `web/app/terms/page.tsx`
- `web/app/privacy/page.tsx`
- `web/app/signup/page.tsx`
- `web/components/legal/*`
- `web/lib/legal/*`
- `web/components/marketing/marketing-shell.tsx`
- `web/components/marketing/pricing-page.tsx`
- `web/components/layouts/app-footer.tsx`

## Change Log

- 2026-07-21: DS 14.2 — legal pages, tenant legal fields, API gate, signup shell; status → review.
