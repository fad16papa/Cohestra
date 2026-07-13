namespace LeadGenerationCrm.Contracts.Auth;

public sealed record ResetPasswordRequest(
    string Email,
    string Code,
    string NewPassword);
