namespace Cohestra.Application.Registrations;

public interface IPublicRegistrationRateLimiter
{
    Task<bool> AllowRequestAsync(string clientIdentifier, CancellationToken cancellationToken = default);
}
