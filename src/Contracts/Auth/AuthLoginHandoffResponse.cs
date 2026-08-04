namespace Cohestra.Contracts.Auth;

public sealed record AuthLoginHandoffResponse(
    string TenantSlug,
    string HandoffCode,
    int HandoffExpiresInSeconds);
