using Cohestra.Application.Tenants;
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
        var current = scopedServices.GetService<CurrentTenant>()
            ?? scopedServices.GetService<ICurrentTenant>() as CurrentTenant;

        if (current is not null)
        {
            current.SetResolved(TenantIds.Default, TenantIds.DefaultSlug);
            return;
        }

        // Minimal test harnesses omit tenancy DI entirely — allow silent skip.
        // If ICurrentTenant is registered but not backed by CurrentTenant, fail loud.
        if (scopedServices.GetService<ICurrentTenant>() is not null)
        {
            throw new InvalidOperationException(
                "SeedTenantContext requires CurrentTenant (concrete) to bind Platform 0. " +
                "Register CurrentTenant as scoped and map ICurrentTenant to it.");
        }
    }
}
