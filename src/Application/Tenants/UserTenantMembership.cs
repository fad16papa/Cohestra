using Cohestra.Domain.Tenants;

namespace Cohestra.Application.Tenants;

public sealed record UserTenantMembership(
    Guid TenantId,
    string TenantSlug,
    TenantMembershipRole Role);
