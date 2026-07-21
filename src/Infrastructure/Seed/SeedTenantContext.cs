using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Infrastructure.Seed;

/// <summary>
/// Seed scopes run outside HTTP; bind Platform 0 so EF tenant filters see existing rows.
/// </summary>
internal static class SeedTenantContext
{
    public static void BindPlatformZero(IServiceProvider scopedServices)
    {
        var current = scopedServices.GetService<CurrentTenant>();
        if (current is null)
        {
            // Test harnesses that construct a minimal ServiceProvider without tenancy DI.
            return;
        }

        current.SetResolved(TenantIds.Default, TenantIds.DefaultSlug);
    }
}
