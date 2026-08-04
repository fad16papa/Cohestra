namespace Cohestra.Contracts.Auth;

public sealed record AuthLoginResult(
    AuthTokenResponse? Tokens,
    string? ErrorCode,
    string? ErrorMessage,
    string? VerifyTenantSlug = null,
    string? TenantSlug = null,
    string? HandoffCode = null,
    int? HandoffExpiresInSeconds = null);
