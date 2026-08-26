namespace Cohestra.Infrastructure.Billing;

public sealed record PaddleCheckoutReturnMatch(string RedirectUrl, Guid TenantId);

public interface IPaddleCheckoutReturnResolver
{
    Task<PaddleCheckoutReturnMatch?> ResolveDashboardUrlAsync(
        string transactionId,
        CancellationToken cancellationToken = default);
}
