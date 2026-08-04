namespace Cohestra.Application.Auth;

public interface IAuthResendOtpRateLimiter
{
    Task<bool> AllowResendAsync(
        string email,
        string? clientIdentifier,
        CancellationToken cancellationToken = default);

    Task RecordResendAsync(
        string email,
        string? clientIdentifier,
        CancellationToken cancellationToken = default);
}
