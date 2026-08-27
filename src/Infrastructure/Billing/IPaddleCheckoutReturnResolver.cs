namespace Cohestra.Infrastructure.Billing;

public sealed record PaddleCheckoutReturnMatch(string RedirectUrl, Guid TenantId, string TenantSlug);

public interface IPaddleCheckoutReturnResolver
{
    Task<PaddleCheckoutReturnMatch?> ResolveDashboardUrlAsync(
        string transactionId,
        CancellationToken cancellationToken = default);
}
