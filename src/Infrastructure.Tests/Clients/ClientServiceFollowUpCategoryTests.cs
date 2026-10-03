using Cohestra.Application.Clients;
using Cohestra.Domain.Clients;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Clients;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Tests.Clients;

public sealed class ClientServiceFollowUpCategoryTests
{
    private static readonly Guid TestTenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid ForeignTenantId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    [Fact]
    public async Task ListAsync_FollowUpCategory_UsesAcceptedFirstMatchContract()
    {
        var now = DateTimeOffset.UtcNow;
        await using var dbContext = CreateDbContext();

        var dueActive = SeedClient(dbContext, "Due Active", LeadStatus.Active, now, nextFollowUpAt: now.AddDays(-1));
        var newNoOutreach = SeedClient(dbContext, "New Quiet", LeadStatus.New, now);
        var newWithOutreach = SeedClient(dbContext, "New Talked", LeadStatus.New, now);
        AddOutreach(dbContext, newWithOutreach, now.AddDays(-2));
        var inactive = SeedClient(dbContext, "Inactive Quiet", LeadStatus.Inactive, now);
        var contacted = SeedClient(dbContext, "Contacted", LeadStatus.Contacted, now);
        var healthy = SeedClient(dbContext, "Healthy Active", LeadStatus.Active, now);
        var inactiveButDue = SeedClient(dbContext, "Inactive Due", LeadStatus.Inactive, now, nextFollowUpAt: now.AddHours(-2));

        await dbContext.SaveChangesAsync();

        var service = CreateService(dbContext);

        var dueNow = await ListFollowUp(service, FollowUpCategoryContract.DueNow);
        Assert.Equal(3, dueNow.TotalCount);
        Assert.Equal(
            new[] { dueActive.Id, newNoOutreach.Id, inactiveButDue.Id }.OrderBy(id => id),
            dueNow.Items.Select(item => item.Id).OrderBy(id => id));

        var atRisk = await ListFollowUp(service, FollowUpCategoryContract.AtRisk);
        Assert.Equal(new[] { inactive.Id }, atRisk.Items.Select(item => item.Id));

        var opportunity = await ListFollowUp(service, FollowUpCategoryContract.Opportunity);
        Assert.Equal(
            new[] { newWithOutreach.Id, contacted.Id }.OrderBy(id => id),
            opportunity.Items.Select(item => item.Id).OrderBy(id => id));

        var healthyList = await ListFollowUp(service, FollowUpCategoryContract.Healthy);
        Assert.Equal(new[] { healthy.Id }, healthyList.Items.Select(item => item.Id));
    }

    [Fact]
    public async Task ListAsync_FollowUpCategory_TotalsAreTenantScopedAndExcludeHealthyFromNeedsAttention()
    {
        var now = DateTimeOffset.UtcNow;
        await using var dbContext = CreateDbContext();

        SeedClient(dbContext, "Due", LeadStatus.New, now);
        SeedClient(dbContext, "Risk", LeadStatus.Inactive, now);
        SeedClient(dbContext, "Opp", LeadStatus.Contacted, now);
        SeedClient(dbContext, "Healthy A", LeadStatus.Active, now);
        SeedClient(dbContext, "Healthy B", LeadStatus.Active, now);
        SeedForeignClient(dbContext, "Foreign Due", LeadStatus.New, now);

        await dbContext.SaveChangesAsync();

        var result = await ListFollowUp(CreateService(dbContext), FollowUpCategoryContract.DueNow);

        Assert.NotNull(result.FollowUpCategoryCounts);
        Assert.Equal(1, result.FollowUpCategoryCounts!.DueNowCount);
        Assert.Equal(1, result.FollowUpCategoryCounts.AtRiskCount);
        Assert.Equal(1, result.FollowUpCategoryCounts.OpportunityCount);
        Assert.Equal(2, result.FollowUpCategoryCounts.HealthyCount);
        Assert.Equal(result.FollowUpCategoryCounts.DueNowCount, result.TotalCount);
        Assert.Equal(
            3,
            result.FollowUpCategoryCounts.DueNowCount
            + result.FollowUpCategoryCounts.AtRiskCount
            + result.FollowUpCategoryCounts.OpportunityCount);
        Assert.DoesNotContain(result.Items, item => item.FullName.StartsWith("Foreign", StringComparison.Ordinal));
    }

    [Fact]
    public async Task ListAsync_WithoutFollowUpCategory_KeepsExistingListBehavior()
    {
        var now = DateTimeOffset.UtcNow;
        await using var dbContext = CreateDbContext();
        SeedClient(dbContext, "Ada", LeadStatus.New, now);
        SeedClient(dbContext, "Bea", LeadStatus.Active, now);
        await dbContext.SaveChangesAsync();

        var service = CreateService(dbContext);
        var result = await service.ListAsync(
            page: 1,
            pageSize: 25,
            sortBy: "lastRegistrationDate",
            sortDirection: "desc",
            mergeSuspect: null,
            createdWithinDays: null,
            registeredWithinDays: null,
            followUpDue: null,
            withoutOutreach: null,
            leadStatus: null,
            nationality: null,
            search: null,
            community: null);

        Assert.Equal(2, result.TotalCount);
        Assert.Equal(2, result.Items.Count);
        Assert.Null(result.FollowUpCategoryCounts);
        Assert.Equal(1, result.StatusCounts.NewCount);
        Assert.Equal(1, result.StatusCounts.ActiveCount);
    }

    [Fact]
    public async Task ListAsync_InvalidFollowUpCategory_ThrowsArgumentException()
    {
        await using var dbContext = CreateDbContext();
        var service = CreateService(dbContext);

        var error = await Assert.ThrowsAsync<ArgumentException>(() =>
            ListFollowUp(service, "overdue"));

        Assert.Equal(FollowUpCategoryContract.InvalidCategoryMessage, error.Message);
    }

    [Fact]
    public async Task ListAsync_PageBelowOne_NormalizesToFirstPage()
    {
        var now = DateTimeOffset.UtcNow;
        await using var dbContext = CreateDbContext();
        SeedClient(dbContext, "Only", LeadStatus.Active, now);
        await dbContext.SaveChangesAsync();

        var result = await ListFollowUp(
            CreateService(dbContext),
            FollowUpCategoryContract.Healthy,
            page: 0,
            pageSize: 25);

        Assert.Equal(1, result.Page);
        Assert.Single(result.Items);
    }

    [Fact]
    public async Task ListAsync_IdenticalPrimarySort_PaginatesWithoutDuplicatesOrOmissions()
    {
        var now = DateTimeOffset.UtcNow;
        await using var dbContext = CreateDbContext();
        var ids = new List<Guid>();
        for (var index = 0; index < 101; index++)
        {
            ids.Add(SeedClient(dbContext, $"Healthy {index:D3}", LeadStatus.Active, now).Id);
        }

        await dbContext.SaveChangesAsync();
        var service = CreateService(dbContext);

        var page1 = await ListFollowUp(service, FollowUpCategoryContract.Healthy, page: 1, pageSize: 100);
        var page2 = await ListFollowUp(service, FollowUpCategoryContract.Healthy, page: 2, pageSize: 100);
        var page1Again = await ListFollowUp(service, FollowUpCategoryContract.Healthy, page: 1, pageSize: 100);
        var page2Again = await ListFollowUp(service, FollowUpCategoryContract.Healthy, page: 2, pageSize: 100);

        Assert.Equal(101, page1.TotalCount);
        Assert.Equal(100, page1.Items.Count);
        Assert.Single(page2.Items);
        Assert.Equal(page1.Items.Select(item => item.Id), page1Again.Items.Select(item => item.Id));
        Assert.Equal(page2.Items.Select(item => item.Id), page2Again.Items.Select(item => item.Id));

        var merged = page1.Items.Select(item => item.Id)
            .Concat(page2.Items.Select(item => item.Id))
            .ToList();
        Assert.Equal(101, merged.Count);
        Assert.Equal(101, merged.Distinct().Count());
        Assert.Equal(ids.OrderBy(id => id), merged.OrderBy(id => id));
        Assert.Empty(page1.Items.Select(item => item.Id).Intersect(page2.Items.Select(item => item.Id)));
    }

    private static Task<Cohestra.Contracts.Clients.ClientListResponse> ListFollowUp(
        ClientService service,
        string category,
        int page = 1,
        int pageSize = 25) =>
        service.ListAsync(
            page,
            pageSize,
            sortBy: "lastRegistrationDate",
            sortDirection: "desc",
            mergeSuspect: null,
            createdWithinDays: null,
            registeredWithinDays: null,
            followUpDue: null,
            withoutOutreach: null,
            leadStatus: null,
            nationality: null,
            search: null,
            community: null,
            followUpCategory: category);

    private static Client SeedClient(
        CohestraDbContext dbContext,
        string fullName,
        LeadStatus leadStatus,
        DateTimeOffset now,
        DateTimeOffset? nextFollowUpAt = null)
    {
        var client = new Client
        {
            Id = Guid.NewGuid(),
            FullName = fullName,
            LeadStatus = leadStatus,
            NextFollowUpAt = nextFollowUpAt,
            CreatedAt = now,
            UpdatedAt = now,
        };
        dbContext.Clients.Add(client);
        return client;
    }

    private static void SeedForeignClient(
        CohestraDbContext dbContext,
        string fullName,
        LeadStatus leadStatus,
        DateTimeOffset now)
    {
        dbContext.Clients.Add(new Client
        {
            Id = Guid.NewGuid(),
            TenantId = ForeignTenantId,
            FullName = fullName,
            LeadStatus = leadStatus,
            CreatedAt = now,
            UpdatedAt = now,
        });
    }

    private static void AddOutreach(CohestraDbContext dbContext, Client client, DateTimeOffset occurredAt)
    {
        dbContext.ClientTimelineEvents.Add(new ClientTimelineEvent
        {
            Id = Guid.NewGuid(),
            ClientId = client.Id,
            EventType = ClientTimelineEventType.WhatsAppInitiated,
            OccurredAt = occurredAt,
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
        dbContext.Tenants.Add(new Tenant
        {
            Id = ForeignTenantId,
            Slug = "foreign",
            Name = "Foreign Tenant",
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
