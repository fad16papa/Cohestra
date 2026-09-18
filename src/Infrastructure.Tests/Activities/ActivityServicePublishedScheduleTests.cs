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

public sealed class ActivityServicePublishedScheduleTests
{
    private static readonly Guid TestTenantId = Guid.Parse("33333333-3333-3333-3333-333333333333");

    [Fact]
    public async Task UpdateAsync_RejectsScheduleChangeWhenPublished()
    {
        await using var dbContext = CreateDbContext();
        SeedCatalog(dbContext);

        var activity = new Activity
        {
            Id = Guid.NewGuid(),
            TenantId = TestTenantId,
            Name = "Published clinic",
            Slug = "published-clinic",
            Category = "Tennis",
            Schedule = "Sat, 19 Sept 2026, 10:00 am",
            ScheduledStartsAt = new DateTimeOffset(2026, 9, 19, 2, 0, 0, TimeSpan.Zero),
            Location = "Court A",
            CommunityLabel = "Youth",
            Status = ActivityStatus.Published,
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
                    "Published clinic",
                    "Tennis",
                    "Sun, 20 Sept 2026, 11:00 am",
                    "Court A",
                    "Youth",
                    HeroImageUrl: null,
                    AccentColor: null),
                CancellationToken.None));

        Assert.Contains("cannot change schedule", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task UpdateAsync_RejectsScheduledStartsAtChangeWhenPublished()
    {
        await using var dbContext = CreateDbContext();
        SeedCatalog(dbContext);

        var activity = new Activity
        {
            Id = Guid.NewGuid(),
            TenantId = TestTenantId,
            Name = "Published clinic",
            Slug = "published-clinic-2",
            Category = "Tennis",
            Schedule = "Sat, 19 Sept 2026, 10:00 am",
            ScheduledStartsAt = new DateTimeOffset(2026, 9, 19, 2, 0, 0, TimeSpan.Zero),
            Location = "Court A",
            CommunityLabel = "Youth",
            Status = ActivityStatus.Published,
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
                    "Published clinic",
                    "Tennis",
                    "Sat, 19 Sept 2026, 10:00 am",
                    "Court A",
                    "Youth",
                    HeroImageUrl: null,
                    AccentColor: null,
                    ScheduledStartsAt: new DateTimeOffset(2026, 9, 20, 2, 0, 0, TimeSpan.Zero)),
                CancellationToken.None));

        Assert.Contains("cannot change schedule", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task UpdateAsync_DoesNotBackfillScheduledStartsAtWhenPublished()
    {
        await using var dbContext = CreateDbContext();
        SeedCatalog(dbContext);

        var activity = new Activity
        {
            Id = Guid.NewGuid(),
            TenantId = TestTenantId,
            Name = "Published clinic",
            Slug = "published-clinic-3",
            Category = "Tennis",
            Schedule = "Sat, 19 Sept 2026, 10:00 am",
            ScheduledStartsAt = null,
            Location = "Court A",
            CommunityLabel = "Youth",
            Status = ActivityStatus.Published,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        dbContext.Activities.Add(activity);
        await dbContext.SaveChangesAsync();

        var service = CreateService(dbContext);

        await service.UpdateAsync(
            activity.Id,
            new UpdateActivityRequest(
                "Published clinic",
                "Tennis",
                "Sat, 19 Sept 2026, 10:00 am",
                "Court A",
                "Youth",
                HeroImageUrl: null,
                AccentColor: null),
            CancellationToken.None);

        var reloaded = await dbContext.Activities.AsNoTracking().SingleAsync(a => a.Id == activity.Id);
        Assert.Null(reloaded.ScheduledStartsAt);
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
            "127.0.0.1:6379,abortConnect=false,connectTimeout=2000,syncTimeout=2000");
        return new ActivityService(
            dbContext,
            Options.Create(new PublicWebOptions()),
            new RedisPublicActivityCache(redis),
            currentTenant);
    }
}
