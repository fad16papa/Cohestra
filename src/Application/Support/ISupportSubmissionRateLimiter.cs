namespace Cohestra.Application.Support;

public interface ISupportSubmissionRateLimiter
{
    Task<bool> IsSubmissionAllowedAsync(
        Guid tenantId,
        Guid operatorUserId,
        CancellationToken cancellationToken = default);

    Task RecordSuccessfulSubmissionAsync(
        Guid tenantId,
        Guid operatorUserId,
        CancellationToken cancellationToken = default);
}
