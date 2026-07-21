namespace Cohestra.Application.Tenants;

public interface ITenantPlanGate
{
    /// <summary>
    /// Campaigns (and campaign-adjacent APIs) require Pro or Enterprise.
    /// </summary>
    Task<TenantPlanGateResult> EvaluateCampaignsAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default);
}

public sealed record TenantPlanGateResult(bool Allowed, string? ErrorCode, string? Detail)
{
    public static TenantPlanGateResult Ok() => new(true, null, null);

    public static TenantPlanGateResult Locked(string detail) =>
        new(false, "plan_locked", detail);

    public static TenantPlanGateResult TenantNotFound(string detail) =>
        new(false, "tenant_not_found", detail);
}
