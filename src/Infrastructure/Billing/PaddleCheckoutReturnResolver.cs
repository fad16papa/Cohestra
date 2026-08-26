using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Billing;

internal sealed class PaddleCheckoutReturnResolver(
    CohestraDbContext dbContext,
    IPaddleApiClient paddleClient,
    IOptions<PublicWebOptions> publicWebOptions,
    ILogger<PaddleCheckoutReturnResolver> logger) : IPaddleCheckoutReturnResolver
{
    internal const int MaxTransactionIdLength = 64;

    internal static bool IsTransactionId(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)
            || value.Length < 8
            || value.Length > MaxTransactionIdLength
            || !value.StartsWith("txn_", StringComparison.Ordinal))
        {
            return false;
        }

        for (var i = 4; i < value.Length; i++)
        {
            if (!char.IsAsciiLetterOrDigit(value[i]))
            {
                return false;
            }
        }

        return true;
    }

    public async Task<PaddleCheckoutReturnMatch?> ResolveDashboardUrlAsync(
        string transactionId,
        CancellationToken cancellationToken = default)
    {
        if (!IsTransactionId(transactionId))
        {
            return null;
        }

        PaddleTransaction? transaction;
        try
        {
            transaction = await paddleClient.GetTransactionAsync(transactionId, cancellationToken);
        }
        catch (PaddleApiException ex)
        {
            logger.LogWarning(ex, "Paddle checkout return failed to load {TransactionId}", transactionId);
            return null;
        }

        if (transaction is null || string.IsNullOrWhiteSpace(transaction.Id))
        {
            logger.LogInformation("Paddle checkout return: transaction {TransactionId} not found", transactionId);
            return null;
        }

        var tenant = await ResolveTenantAsync(transaction, cancellationToken);
        if (tenant is null)
        {
            logger.LogInformation(
                "Paddle checkout return: no tenant for transaction {TransactionId}",
                transaction.Id);
            return null;
        }

        var path = $"/dashboard?billing=success&session_id={Uri.EscapeDataString(transaction.Id)}";
        var redirectUrl = TenantPublicWebUrlBuilder.BuildTenantPath(
            publicWebOptions.Value.BaseUrl,
            tenant.Slug,
            path);
        return new PaddleCheckoutReturnMatch(redirectUrl, tenant.Id);
    }

    private async Task<Tenant?> ResolveTenantAsync(
        PaddleTransaction transaction,
        CancellationToken cancellationToken)
    {
        var customData = PaddleJson.ReadCustomData(transaction.CustomData);
        if (PaddleJson.TryGetGuid(customData, "tenant_id", out var tenantId))
        {
            var byId = await dbContext.Tenants
                .AsNoTracking()
                .FirstOrDefaultAsync(tenant => tenant.Id == tenantId, cancellationToken);
            if (byId is not null)
            {
                return byId;
            }
        }

        if (customData.TryGetValue("tenant_slug", out var slug) && !string.IsNullOrWhiteSpace(slug))
        {
            var normalized = slug.Trim().ToLowerInvariant();
            var bySlug = await dbContext.Tenants
                .AsNoTracking()
                .FirstOrDefaultAsync(tenant => tenant.Slug == normalized, cancellationToken);
            if (bySlug is not null)
            {
                return bySlug;
            }
        }

        if (string.IsNullOrWhiteSpace(transaction.CustomerId))
        {
            return null;
        }

        return await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(
                tenant => tenant.PaddleCustomerId == transaction.CustomerId,
                cancellationToken);
    }
}
