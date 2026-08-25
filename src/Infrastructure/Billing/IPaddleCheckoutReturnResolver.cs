namespace Cohestra.Infrastructure.Billing;

public interface IPaddleCheckoutReturnResolver
{
    Task<string?> ResolveDashboardUrlAsync(
        string transactionId,
        CancellationToken cancellationToken = default);
}
