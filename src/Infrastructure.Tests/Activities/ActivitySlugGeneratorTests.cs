using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Tests.Activities;

public sealed class ActivitySlugGeneratorTests
{
    [Theory]
    [InlineData("FNM", "fnm")]
    [InlineData("Friday Night Magic", "friday-night-magic")]
    [InlineData("  Hello---World  ", "hello-world")]
    public void Slugify_NormalizesNames(string name, string expected)
    {
        Assert.Equal(expected, ActivitySlugGenerator.Slugify(name));
    }

    [Theory]
    [InlineData("fnm", true)]
    [InlineData("friday-night-magic", true)]
    [InlineData("", false)]
    [InlineData("FNM", false)]
    [InlineData("-fnm", false)]
    [InlineData("fnm-", false)]
    [InlineData("fnm--night", false)]
    [InlineData("fnm night", false)]
    public void IsValidSlug_EnforcesFormat(string slug, bool expected)
    {
        Assert.Equal(expected, ActivitySlugGenerator.IsValidSlug(slug));
    }

    [Fact]
    public async Task EnsureSlugForPublishAsync_RegeneratesEmptySlugFromName()
    {
        var tenantId = Guid.NewGuid();
        await using var db = CreateDbContext(tenantId);
        var activity = new Activity
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "FNM",
            Slug = "",
            Category = "Social",
            Schedule = "Friday",
            Location = "Hall",
            CommunityLabel = "MTG",
            Status = ActivityStatus.Draft,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        db.Activities.Add(activity);
        await db.SaveChangesAsync();

        await ActivitySlugGenerator.EnsureSlugForPublishAsync(db, activity, CancellationToken.None);

        Assert.Equal("fnm", activity.Slug);
    }

    [Fact]
    public async Task EnsureSlugForPublishAsync_RejectsDuplicateSlug()
    {
        var tenantId = Guid.NewGuid();
        await using var db = CreateDbContext(tenantId);
        var existing = new Activity
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Existing",
            Slug = "fnm",
            Category = "Social",
            Schedule = "Friday",
            Location = "Hall",
            CommunityLabel = "MTG",
            Status = ActivityStatus.Published,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        var draft = new Activity
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Other",
            Slug = "fnm",
            Category = "Social",
            Schedule = "Saturday",
            Location = "Hall",
            CommunityLabel = "MTG",
            Status = ActivityStatus.Draft,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        db.Activities.AddRange(existing, draft);
        await db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            ActivitySlugGenerator.EnsureSlugForPublishAsync(db, draft, CancellationToken.None));

        Assert.Contains("already in use", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    private static CohestraDbContext CreateDbContext(Guid tenantId)
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase($"activity-slug-{Guid.NewGuid():N}")
            .Options;

        var currentTenant = new CurrentTenant();
        currentTenant.SetResolved(tenantId, "creativorare");
        return new CohestraDbContext(options, currentTenant);
    }
}
