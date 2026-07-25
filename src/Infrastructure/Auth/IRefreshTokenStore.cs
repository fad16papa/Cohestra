namespace Cohestra.Infrastructure.Auth;

public sealed record RefreshTokenSession(Guid UserId, Guid? TenantId);

public interface IRefreshTokenStore
{
    Task StoreAsync(
        string refreshToken,
        Guid userId,
        Guid? tenantId,
        TimeSpan ttl,
        CancellationToken cancellationToken = default);

    Task<RefreshTokenSession?> GetSessionAsync(
        string refreshToken,
        CancellationToken cancellationToken = default);

    Task<RefreshTokenSession?> ConsumeAsync(
        string refreshToken,
        CancellationToken cancellationToken = default);

    Task RevokeAsync(string refreshToken, CancellationToken cancellationToken = default);
}
