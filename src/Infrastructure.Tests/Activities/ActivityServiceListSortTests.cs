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

    [Fact]
    public async Task ListAsync_DefaultUnfiltered_PlacesArchivedAfterActionableRows()
    {
        var now = DateTimeOffset.UtcNow;
        await using var dbContext = CreateDbContext();

        var archived = SeedActivity(
            dbContext,
            "Just Archived",
            now.AddDays(-3),
            now,
            ActivityStatus.Archived);
        var draft = SeedActivity(
            dbContext,
            "Older Draft",
            now.AddDays(-2),
            now.AddHours(-2),
            ActivityStatus.Draft);
        var published = SeedActivity(
            dbContext,
            "Older Published",
            now.AddDays(-2),
            now.AddHours(-1),
            ActivityStatus.Published);

        await dbContext.SaveChangesAsync();

        var service = CreateService(dbContext);
        var result = await service.ListAsync(
            status: null,
            category: null,
            community: null,
            search: null,
            page: 1,
            pageSize: 25);

        Assert.Equal(3, result.TotalCount);
        Assert.Equal(new[] { published.Id, draft.Id, archived.Id }, result.Items.Select(item => item.Id).ToArray());
        Assert.DoesNotContain(
            result.Items.TakeWhile(item => item.Status != ActivityStatus.Archived.ToString().ToLowerInvariant()),
            item => string.Equals(item.Status, "archived", StringComparison.OrdinalIgnoreCase));
        Assert.Equal("archived", result.Items[^1].Status);
    }

    [Fact]
    public async Task ListAsync_UnfilteredPaging_DoesNotLeadWithArchivedWhileActionableExists()
    {
        var now = DateTimeOffset.UtcNow;
        await using var dbContext = CreateDbContext();

        SeedActivity(dbContext, "Archived Newest", now.AddDays(-4), now, ActivityStatus.Archived);
        var draft = SeedActivity(dbContext, "Draft Older", now.AddDays(-3), now.AddHours(-3), ActivityStatus.Draft);
        var published = SeedActivity(
            dbContext,
            "Published Older",
            now.AddDays(-3),
            now.AddHours(-2),
            ActivityStatus.Published);

        await dbContext.SaveChangesAsync();

        var service = CreateService(dbContext);
        var page1 = await service.ListAsync(null, null, null, null, page: 1, pageSize: 1);
        var page2 = await service.ListAsync(null, null, null, null, page: 2, pageSize: 1);
        var page3 = await service.ListAsync(null, null, null, null, page: 3, pageSize: 1);

        Assert.Equal(3, page1.TotalCount);
        Assert.Equal("published", page1.Items[0].Status);
        Assert.Equal(published.Id, page1.Items[0].Id);
        Assert.Equal("draft", page2.Items[0].Status);
        Assert.Equal(draft.Id, page2.Items[0].Id);
        Assert.Equal("archived", page3.Items[0].Status);
    }

    [Fact]
    public async Task ListAsync_EqualUpdatedAt_UsesIdAscendingTieBreak()
    {
        var now = DateTimeOffset.UtcNow;
        await using var dbContext = CreateDbContext();

        var laterId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
        var earlierId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        SeedActivity(dbContext, "Later Id", now, now, ActivityStatus.Published, laterId);
        SeedActivity(dbContext, "Earlier Id", now, now, ActivityStatus.Published, earlierId);

        await dbContext.SaveChangesAsync();

        var service = CreateService(dbContext);
        var first = await service.ListAsync(null, null, null, null, page: 1, pageSize: 25);
        var second = await service.ListAsync(null, null, null, null, page: 1, pageSize: 25);

        Assert.Equal(new[] { earlierId, laterId }, first.Items.Select(item => item.Id).ToArray());
        Assert.Equal(first.Items.Select(item => item.Id), second.Items.Select(item => item.Id));
    }

    [Fact]
    public async Task ListAsync_ArchivedFilter_RemainsTruthfulAndSorted()
    {
        var now = DateTimeOffset.UtcNow;
        await using var dbContext = CreateDbContext();

        var olderArchived = SeedActivity(
            dbContext,
            "Older Archived",
            now.AddDays(-5),
            now.AddDays(-1),
            ActivityStatus.Archived);
        var newerArchived = SeedActivity(
            dbContext,
            "Newer Archived",
            now.AddDays(-4),
            now,
            ActivityStatus.Archived);
        SeedActivity(dbContext, "Hidden Draft", now, now.AddHours(-1), ActivityStatus.Draft);

        await dbContext.SaveChangesAsync();

        var service = CreateService(dbContext);
        var result = await service.ListAsync(
            status: "archived",
            category: null,
            community: null,
            search: null,
            page: 1,
            pageSize: 25);

        Assert.Equal(2, result.TotalCount);
        Assert.All(result.Items, item => Assert.Equal("archived", item.Status));
        Assert.Equal(newerArchived.Id, result.Items[0].Id);
        Assert.Equal(olderArchived.Id, result.Items[1].Id);
    }

    [Fact]
    public async Task ListAsync_NameSortUnfiltered_StillKeepsArchivedLast()
    {
        var now = DateTimeOffset.UtcNow;
        await using var dbContext = CreateDbContext();

        SeedActivity(dbContext, "Alpha Archived", now, now, ActivityStatus.Archived);
        var zebra = SeedActivity(dbContext, "Zebra Published", now, now, ActivityStatus.Published);

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

        Assert.Equal(zebra.Id, result.Items[0].Id);
        Assert.Equal("archived", result.Items[1].Status);
    }

    private static Activity SeedActivity(
        CohestraDbContext dbContext,
        string name,
        DateTimeOffset createdAt,
        DateTimeOffset updatedAt,
        ActivityStatus status = ActivityStatus.Published,
        Guid? id = null)
    {
        var activity = new Activity
        {
            Id = id ?? Guid.NewGuid(),
            Name = name,
            Slug = $"test-{Guid.NewGuid():N}",
            Category = "tennis",
            Schedule = "Weekly",
            Location = "Court A",
            CommunityLabel = "Test Community",
            Status = status,
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
