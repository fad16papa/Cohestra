using Cohestra.Domain.Activities;
using Cohestra.Domain.Clients;
using Cohestra.Domain.Registrations;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Clients;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Tests.Clients;

public sealed class ClientServiceListFilterTests
{
    private static readonly Guid TestTenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    [Fact]
    public async Task ListAsync_RegisteredWithinDays_IncludesReturningClientWithRecentRegistration()
    {
        var now = DateTimeOffset.UtcNow;
        await using var dbContext = CreateDbContext();
        var activity = SeedActivity(dbContext, now.AddDays(-60));

        var returningClient = new Client
        {
            Id = Guid.NewGuid(),
            FullName = "Returning Client",
            CreatedAt = now.AddDays(-30),
            UpdatedAt = now.AddDays(-1),
            LeadStatus = LeadStatus.New,
        };

        var staleClient = new Client
        {
            Id = Guid.NewGuid(),
            FullName = "Stale Client",
            CreatedAt = now.AddDays(-30),
            UpdatedAt = now.AddDays(-30),
            LeadStatus = LeadStatus.New,
        };

        dbContext.Clients.AddRange(returningClient, staleClient);
        dbContext.Registrations.AddRange(
            new Registration
            {
                Id = Guid.NewGuid(),
                RegistrationNumber = "REG20260101000001",
                ActivityId = activity.Id,
                ClientId = returningClient.Id,
                CreatedAt = now.AddDays(-1),
            },
            new Registration
            {
                Id = Guid.NewGuid(),
                RegistrationNumber = "REG20260101000002",
                ActivityId = activity.Id,
                ClientId = staleClient.Id,
                CreatedAt = now.AddDays(-30),
            });

        await dbContext.SaveChangesAsync();

        var service = CreateService(dbContext);
        var result = await service.ListAsync(
            page: 1,
            pageSize: 25,
            sortBy: "lastRegistrationDate",
            sortDirection: "desc",
            mergeSuspect: null,
            createdWithinDays: null,
            registeredWithinDays: 7,
            followUpDue: null,
            withoutOutreach: null,
            leadStatus: null,
            nationality: null,
            search: null,
            community: null);

        Assert.Equal(1, result.TotalCount);
        Assert.Single(result.Items);
        Assert.Equal(returningClient.Id, result.Items[0].Id);
        Assert.Equal(2, result.StatusCounts.NewCount);
    }

    [Fact]
    public async Task ListAsync_CreatedWithinDays_ExcludesReturningClientWithRecentRegistrationOnly()
    {
        var now = DateTimeOffset.UtcNow;
        await using var dbContext = CreateDbContext();
        var activity = SeedActivity(dbContext, now.AddDays(-60));

        var returningClient = new Client
        {
            Id = Guid.NewGuid(),
            FullName = "Returning Client",
            CreatedAt = now.AddDays(-30),
            UpdatedAt = now.AddDays(-1),
            LeadStatus = LeadStatus.New,
        };

        dbContext.Clients.Add(returningClient);
        dbContext.Registrations.Add(new Registration
        {
            Id = Guid.NewGuid(),
            RegistrationNumber = "REG20260101000003",
            ActivityId = activity.Id,
            ClientId = returningClient.Id,
            CreatedAt = now.AddDays(-1),
        });

        await dbContext.SaveChangesAsync();

        var service = CreateService(dbContext);
        var result = await service.ListAsync(
            page: 1,
            pageSize: 25,
            sortBy: null,
            sortDirection: null,
            mergeSuspect: null,
            createdWithinDays: 7,
            registeredWithinDays: null,
            followUpDue: null,
            withoutOutreach: null,
            leadStatus: null,
            nationality: null,
            search: null,
            community: null);

        Assert.Equal(0, result.TotalCount);
        Assert.Empty(result.Items);
        Assert.Equal(1, result.StatusCounts.NewCount);
    }

    [Fact]
    public async Task ListAsync_SearchByPhone_IncludesMatchingClient()
    {
        var now = DateTimeOffset.UtcNow;
        await using var dbContext = CreateDbContext();

        var matchingClient = new Client
        {
            Id = Guid.NewGuid(),
            FullName = "Phone Match",
            Phone = "+65 9123 4567",
            NormalizedPhone = "+6591234567",
            CreatedAt = now,
            UpdatedAt = now,
            LeadStatus = LeadStatus.New,
        };

        var otherClient = new Client
        {
            Id = Guid.NewGuid(),
            FullName = "Other Client",
            Phone = "+65 8000 1111",
            NormalizedPhone = "+6580001111",
            CreatedAt = now,
            UpdatedAt = now,
            LeadStatus = LeadStatus.Active,
        };

        dbContext.Clients.AddRange(matchingClient, otherClient);
        await dbContext.SaveChangesAsync();

        var service = CreateService(dbContext);
        var result = await service.ListAsync(
            page: 1,
            pageSize: 25,
            sortBy: null,
            sortDirection: null,
            mergeSuspect: null,
            createdWithinDays: null,
            registeredWithinDays: null,
            followUpDue: null,
            withoutOutreach: null,
            leadStatus: null,
            nationality: null,
            search: "9123",
            community: null);

        Assert.Equal(1, result.TotalCount);
        Assert.Equal(matchingClient.Id, result.Items[0].Id);
        Assert.Equal("+65 9123 4567", result.Items[0].Phone);
    }

    [Fact]
    public async Task ListAsync_IncludesLastOutreachFromTimeline()
    {
        var now = DateTimeOffset.UtcNow;
        await using var dbContext = CreateDbContext();

        var client = new Client
        {
            Id = Guid.NewGuid(),
            FullName = "Outreach Client",
            Phone = "+65 9000 0001",
            CreatedAt = now,
            UpdatedAt = now,
            LeadStatus = LeadStatus.Contacted,
        };

        dbContext.Clients.Add(client);
        dbContext.ClientTimelineEvents.Add(new ClientTimelineEvent
        {
            Id = Guid.NewGuid(),
            ClientId = client.Id,
            EventType = ClientTimelineEventType.WhatsAppInitiated,
            OccurredAt = now.AddDays(-2),
        });

        await dbContext.SaveChangesAsync();

        var service = CreateService(dbContext);
        var result = await service.ListAsync(
            page: 1,
            pageSize: 25,
            sortBy: null,
            sortDirection: null,
            mergeSuspect: null,
            createdWithinDays: null,
            registeredWithinDays: null,
            followUpDue: null,
            withoutOutreach: null,
            leadStatus: null,
            nationality: null,
            search: null,
            community: null);

        Assert.Single(result.Items);
        Assert.Equal("whatsapp", result.Items[0].LastOutreachKind);
        Assert.NotNull(result.Items[0].LastOutreachAt);
    }

    [Fact]
    public async Task ListAsync_StatusCounts_AreTenantWide()
    {
        var now = DateTimeOffset.UtcNow;
        await using var dbContext = CreateDbContext();

        dbContext.Clients.AddRange(
            new Client
            {
                Id = Guid.NewGuid(),
                FullName = "New Lead",
                CreatedAt = now,
                UpdatedAt = now,
                LeadStatus = LeadStatus.New,
            },
            new Client
            {
                Id = Guid.NewGuid(),
                FullName = "Active Member",
                CreatedAt = now,
                UpdatedAt = now,
                LeadStatus = LeadStatus.Active,
            },
            new Client
            {
                Id = Guid.NewGuid(),
                FullName = "Suspect",
                CreatedAt = now,
                UpdatedAt = now,
                LeadStatus = LeadStatus.New,
                IsMergeSuspect = true,
            });

        await dbContext.SaveChangesAsync();

        var service = CreateService(dbContext);
        var result = await service.ListAsync(
            page: 1,
            pageSize: 25,
            sortBy: null,
            sortDirection: null,
            mergeSuspect: null,
            createdWithinDays: null,
            registeredWithinDays: null,
            followUpDue: null,
            withoutOutreach: null,
            leadStatus: "new",
            nationality: null,
            search: null,
            community: null);

        Assert.Equal(2, result.TotalCount);
        Assert.Equal(2, result.StatusCounts.NewCount);
        Assert.Equal(1, result.StatusCounts.ActiveCount);
        Assert.Equal(1, result.StatusCounts.MergeSuspectCount);
    }

    private static Activity SeedActivity(CohestraDbContext dbContext, DateTimeOffset createdAt)
    {
        var activity = new Activity
        {
            Id = Guid.NewGuid(),
            Name = "Test Activity",
            Slug = $"test-{Guid.NewGuid():N}",
            Category = "tennis",
            Schedule = "Weekly",
            Location = "Court A",
            CommunityLabel = "Test Community",
            Status = ActivityStatus.Published,
            CreatedAt = createdAt,
            UpdatedAt = createdAt,
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

    private static ClientService CreateService(CohestraDbContext dbContext)
    {
        var currentTenant = new CurrentTenant();
        currentTenant.SetResolved(TestTenantId, "test");
        return new ClientService(dbContext, currentTenant);
    }
}
