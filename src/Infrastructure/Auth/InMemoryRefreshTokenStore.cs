using System.Collections.Concurrent;

namespace Cohestra.Infrastructure.Auth;

/// <summary>
/// Process-local refresh token store for Development fallback when Redis is unavailable.
/// </summary>
public sealed class InMemoryRefreshTokenStore
{
    private readonly ConcurrentDictionary<string, (RefreshTokenSession Session, DateTimeOffset ExpiresAt)> _entries =
        new(StringComparer.Ordinal);

    public Task StoreAsync(
        string refreshToken,
        Guid userId,
        Guid? tenantId,
        TimeSpan ttl,
        CancellationToken cancellationToken = default)
    {
        var expiresAt = DateTimeOffset.UtcNow.Add(ttl);
        _entries[NormalizeKey(refreshToken)] = (new RefreshTokenSession(userId, tenantId), expiresAt);
        PruneExpiredEntries();
        return Task.CompletedTask;
    }

    public Task<RefreshTokenSession?> GetSessionAsync(
        string refreshToken,
        CancellationToken cancellationToken = default)
    {
        if (!TryGetLiveSession(refreshToken, out var session))
        {
            return Task.FromResult<RefreshTokenSession?>(null);
        }

        return Task.FromResult<RefreshTokenSession?>(session);
    }

    public Task<RefreshTokenSession?> ConsumeAsync(
        string refreshToken,
        CancellationToken cancellationToken = default)
    {
        var key = NormalizeKey(refreshToken);
        if (!_entries.TryGetValue(key, out var entry) || entry.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            _entries.TryRemove(key, out _);
            return Task.FromResult<RefreshTokenSession?>(null);
        }

        _entries.TryRemove(key, out _);
        return Task.FromResult<RefreshTokenSession?>(entry.Session);
    }

    public Task RevokeAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        _entries.TryRemove(NormalizeKey(refreshToken), out _);
        return Task.CompletedTask;
    }

    public Task RevokeAllForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        foreach (var pair in _entries)
        {
            if (pair.Value.Session.UserId == userId)
            {
                _entries.TryRemove(pair.Key, out _);
            }
        }

        return Task.CompletedTask;
    }

    private bool TryGetLiveSession(string refreshToken, out RefreshTokenSession session)
    {
        session = default!;
        var key = NormalizeKey(refreshToken);
        if (!_entries.TryGetValue(key, out var entry))
        {
            return false;
        }

        if (entry.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            _entries.TryRemove(key, out _);
            return false;
        }

        session = entry.Session;
        return true;
    }

    private static string NormalizeKey(string refreshToken) => refreshToken.Trim();

    private void PruneExpiredEntries()
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var pair in _entries)
        {
            if (pair.Value.ExpiresAt <= now)
            {
                _entries.TryRemove(pair.Key, out _);
            }
        }
    }
}
