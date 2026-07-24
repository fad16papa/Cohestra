namespace Cohestra.Application.Registrations;

public sealed record IdempotencyCachedRegistration(
    Guid RegistrationId,
    string RegistrationNumber,
    Guid ClientId);

public sealed record IdempotencyLookupResult
{
    public bool IsConflict { get; init; }

    public IdempotencyCachedRegistration? Cached { get; init; }

    public static IdempotencyLookupResult Miss() => new();

    public static IdempotencyLookupResult Replay(IdempotencyCachedRegistration cached) =>
        new() { Cached = cached };

    public static IdempotencyLookupResult Conflict() =>
        new() { IsConflict = true };
}

public interface IRegistrationIdempotencyStore
{
    Task<IdempotencyLookupResult> LookupAsync(
        Guid tenantId,
        string idempotencyKey,
        string requestFingerprint,
        CancellationToken cancellationToken = default);

    Task<bool> TryBeginAsync(
        Guid tenantId,
        string idempotencyKey,
        string requestFingerprint,
        CancellationToken cancellationToken = default);

    Task StoreAsync(
        Guid tenantId,
        string idempotencyKey,
        string requestFingerprint,
        IdempotencyCachedRegistration registration,
        CancellationToken cancellationToken = default);

    Task ReleaseLockAsync(
        Guid tenantId,
        string idempotencyKey,
        CancellationToken cancellationToken = default);
}
