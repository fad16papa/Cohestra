namespace Cohestra.Application.Support;

public sealed record SupportSubmissionReservation(
    Guid TenantId,
    Guid OperatorUserId,
    string Member);

public interface ISupportSubmissionRateLimiter
{
    Task<SupportSubmissionReservation?> TryReserveSubmissionAsync(
        Guid tenantId,
        Guid operatorUserId,
        CancellationToken cancellationToken = default);

    Task ReleaseSubmissionAsync(
        SupportSubmissionReservation reservation,
        CancellationToken cancellationToken = default);
}
