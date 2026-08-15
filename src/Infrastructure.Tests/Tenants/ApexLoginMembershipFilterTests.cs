using Cohestra.Application.Tenants;
using Cohestra.Domain.Tenants;

namespace Cohestra.Infrastructure.Tests.Tenants;

public sealed class ApexLoginMembershipFilterTests
{
    private static readonly Guid DefaultId = TenantIds.Default;
    private static readonly Guid CreativorareId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid AcmeId = Guid.Parse("33333333-3333-3333-3333-333333333333");

    [Fact]
    public void ForEmailFirstLogin_keeps_single_membership()
    {
        var input = new[]
        {
            new UserTenantMembership(CreativorareId, "creativorare", TenantMembershipRole.TenantAdmin),
        };

        var result = ApexLoginMembershipFilter.ForEmailFirstLogin(input);

        Assert.Single(result);
        Assert.Equal("creativorare", result[0].TenantSlug);
    }

    [Fact]
    public void ForEmailFirstLogin_drops_default_when_real_workspace_exists()
    {
        var input = new[]
        {
            new UserTenantMembership(DefaultId, TenantIds.DefaultSlug, TenantMembershipRole.TenantAdmin),
            new UserTenantMembership(CreativorareId, "creativorare", TenantMembershipRole.TenantAdmin),
        };

        var result = ApexLoginMembershipFilter.ForEmailFirstLogin(input);

        Assert.Single(result);
        Assert.Equal("creativorare", result[0].TenantSlug);
    }

    [Fact]
    public void ForEmailFirstLogin_keeps_multiple_non_default_workspaces()
    {
        var input = new[]
        {
            new UserTenantMembership(DefaultId, TenantIds.DefaultSlug, TenantMembershipRole.TenantAdmin),
            new UserTenantMembership(CreativorareId, "creativorare", TenantMembershipRole.TenantAdmin),
            new UserTenantMembership(AcmeId, "acme", TenantMembershipRole.TenantAdmin),
        };

        var result = ApexLoginMembershipFilter.ForEmailFirstLogin(input);

        Assert.Equal(2, result.Count);
        Assert.DoesNotContain(result, m => m.TenantSlug == TenantIds.DefaultSlug);
    }

    [Fact]
    public void ForEmailFirstLogin_keeps_only_default_when_no_other_workspace()
    {
        var input = new[]
        {
            new UserTenantMembership(DefaultId, TenantIds.DefaultSlug, TenantMembershipRole.TenantAdmin),
        };

        var result = ApexLoginMembershipFilter.ForEmailFirstLogin(input);

        Assert.Single(result);
        Assert.Equal(TenantIds.DefaultSlug, result[0].TenantSlug);
    }
}
