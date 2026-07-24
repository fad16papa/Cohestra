using Cohestra.Domain.Activities;
using Cohestra.Domain.Site;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Tests.Tenants;

public sealed class TenantIdModelTests
{
    [Fact]
    public void Activity_Slug_Unique_Is_Per_Tenant()
    {
        using var db = CreateDb();
        var entityType = db.Model.FindEntityType(typeof(Activity));
        Assert.NotNull(entityType);

        var index = entityType.GetIndexes().Single(i =>
            i.IsUnique
            && i.Properties.Count == 2
            && i.Properties[0].Name == nameof(Activity.TenantId)
            && i.Properties[1].Name == nameof(Activity.Slug));

        Assert.NotNull(index);
    }

    [Fact]
    public void SitePage_TenantId_Is_Unique()
    {
        using var db = CreateDb();
        var entityType = db.Model.FindEntityType(typeof(SitePage));
        Assert.NotNull(entityType);

        var index = entityType.GetIndexes().Single(i =>
            i.IsUnique
            && i.Properties.Count == 1
            && i.Properties[0].Name == nameof(SitePage.TenantId));

        Assert.NotNull(index);
    }

    [Fact]
    public void SaveChanges_Fills_Default_TenantId_When_Empty()
    {
        using var db = CreateDb();
        db.Tenants.Add(new Tenant
        {
            Id = TenantIds.Default,
            Slug = TenantIds.DefaultSlug,
            Name = "Default",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });
        db.SaveChanges();

        db.Activities.Add(new Activity
        {
            Id = Guid.NewGuid(),
            Name = "Test",
            Slug = "test-activity",
            Category = "General",
            Schedule = "TBD",
            Location = "TBD",
            CommunityLabel = "Default",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });
        db.SaveChanges();

        var activity = db.Activities.Single();
        Assert.Equal(TenantIds.Default, activity.TenantId);
    }

    private static CohestraDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new CohestraDbContext(options);
    }
}
