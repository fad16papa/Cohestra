namespace Cohestra.Application.Support;

public interface ISupportSubmissionRateLimiter
{
    Task<bool> AllowSubmissionAsync(
        Guid tenantId,
        Guid operatorUserId,
        string clientIdentifier,
        CancellationToken cancellationToken = default);
}
