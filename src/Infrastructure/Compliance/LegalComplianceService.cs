using Cohestra.Application.Compliance;
using Cohestra.Domain.Tenants;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Compliance;

public sealed class LegalComplianceSettings
{
    public const string SectionName = "LegalCompliance";

    public string TermsVersion { get; set; } = "2026-07-21";

    public string PrivacyVersion { get; set; } = "2026-07-21";
}

public sealed class LegalComplianceService(IOptions<LegalComplianceSettings> options) : ILegalComplianceService
{
    public LegalComplianceVersions GetCurrentVersions()
    {
        var settings = options.Value;
        return new LegalComplianceVersions(settings.TermsVersion, settings.PrivacyVersion);
    }

    public string? ValidateAcceptance(LegalAcceptanceInput input)
    {
        if (!input.AcceptTermsAndPrivacy)
        {
            return "You must accept the Terms of Service and Privacy Policy to create an account.";
        }

        var current = GetCurrentVersions();

        if (string.IsNullOrWhiteSpace(input.TermsVersion)
            || !string.Equals(input.TermsVersion.Trim(), current.TermsVersion, StringComparison.Ordinal))
        {
            return "Terms of Service version is outdated. Refresh the page and accept the current Terms.";
        }

        if (string.IsNullOrWhiteSpace(input.PrivacyVersion)
            || !string.Equals(input.PrivacyVersion.Trim(), current.PrivacyVersion, StringComparison.Ordinal))
        {
            return "Privacy Policy version is outdated. Refresh the page and accept the current Privacy Policy.";
        }

        return null;
    }

    public void ApplyToTenant(Tenant tenant, LegalAcceptanceInput input)
    {
        var validationError = ValidateAcceptance(input);
        if (validationError is not null)
        {
            throw new InvalidOperationException(validationError);
        }

        var current = GetCurrentVersions();
        tenant.LegalAcceptedAt = DateTimeOffset.UtcNow;
        tenant.TermsVersion = current.TermsVersion;
        tenant.PrivacyVersion = current.PrivacyVersion;
    }
}
