using Cohestra.Contracts.Activities;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace Cohestra.Infrastructure.Tests.Activities;

public sealed class ActivityServiceCatalogValidationTests
{
    private static readonly Guid TestTenantId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    [Fact]
    public async Task CreateAsync_RejectsUnknownCommunityLabel()
    {
        await using var dbContext = CreateDbContext();
        SeedCatalog(dbContext);
        await dbContext.SaveChangesAsync();

        var service = CreateService(dbContext);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateAsync(
                new CreateActivityRequest(
                    "Summer Clinic",
                    "Tennis",
                    "Weekly",
                    "Court A",
                    "Missing Community",
                    Status: "draft"),
                CancellationToken.None));

        Assert.Contains("Community 'Missing Community'", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task CreateAsync_RejectsUnknownCategory()
    {
        await using var dbContext = CreateDbContext();
        SeedCatalog(dbContext);
        await dbContext.SaveChangesAsync();

        var service = CreateService(dbContext);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateAsync(
                new CreateActivityRequest(
                    "Summer Clinic",
                    "Unknown Sport",
                    "Weekly",
                    "Court A",
                    "Youth",
                    Status: "draft"),
                CancellationToken.None));

        Assert.Contains("Category 'Unknown Sport'", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task UpdateAsync_RejectsUnknownCategory()
    {
        await using var dbContext = CreateDbContext();
        SeedCatalog(dbContext);

        var activity = new Activity
        {
            Id = Guid.NewGuid(),
            Name = "Existing",
            Slug = "existing",
            Category = "Tennis",
            Schedule = "Weekly",
            Location = "Court A",
            CommunityLabel = "Youth",
            Status = ActivityStatus.Draft,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        dbContext.Activities.Add(activity);
        await dbContext.SaveChangesAsync();

        var service = CreateService(dbContext);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.UpdateAsync(
                activity.Id,
                new UpdateActivityRequest(
                    "Existing",
                    "Unknown Sport",
                    "Weekly",
                    "Court A",
                    "Youth",
                    HeroImageUrl: null,
                    AccentColor: null),
                CancellationToken.None));

        Assert.Contains("Category 'Unknown Sport'", exception.Message, StringComparison.Ordinal);
    }

    private static void SeedCatalog(CohestraDbContext dbContext)
    {
        var now = DateTimeOffset.UtcNow;
        dbContext.Communities.Add(new Community
        {
            Id = Guid.NewGuid(),
            Name = "Youth",
            CreatedAt = now,
            UpdatedAt = now,
        });
        dbContext.Categories.Add(new Category
        {
            Id = Guid.NewGuid(),
            Name = "Tennis",
            CreatedAt = now,
            UpdatedAt = now,
        });
    }

    private static CohestraDbContext CreateDbContext()
    {
        var currentTenant = new CurrentTenant();
        currentTenant.SetResolved(TestTenantId, "test");

        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        var dbContext = new CohestraDbContext(options, currentTenant);
        var now = DateTimeOffset.UtcNow;
        dbContext.Tenants.Add(new Tenant
        {
            Id = TestTenantId,
            Slug = "test",
            Name = "Test Tenant",
            CreatedAt = now,
            UpdatedAt = now,
            RegistrationTimeZoneId = "UTC",
        });
        dbContext.SaveChanges();
        return dbContext;
    }

    private static ActivityService CreateService(CohestraDbContext dbContext)
    {
        var currentTenant = new CurrentTenant();
        currentTenant.SetResolved(TestTenantId, "test");
        var redis = ConnectionMultiplexer.Connect(
            "127.0.0.1:6379,abortConnect=false,connectTimeout=50,syncTimeout=50");
        return new ActivityService(
            dbContext,
            Options.Create(new PublicWebOptions()),
            new RedisPublicActivityCache(redis),
            currentTenant);
    }
}
