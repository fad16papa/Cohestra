using System.Collections.Concurrent;
using Cohestra.Application.Auth;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Auth;

/// <summary>
/// Process-local handoff store for Development fallback when Redis is unavailable.
/// </summary>
public sealed class InMemoryAuthHandoffStore(IOptions<AuthHandoffOptions> options)
{
    private readonly ConcurrentDictionary<string, (AuthHandoffPayload Payload, DateTimeOffset ExpiresAt)> _entries =
        new(StringComparer.Ordinal);

    public Task<(string Code, int ExpiresInSeconds)> CreateAsync(
        AuthHandoffPayload payload,
        CancellationToken cancellationToken = default)
    {
        var ttlSeconds = Math.Clamp(options.Value.TtlSeconds, 30, 300);
        var code = Guid.NewGuid().ToString("N");
        var expiresAt = DateTimeOffset.UtcNow.AddSeconds(ttlSeconds);
        _entries[code] = (payload, expiresAt);
        PruneExpiredEntries();
        return Task.FromResult((code, ttlSeconds));
    }

    public Task<AuthHandoffPayload?> ExchangeAsync(
        string code,
        Guid expectedTenantId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return Task.FromResult<AuthHandoffPayload?>(null);
        }

        var normalized = code.Trim();
        if (!_entries.TryGetValue(normalized, out var entry))
        {
            return Task.FromResult<AuthHandoffPayload?>(null);
        }

        if (entry.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            _entries.TryRemove(normalized, out _);
            return Task.FromResult<AuthHandoffPayload?>(null);
        }

        if (entry.Payload.TenantId != expectedTenantId)
        {
            return Task.FromResult<AuthHandoffPayload?>(null);
        }

        _entries.TryRemove(normalized, out _);
        return Task.FromResult<AuthHandoffPayload?>(entry.Payload);
    }

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
