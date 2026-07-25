namespace Cohestra.Application.Signup;

public interface IPublicSignupRateLimiter
{
    Task<bool> AllowSignupAsync(string clientIdentifier, CancellationToken cancellationToken = default);

    Task RecordSuccessfulSignupAsync(string clientIdentifier, CancellationToken cancellationToken = default);
}
