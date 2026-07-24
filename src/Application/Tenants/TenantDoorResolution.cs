using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;

namespace Cohestra.Application.Tenants;

public enum TenantDoorKind
{
    Marketing,
    Unknown,
    Suspended,
    Archived,
    Active,
}

public sealed record TenantDoorResolution(
    TenantDoorKind Kind,
    Guid? TenantId,
    string? Slug,
    string? TenantName,
    TenantPlan? Plan,
    BillingStatus? BillingStatus,
    string? ErrorDetail)
{
    public static TenantDoorResolution Marketing() =>
        new(TenantDoorKind.Marketing, null, null, null, null, null, null);

    public static TenantDoorResolution Unknown(string? detail = null) =>
        new(TenantDoorKind.Unknown, null, null, null, null, null, detail);

    public static TenantDoorResolution Suspended(Guid tenantId, string slug, string name, TenantPlan plan) =>
        new(TenantDoorKind.Suspended, tenantId, slug, name, plan, null, null);

    public static TenantDoorResolution Archived(Guid tenantId, string slug, string name) =>
        new(TenantDoorKind.Archived, tenantId, slug, name, null, null, null);

    public static TenantDoorResolution Active(
        Guid tenantId,
        string slug,
        string name,
        TenantPlan plan,
        BillingStatus billingStatus) =>
        new(TenantDoorKind.Active, tenantId, slug, name, plan, billingStatus, null);
}
