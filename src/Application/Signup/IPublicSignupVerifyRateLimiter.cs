namespace Cohestra.Application.Signup;

public interface IPublicSignupVerifyRateLimiter
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
