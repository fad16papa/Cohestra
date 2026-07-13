namespace LeadGenerationCrm.Contracts.Auth;

public sealed record OnboardingStatusResponse(
    bool RegistrationAvailable,
    string? Message);
