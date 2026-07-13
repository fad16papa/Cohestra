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

        var created = service.CreateToken(userId);

        Assert.False(string.IsNullOrWhiteSpace(created.Token));
        Assert.True(service.TryValidate(created.Token, out var validatedUserId));
        Assert.Equal(userId, validatedUserId);
    }

    [Fact]
    public void TryValidate_RejectsTamperedToken()
    {
        var service = CreateService();
        var created = service.CreateToken(Guid.NewGuid());

        Assert.False(service.TryValidate($"{created.Token}x", out _));
    }

    [Fact]
    public void TryValidate_RejectsExpiredToken()
    {
        var service = CreateService(lifetimeMinutes: 0);
        var created = service.CreateToken(Guid.NewGuid());

        Assert.False(service.TryValidate(created.Token, out _));
    }
}
