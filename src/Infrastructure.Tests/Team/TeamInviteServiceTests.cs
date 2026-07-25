using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Team;

namespace Cohestra.Infrastructure.Tests.Team;

public sealed class TeamInviteServiceTests
{
    [Fact]
    public void HashToken_IsDeterministic()
    {
        var a = TeamInviteService.HashToken("test-token");
        var b = TeamInviteService.HashToken("test-token");
        Assert.Equal(a, b);
        Assert.NotEqual(TeamInviteService.HashToken("other"), a);
    }

    [Fact]
    public void GenerateToken_ProducesDistinctValues()
    {
        var a = TeamInviteService.GenerateToken();
        var b = TeamInviteService.GenerateToken();
        Assert.NotEqual(a, b);
        Assert.True(a.Length >= 32);
    }

    [Fact]
    public void TenantInvite_IsPending_respects_revoke_expiry_accept()
    {
        var now = DateTimeOffset.UtcNow;
        var invite = new TenantInvite
        {
            ExpiresAt = now.AddDays(1),
        };

        Assert.True(invite.IsPending(now));

        invite.RevokedAt = now;
        Assert.False(invite.IsPending(now));

        invite.RevokedAt = null;
        invite.AcceptedAt = now;
        Assert.False(invite.IsPending(now));

        invite.AcceptedAt = null;
        invite.ExpiresAt = now.AddMinutes(-1);
        Assert.False(invite.IsPending(now));
    }
}
