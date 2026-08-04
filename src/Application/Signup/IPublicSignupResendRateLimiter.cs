namespace Cohestra.Application.Signup;

public interface IPublicSignupResendRateLimiter
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
