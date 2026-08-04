namespace Cohestra.Application.Auth;

public interface IAuthOtpVerifyRateLimiter
{
    Task<bool> AllowVerifyAsync(
        string email,
        string? clientIdentifier,
        CancellationToken cancellationToken = default);

    Task RecordFailedVerifyAsync(
        string email,
        string? clientIdentifier,
        CancellationToken cancellationToken = default);

    Task ClearFailuresAsync(
        string email,
        string? clientIdentifier,
        CancellationToken cancellationToken = default);
}
