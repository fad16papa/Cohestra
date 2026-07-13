namespace Cohestra.Infrastructure.Auth;

public interface IRefreshTokenStore
{
    Task StoreAsync(string refreshToken, Guid userId, TimeSpan ttl, CancellationToken cancellationToken = default);

    Task<Guid?> GetUserIdAsync(string refreshToken, CancellationToken cancellationToken = default);

    Task<Guid?> ConsumeAsync(string refreshToken, CancellationToken cancellationToken = default);

    Task RevokeAsync(string refreshToken, CancellationToken cancellationToken = default);
}
