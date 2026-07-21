namespace Cohestra.Contracts.Legal;

public sealed record LegalComplianceVersionsResponse(
    string TermsVersion,
    string PrivacyVersion,
    string TermsPath,
    string PrivacyPath);

public sealed record PublicSignupRequest(
    bool AcceptTermsAndPrivacy,
    string? TermsVersion,
    string? PrivacyVersion,
    string? OrgName,
    string? Slug,
    string? Email,
    string? Password);
