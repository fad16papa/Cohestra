using Cohestra.Application.Compliance;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Compliance;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Tests.Compliance;

public sealed class LegalComplianceServiceTests
{
    private static LegalComplianceService CreateService()
    {
        return new LegalComplianceService(Options.Create(new LegalComplianceSettings
        {
            TermsVersion = "2026-07-21",
            PrivacyVersion = "2026-07-21",
        }));
    }

    [Fact]
    public void ValidateAcceptance_rejects_when_checkbox_unchecked()
    {
        var service = CreateService();

        var error = service.ValidateAcceptance(new LegalAcceptanceInput(
            AcceptTermsAndPrivacy: false,
            TermsVersion: "2026-07-21",
            PrivacyVersion: "2026-07-21"));

        Assert.NotNull(error);
        Assert.Contains("accept", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ValidateAcceptance_rejects_stale_terms_version()
    {
        var service = CreateService();

        var error = service.ValidateAcceptance(new LegalAcceptanceInput(
            AcceptTermsAndPrivacy: true,
            TermsVersion: "2020-01-01",
            PrivacyVersion: "2026-07-21"));

        Assert.NotNull(error);
        Assert.Contains("Terms", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ValidateAcceptance_accepts_current_versions()
    {
        var service = CreateService();

        var error = service.ValidateAcceptance(new LegalAcceptanceInput(
            AcceptTermsAndPrivacy: true,
            TermsVersion: "2026-07-21",
            PrivacyVersion: "2026-07-21"));

        Assert.Null(error);
    }

    [Fact]
    public void ApplyToTenant_stamps_acceptance_fields()
    {
        var service = CreateService();
        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Slug = "legal-test",
            Name = "Legal Test",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        service.ApplyToTenant(tenant, new LegalAcceptanceInput(
            AcceptTermsAndPrivacy: true,
            TermsVersion: "2026-07-21",
            PrivacyVersion: "2026-07-21"));

        Assert.NotNull(tenant.LegalAcceptedAt);
        Assert.Equal("2026-07-21", tenant.TermsVersion);
        Assert.Equal("2026-07-21", tenant.PrivacyVersion);
    }
}
