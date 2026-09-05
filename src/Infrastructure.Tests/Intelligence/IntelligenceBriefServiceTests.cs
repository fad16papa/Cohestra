using Cohestra.Application.Tenants;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Clients;
using Cohestra.Domain.Registrations;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Intelligence;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Tests.Intelligence;

public sealed class IntelligenceBriefServiceTests
{
    private const string TenantAName = "TENANT_A_BRIEF_MARKER";
    private const string TenantBName = "TENANT_B_BRIEF_MARKER";

    [Fact]
    public async Task GetBrief_EmptyTenant_ReturnsInsufficientData()
    {
        var tenantId = Guid.CreateVersion7();
        var current = new CurrentTenant();
        current.SetResolved(tenantId, "empty-brief");
        await using var db = CreateDb(current);
        await SeedTenantAsync(db, tenantId);

        var brief = await new IntelligenceBriefService(db, current).GetBriefAsync();

        Assert.Equal(IntelligenceBriefService.DeterministicMode, brief.Mode);
        Assert.Empty(brief.Insights);
        Assert.True(brief.InsufficientData.IsInsufficient);
        Assert.Contains("Not enough operational data", brief.InsufficientData.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task GetBrief_DueFollowUp_IncludesOwnNameAndCount()
    {
        var tenantId = Guid.CreateVersion7();
        var current = new CurrentTenant();
        current.SetResolved(tenantId, "due-brief");
        await using var db = CreateDb(current);
        await SeedTenantAsync(db, tenantId);

        var now = DateTimeOffset.UtcNow;
        db.Clients.Add(new Client
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            FullName = TenantAName,
            LeadStatus = LeadStatus.Active,
            NextFollowUpAt = now.AddHours(-1),
            CreatedAt = now.AddDays(-2),
            UpdatedAt = now,
        });
        await db.SaveChangesAsync();

        var brief = await new IntelligenceBriefService(db, current).GetBriefAsync();

        var due = Assert.Single(brief.Insights, insight => insight.Kind == "follow_up_due");
        Assert.Equal("/clients?followUpDue=true", due.RecommendedAction.Href);
        Assert.Contains(due.Evidence, evidence => evidence.Value == "1");
        Assert.Contains(due.Evidence, evidence => evidence.Value == TenantAName);
        Assert.False(brief.InsufficientData.IsInsufficient);
    }

    [Fact]
    [Trait("Category", "TenantIsolation")]
    public async Task GetBrief_ForTenantA_ExcludesTenantBNamesAndCounts()
    {
        var tenantA = Guid.CreateVersion7();
        var tenantB = Guid.CreateVersion7();
        var current = new CurrentTenant();
        current.SetResolved(tenantA, "tenant-a");
        await using var db = CreateDb(current);
        await SeedTenantAsync(db, tenantA, tenantB);

        var now = DateTimeOffset.UtcNow;
        db.Clients.AddRange(
            new Client
            {
                Id = Guid.NewGuid(),
                TenantId = tenantA,
                FullName = TenantAName,
                LeadStatus = LeadStatus.New,
                NextFollowUpAt = now.AddHours(-2),
                CreatedAt = now.AddDays(-1),
                UpdatedAt = now,
            },
            new Client
            {
                Id = Guid.NewGuid(),
                TenantId = tenantB,
                FullName = TenantBName,
                LeadStatus = LeadStatus.New,
                NextFollowUpAt = now.AddHours(-2),
                IsMergeSuspect = true,
                CreatedAt = now.AddDays(-1),
                UpdatedAt = now,
            });
        await db.SaveChangesAsync();

        var brief = await new IntelligenceBriefService(db, current).GetBriefAsync();
        var payload = string.Join("|", brief.Insights.SelectMany(insight =>
            insight.Evidence.Select(evidence => evidence.Value).Append(insight.Title)));

        Assert.Contains(TenantAName, payload, StringComparison.Ordinal);
        Assert.DoesNotContain(TenantBName, payload, StringComparison.Ordinal);
        var due = Assert.Single(brief.Insights, insight => insight.Kind == "follow_up_due");
        Assert.Contains(due.Evidence, evidence => evidence.Label == "People due" && evidence.Value == "1");
        Assert.DoesNotContain(brief.Insights, insight => insight.Kind == "merge_suspects");
    }

    [Fact]
    public async Task GetBrief_CapacityNearMax_EmitsSpotsLeft()
    {
        var tenantId = Guid.CreateVersion7();
        var current = new CurrentTenant();
        current.SetResolved(tenantId, "cap-brief");
        await using var db = CreateDb(current);
        await SeedTenantAsync(db, tenantId);

        var now = DateTimeOffset.UtcNow;
        var activity = new Activity
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Golden Hour Run",
            Slug = "golden-hour",
            Category = "Run",
            Schedule = "Tue",
            Location = "Park",
            Status = ActivityStatus.Published,
            MaxRegistrants = 4,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Activities.Add(activity);
        var client = new Client
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            FullName = "Runner One",
            LeadStatus = LeadStatus.Active,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Clients.Add(client);
        db.Registrations.Add(new Registration
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ActivityId = activity.Id,
            ClientId = client.Id,
            RegistrationNumber = "REG-1",
            CreatedAt = now,
        });
        await db.SaveChangesAsync();

        var brief = await new IntelligenceBriefService(db, current).GetBriefAsync();
        var capacity = Assert.Single(brief.Insights, insight => insight.Kind == "capacity_pressure");
        Assert.Contains("3 spots left", capacity.Title, StringComparison.Ordinal);
        Assert.Equal($"/activities/{activity.Id:D}", capacity.RecommendedAction.Href);
    }

    [Fact]
    public async Task GetBrief_NewWithoutOutreach_ExcludesContactedNewPeople()
    {
        var tenantId = Guid.CreateVersion7();
        var current = new CurrentTenant();
        current.SetResolved(tenantId, "new-brief");
        await using var db = CreateDb(current);
        await SeedTenantAsync(db, tenantId);

        var now = DateTimeOffset.UtcNow;
        var uncontacted = new Client
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            FullName = "Uncontacted New",
            LeadStatus = LeadStatus.New,
            CreatedAt = now.AddDays(-1),
            UpdatedAt = now,
        };
        var contacted = new Client
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            FullName = "Contacted New",
            LeadStatus = LeadStatus.New,
            CreatedAt = now.AddDays(-2),
            UpdatedAt = now,
        };
        db.Clients.AddRange(uncontacted, contacted);
        db.ClientTimelineEvents.Add(new ClientTimelineEvent
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ClientId = contacted.Id,
            EventType = ClientTimelineEventType.EmailCampaignSent,
            OccurredAt = now.AddHours(-3),
        });
        await db.SaveChangesAsync();

        var brief = await new IntelligenceBriefService(db, current).GetBriefAsync();
        var insight = Assert.Single(brief.Insights, item => item.Kind == "new_without_outreach");
        Assert.Equal("/clients?leadStatus=new", insight.RecommendedAction.Href);
        Assert.Contains(insight.Evidence, evidence => evidence.Value == "1");
        Assert.Contains(insight.Evidence, evidence => evidence.Value == "Uncontacted New");
        Assert.DoesNotContain(insight.Evidence, evidence => evidence.Value == "Contacted New");
    }

    [Fact]
    public async Task GetBrief_MergeSuspects_IncludesOwnNames()
    {
        var tenantId = Guid.CreateVersion7();
        var current = new CurrentTenant();
        current.SetResolved(tenantId, "merge-brief");
        await using var db = CreateDb(current);
        await SeedTenantAsync(db, tenantId);

        var now = DateTimeOffset.UtcNow;
        db.Clients.Add(new Client
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            FullName = "Possible Twin",
            LeadStatus = LeadStatus.Active,
            IsMergeSuspect = true,
            CreatedAt = now,
            UpdatedAt = now,
        });
        await db.SaveChangesAsync();

        var brief = await new IntelligenceBriefService(db, current).GetBriefAsync();
        var insight = Assert.Single(brief.Insights, item => item.Kind == "merge_suspects");
        Assert.Equal("/clients?mergeSuspect=true", insight.RecommendedAction.Href);
        Assert.Contains(insight.Evidence, evidence => evidence.Value == "Possible Twin");
    }

    [Fact]
    public async Task GetBrief_WowEmitted_WhenPreviousWindowMeetsFloor()
    {
        var tenantId = Guid.CreateVersion7();
        var current = new CurrentTenant();
        current.SetResolved(tenantId, "wow-emit-brief");
        await using var db = CreateDb(current);
        await SeedTenantAsync(db, tenantId);

        var now = DateTimeOffset.UtcNow;
        var activity = new Activity
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Busy Club",
            Slug = "busy-club",
            Category = "Social",
            Schedule = "Fri",
            Location = "Hall",
            Status = ActivityStatus.Published,
            CreatedAt = now.AddDays(-20),
            UpdatedAt = now,
        };
        db.Activities.Add(activity);

        for (var index = 0; index < 3; index++)
        {
            var client = new Client
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                FullName = $"Prior {index}",
                LeadStatus = LeadStatus.Active,
                CreatedAt = now.AddDays(-10),
                UpdatedAt = now,
            };
            db.Clients.Add(client);
            db.Registrations.Add(new Registration
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                ActivityId = activity.Id,
                ClientId = client.Id,
                RegistrationNumber = $"REG-P{index}",
                CreatedAt = now.AddDays(-10),
            });
        }

        var currentClient = new Client
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            FullName = "Current One",
            LeadStatus = LeadStatus.Active,
            CreatedAt = now.AddDays(-1),
            UpdatedAt = now,
        };
        db.Clients.Add(currentClient);
        db.Registrations.Add(new Registration
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ActivityId = activity.Id,
            ClientId = currentClient.Id,
            RegistrationNumber = "REG-C0",
            CreatedAt = now.AddDays(-1),
        });
        await db.SaveChangesAsync();

        var brief = await new IntelligenceBriefService(db, current).GetBriefAsync();
        var wow = Assert.Single(brief.Insights, insight => insight.Kind == "registration_wow");
        Assert.Equal("/reports", wow.RecommendedAction.Href);
        Assert.Contains(wow.Evidence, evidence => evidence.Label == "Last 7 days" && evidence.Value == "1");
        Assert.Contains(wow.Evidence, evidence => evidence.Label == "Prior 7 days" && evidence.Value == "3");
    }

    [Fact]
    public async Task GetBrief_WowSkipped_WhenPreviousWindowBelowFloor()
    {
        var tenantId = Guid.CreateVersion7();
        var current = new CurrentTenant();
        current.SetResolved(tenantId, "wow-brief");
        await using var db = CreateDb(current);
        await SeedTenantAsync(db, tenantId);

        var now = DateTimeOffset.UtcNow;
        var activity = new Activity
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Quiet Club",
            Slug = "quiet-club",
            Category = "Social",
            Schedule = "Fri",
            Location = "Hall",
            Status = ActivityStatus.Published,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Activities.Add(activity);
        await db.SaveChangesAsync();

        var brief = await new IntelligenceBriefService(db, current).GetBriefAsync();
        Assert.DoesNotContain(brief.Insights, insight => insight.Kind == "registration_wow");
    }

    [Fact]
    public async Task GetBrief_UnresolvedTenant_FailsClosed()
    {
        var current = new CurrentTenant();
        await using var db = CreateDb(current);
        var service = new IntelligenceBriefService(db, current);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.GetBriefAsync());
    }

    [Fact]
    public async Task GetBrief_EmptyTenantId_FailsClosed()
    {
        var current = new CurrentTenant();
        current.SetResolved(Guid.Empty, "empty");
        await using var db = CreateDb(current);
        var service = new IntelligenceBriefService(db, current);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.GetBriefAsync());
    }

    private static CohestraDbContext CreateDb(ICurrentTenant currentTenant)
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new CohestraDbContext(options, currentTenant);
    }

    private static async Task SeedTenantAsync(CohestraDbContext db, params Guid[] tenantIds)
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var id in tenantIds)
        {
            db.Tenants.Add(new Tenant
            {
                Id = id,
                Slug = id.ToString("N")[..8],
                Name = "T",
                Plan = TenantPlan.Core,
                Status = TenantStatus.Active,
                BillingStatus = BillingStatus.Free,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }

        await db.SaveChangesAsync();
    }
}
