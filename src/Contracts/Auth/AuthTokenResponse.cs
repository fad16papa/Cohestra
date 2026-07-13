namespace LeadGenerationCrm.Contracts.Auth;

public sealed record AuthTokenResponse(
    string AccessToken,
    string RefreshToken,
    int ExpiresInSeconds);
