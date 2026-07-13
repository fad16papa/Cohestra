using LeadGenerationCrm.Domain.Activities;
using LeadGenerationCrm.Domain.Clients;
using LeadGenerationCrm.Domain.Registrations;
using LeadGenerationCrm.Infrastructure.Clients;
using LeadGenerationCrm.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LeadGenerationCrm.Infrastructure.Tests.Clients;

public sealed class ClientServiceListFilterTests
{
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

        var service = new ClientService(dbContext);
        var result = await service.ListAsync(
            page: 1,
            pageSize: 25,
            sortBy: "lastRegistrationDate",
            sortDirection: "desc",
            mergeSuspect: null,
            createdWithinDays: null,
            registeredWithinDays: 7,
            leadStatus: null,
            nationality: null,
            search: null,
            community: null);

        Assert.Equal(1, result.TotalCount);
        Assert.Single(result.Items);
        Assert.Equal(returningClient.Id, result.Items[0].Id);
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

        var service = new ClientService(dbContext);
        var result = await service.ListAsync(
            page: 1,
            pageSize: 25,
            sortBy: null,
            sortDirection: null,
            mergeSuspect: null,
            createdWithinDays: 7,
            registeredWithinDays: null,
            leadStatus: null,
            nationality: null,
            search: null,
            community: null);

        Assert.Equal(0, result.TotalCount);
        Assert.Empty(result.Items);
    }

    private static Activity SeedActivity(LeadGenerationCrmDbContext dbContext, DateTimeOffset createdAt)
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

    private static LeadGenerationCrmDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<LeadGenerationCrmDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new LeadGenerationCrmDbContext(options);
    }
}
