namespace Cohestra.Application.Compliance;

public sealed record LegalComplianceVersions(string TermsVersion, string PrivacyVersion);

public sealed record LegalAcceptanceInput(
    bool AcceptTermsAndPrivacy,
    string? TermsVersion,
    string? PrivacyVersion);

public interface ILegalComplianceService
{
    LegalComplianceVersions GetCurrentVersions();

    string? ValidateAcceptance(LegalAcceptanceInput input);

    void ApplyToTenant(Domain.Tenants.Tenant tenant, LegalAcceptanceInput input);
}
