namespace LeadGenerationCrm.Contracts.Auth;

public sealed record ResendOtpRequest(
    string Email,
    string Purpose);
