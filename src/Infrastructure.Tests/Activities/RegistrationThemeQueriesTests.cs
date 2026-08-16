using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Tests.Activities;

public sealed class RegistrationThemeQueriesTests
{
    [Fact]
    public async Task ResolveForActivityAsync_UsesCommunityDefaultHeroWhenThemeInheritsAndActivityHeroNull()
    {
        const string communityAssetId = "33333333-3333-3333-3333-333333333333";
        await using var dbContext = CreateDbContext();
        var tenantId = Guid.NewGuid();

        dbContext.Communities.Add(new Community
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Board Games",
            DefaultHeroImageUrl = $"/api/v1/public/campaign-assets/{communityAssetId}",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });

        await dbContext.SaveChangesAsync();

        var activity = new Activity
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "FNM",
            Slug = "fnm",
            Category = "Social",
            CommunityLabel = "Board Games",
            HeroImageUrl = null,
            RegistrationTheme = new RegistrationTheme { InheritCommunityBrand = true },
            Status = ActivityStatus.Published,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        var resolved = await RegistrationThemeQueries.ResolveForActivityAsync(
            dbContext,
            activity);

        Assert.Contains(communityAssetId, resolved.HeroImageUrl ?? string.Empty);
    }

    private static CohestraDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new CohestraDbContext(options);
    }
}
