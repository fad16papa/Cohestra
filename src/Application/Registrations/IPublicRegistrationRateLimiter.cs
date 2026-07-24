namespace Cohestra.Application.Registrations;

public interface IPublicRegistrationRateLimiter
{
    Task<bool> AllowRequestAsync(
        Guid tenantId,
        string clientIdentifier,
        CancellationToken cancellationToken = default);
}
