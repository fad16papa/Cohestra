namespace LeadGenerationCrm.Contracts.Auth;

public sealed record AuthLoginResult(
    AuthTokenResponse? Tokens,
    string? ErrorCode,
    string? ErrorMessage);
