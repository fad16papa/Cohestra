using Cohestra.Domain.Activities;
using Cohestra.Domain.Registrations;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace Cohestra.Infrastructure.Tests.Activities;

public sealed class ActivityServiceListSortTests
{
    private static readonly Guid TestTenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");

    [Fact]
    public async Task ListAsync_DefaultSort_OrdersByUpdatedAtDescending()
    {
        var now = DateTimeOffset.UtcNow;
        await using var dbContext = CreateDbContext();

        var older = SeedActivity(dbContext, "Older Activity", now.AddDays(-2), now.AddDays(-1));
        var newer = SeedActivity(dbContext, "Newer Activity", now.AddDays(-2), now);

        await dbContext.SaveChangesAsync();

        var service = CreateService(dbContext);
        var result = await service.ListAsync(
            status: null,
            category: null,
            community: null,
            search: null,
            page: 1,
            pageSize: 25);

        Assert.Equal(2, result.TotalCount);
        Assert.Equal(newer.Id, result.Items[0].Id);
        Assert.Equal(older.Id, result.Items[1].Id);
    }

    [Fact]
    public async Task ListAsync_SortByNameAscending_OrdersAlphabetically()
    {
        var now = DateTimeOffset.UtcNow;
        await using var dbContext = CreateDbContext();

        var zebra = SeedActivity(dbContext, "Zebra Clinic", now, now);
        var alpha = SeedActivity(dbContext, "Alpha Clinic", now, now);

        await dbContext.SaveChangesAsync();

        var service = CreateService(dbContext);
        var result = await service.ListAsync(
            status: null,
            category: null,
            community: null,
            search: null,
            page: 1,
            pageSize: 25,
            sortBy: "name",
            sortDirection: "asc");

        Assert.Equal(alpha.Id, result.Items[0].Id);
        Assert.Equal(zebra.Id, result.Items[1].Id);
    }

    [Fact]
    public async Task ListAsync_SortByRegistrationCountDescending_OrdersByHighestCount()
    {
        var now = DateTimeOffset.UtcNow;
        await using var dbContext = CreateDbContext();

        var low = SeedActivity(dbContext, "Low Volume", now, now);
        var high = SeedActivity(dbContext, "High Volume", now, now);

        dbContext.Registrations.AddRange(
            new Registration
            {
                Id = Guid.NewGuid(),
                RegistrationNumber = "REG20260101000021",
                ActivityId = low.Id,
                ClientId = Guid.NewGuid(),
                CreatedAt = now,
            },
            new Registration
            {
                Id = Guid.NewGuid(),
                RegistrationNumber = "REG20260101000022",
                ActivityId = high.Id,
                ClientId = Guid.NewGuid(),
                CreatedAt = now,
            },
            new Registration
            {
                Id = Guid.NewGuid(),
                RegistrationNumber = "REG20260101000023",
                ActivityId = high.Id,
                ClientId = Guid.NewGuid(),
                CreatedAt = now,
            });

        await dbContext.SaveChangesAsync();

        var service = CreateService(dbContext);
        var result = await service.ListAsync(
            status: null,
            category: null,
            community: null,
            search: null,
            page: 1,
            pageSize: 25,
            sortBy: "registrationCount",
            sortDirection: "desc");

        Assert.Equal(high.Id, result.Items[0].Id);
        Assert.Equal(2, result.Items[0].RegistrationCount);
        Assert.Equal(low.Id, result.Items[1].Id);
        Assert.Equal(1, result.Items[1].RegistrationCount);
    }

    private static Activity SeedActivity(
        CohestraDbContext dbContext,
        string name,
        DateTimeOffset createdAt,
        DateTimeOffset updatedAt)
    {
        var activity = new Activity
        {
            Id = Guid.NewGuid(),
            Name = name,
            Slug = $"test-{Guid.NewGuid():N}",
            Category = "tennis",
            Schedule = "Weekly",
            Location = "Court A",
            CommunityLabel = "Test Community",
            Status = ActivityStatus.Published,
            CreatedAt = createdAt,
            UpdatedAt = updatedAt,
        };

        dbContext.Activities.Add(activity);
        return activity;
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
        // ListAsync does not touch Redis; lazy connect avoids failures when Redis is down.
        var redis = ConnectionMultiplexer.Connect(
            "127.0.0.1:6379,abortConnect=false,connectTimeout=50,syncTimeout=50");
        return new ActivityService(
            dbContext,
            Options.Create(new PublicWebOptions()),
            new RedisPublicActivityCache(redis),
            currentTenant);
    }
}
