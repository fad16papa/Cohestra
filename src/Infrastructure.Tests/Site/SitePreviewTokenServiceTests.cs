using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Site;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Tests.Site;

public sealed class SitePreviewTokenServiceTests
{
    private static SitePreviewTokenService CreateService(int lifetimeMinutes = 60) =>
        new(
            Options.Create(new JwtSettings
            {
                SigningKey = "test-preview-token-signing-key-min-32-chars",
            }),
            Options.Create(new SitePreviewSettings { TokenLifetimeMinutes = lifetimeMinutes }));

    [Fact]
    public void CreateToken_AndTryValidate_SucceedsForMatchingToken()
    {
        var service = CreateService();
        var userId = Guid.Parse("11111111-1111-1111-1111-111111111111");
        var tenantId = TenantIds.Default;

        var created = service.CreateToken(userId, tenantId);

        Assert.False(string.IsNullOrWhiteSpace(created.Token));
        Assert.True(service.TryValidate(created.Token, out var validatedUserId, out var validatedTenantId));
        Assert.Equal(userId, validatedUserId);
        Assert.Equal(tenantId, validatedTenantId);
    }

    [Fact]
    public void TryValidate_RejectsTamperedToken()
    {
        var service = CreateService();
        var created = service.CreateToken(Guid.NewGuid(), TenantIds.Default);

        Assert.False(service.TryValidate($"{created.Token}x", out _, out _));
    }

    [Fact]
    public void TryValidate_RejectsExpiredToken()
    {
        var service = CreateService(lifetimeMinutes: 0);
        var created = service.CreateToken(Guid.NewGuid(), TenantIds.Default);

        Assert.False(service.TryValidate(created.Token, out _, out _));
    }

    [Fact]
    public void CreateToken_RejectsEmptyTenantId()
    {
        var service = CreateService();
        Assert.Throws<ArgumentException>(() => service.CreateToken(Guid.NewGuid(), Guid.Empty));
    }

    [Fact]
    public void TryValidate_PreservesTenantIdForHostMismatchChecks()
    {
        var service = CreateService();
        var mintedTenant = TenantIds.Default;
        var otherTenant = Guid.CreateVersion7();
        var created = service.CreateToken(Guid.NewGuid(), mintedTenant);

        Assert.True(service.TryValidate(created.Token, out _, out var tokenTenantId));
        Assert.Equal(mintedTenant, tokenTenantId);
        Assert.NotEqual(otherTenant, tokenTenantId);
    }
}
