namespace Cohestra.Application.Auth;

public sealed record AuthHandoffPayload(
    Guid TenantId,
    string TenantSlug,
    string AccessToken,
    string RefreshToken,
    int ExpiresInSeconds);

public interface IAuthHandoffStore
{
    Task<(string Code, int ExpiresInSeconds)> CreateAsync(
        AuthHandoffPayload payload,
        CancellationToken cancellationToken = default);

    Task<AuthHandoffPayload?> ExchangeAsync(
        string code,
        Guid expectedTenantId,
        CancellationToken cancellationToken = default);
}
