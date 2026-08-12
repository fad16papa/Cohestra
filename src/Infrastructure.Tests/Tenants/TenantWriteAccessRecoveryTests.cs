using Cohestra.Api.Infrastructure;

namespace Cohestra.Infrastructure.Tests.Tenants;

public sealed class TenantWriteAccessRecoveryTests
{
    [Theory]
    [InlineData("POST", "/api/v1/admin/activities/11111111-1111-1111-1111-111111111111/archive", true)]
    [InlineData("POST", "/api/v1/admin/activities/11111111-1111-1111-1111-111111111111/unpublish", true)]
    [InlineData("DELETE", "/api/v1/admin/team/members/11111111-1111-1111-1111-111111111111", true)]
    [InlineData("DELETE", "/api/v1/admin/team/invites/11111111-1111-1111-1111-111111111111", true)]
    [InlineData("DELETE", "/api/v1/admin/communities/11111111-1111-1111-1111-111111111111", true)]
    [InlineData("POST", "/api/v1/admin/activities", false)]
    [InlineData("PATCH", "/api/v1/admin/activities/11111111-1111-1111-1111-111111111111", false)]
    [InlineData("GET", "/api/v1/admin/activities/11111111-1111-1111-1111-111111111111/archive", false)]
    public void IsLimitRecoveryWrite_MatchesExpectedPaths(string method, string path, bool expected)
    {
        Assert.Equal(expected, TenantWriteAccessMiddleware.IsLimitRecoveryWrite(method, path));
    }
}
