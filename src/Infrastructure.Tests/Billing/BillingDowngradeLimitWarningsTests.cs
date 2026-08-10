using Cohestra.Application.Tenants;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Billing;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class BillingDowngradeLimitWarningsTests
{
    [Fact]
    public void Build_warns_when_communities_exceed_core_limits()
    {
        var usage = new TenantUsageSnapshot(2, 10, 5, 100);

        var warnings = BillingDowngradeLimitWarnings.Build(usage, TenantPlan.Core);

        Assert.Contains(warnings, warning => warning.Contains("Communities"));
    }

    [Fact]
    public void Build_returns_empty_when_usage_fits_core_limits()
    {
        var usage = new TenantUsageSnapshot(2, 2, 5, 100);

        var warnings = BillingDowngradeLimitWarnings.Build(usage, TenantPlan.Core);

        Assert.Empty(warnings);
    }
}
