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

    /// <param name="expectedTenantId">
    /// Required tenant when exchanging on a tenant Host. Null on a marketing apex
    /// (UAT <c>uat.cohestra.app</c>) — the one-time code binds the tenant.
    /// </param>
    Task<AuthHandoffPayload?> ExchangeAsync(
        string code,
        Guid? expectedTenantId,
        CancellationToken cancellationToken = default);
}
