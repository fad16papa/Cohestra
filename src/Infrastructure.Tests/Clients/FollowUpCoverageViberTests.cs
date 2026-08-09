using Cohestra.Application.Dashboard;
using Cohestra.Contracts.Reports;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Clients;
using Cohestra.Domain.Registrations;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Dashboard;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Reports;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Tests.Clients;

public sealed class FollowUpCoverageViberTests
{
    private static readonly Guid TenantId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    [Fact]
    public async Task GetMetrics_ClientWithOnlyViberInitiated_CountsAsFollowedUp()
    {
        var now = DateTimeOffset.UtcNow;
        var current = CreateCurrentTenant();
        await using var db = CreateDb(current);
        await SeedTenantAsync(db, now);

        var untouched = CreateClient("Untouched Lead", now);
        var viberOnly = CreateClient("Viber Only Lead", now);
        db.Clients.AddRange(untouched, viberOnly);
        db.ClientTimelineEvents.Add(new ClientTimelineEvent
        {
            Id = Guid.NewGuid(),
            TenantId = TenantId,
            ClientId = viberOnly.Id,
            EventType = ClientTimelineEventType.ViberInitiated,
            OccurredAt = now.AddHours(-1),
        });
        await db.SaveChangesAsync();

        var service = new DashboardService(db, new NullDashboardMetricsCache(), current);
        var metrics = await service.GetMetricsAsync();

        Assert.Equal(2, metrics.TotalLeads);
        Assert.Equal(50.0, metrics.FollowUpCoveragePercent);
    }

    [Fact]
    public async Task GetReport_CohortWithOnlyViberFollowUp_CountsAsFollowedUp()
    {
        var now = DateTimeOffset.UtcNow;
        var current = CreateCurrentTenant();
        await using var db = CreateDb(current);
        await SeedTenantAsync(db, now);

        var activity = new Activity
        {
            Id = Guid.NewGuid(),
            TenantId = TenantId,
            Name = "Coverage Activity",
            Slug = "coverage-activity",
            Category = "General",
            Schedule = "Weekly",
            Location = "Court",
            CommunityLabel = "coverage-community",
            Status = ActivityStatus.Published,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Activities.Add(activity);

        var untouched = CreateClient("Untouched Lead", now);
        var viberFollowUp = CreateClient("Viber Follow-up Lead", now);
        db.Clients.AddRange(untouched, viberFollowUp);
        db.Registrations.AddRange(
            new Registration
            {
                Id = Guid.NewGuid(),
                TenantId = TenantId,
                RegistrationNumber = "REG-COV-001",
                ActivityId = activity.Id,
                ClientId = untouched.Id,
                CreatedAt = now.AddHours(-2),
            },
            new Registration
            {
                Id = Guid.NewGuid(),
                TenantId = TenantId,
                RegistrationNumber = "REG-COV-002",
                ActivityId = activity.Id,
                ClientId = viberFollowUp.Id,
                CreatedAt = now.AddHours(-1),
            });
        db.ClientTimelineEvents.Add(new ClientTimelineEvent
        {
            Id = Guid.NewGuid(),
            TenantId = TenantId,
            ClientId = viberFollowUp.Id,
            EventType = ClientTimelineEventType.ViberFollowUpRecorded,
            OccurredAt = now.AddMinutes(-30),
            Subject = "Contacted",
        });
        await db.SaveChangesAsync();

        var service = new ReportService(db, current);
        var from = DateOnly.FromDateTime(now.UtcDateTime.AddDays(-1));
        var to = DateOnly.FromDateTime(now.UtcDateTime.AddDays(1));
        var report = await service.GetReportAsync(new ReportQuery("custom", from, to));

        Assert.Equal(2, report.FollowUpStatus.NewCount);
        Assert.Equal(50.0, report.FollowUpStatus.CoveragePercent);
    }

    [Fact]
    public async Task GetMetrics_ClientWithWhatsAppAndViber_CountsOnce()
    {
        var now = DateTimeOffset.UtcNow;
        var current = CreateCurrentTenant();
        await using var db = CreateDb(current);
        await SeedTenantAsync(db, now);

        var multiChannel = CreateClient("Multi Channel Lead", now);
        db.Clients.Add(multiChannel);
        db.ClientTimelineEvents.AddRange(
            new ClientTimelineEvent
            {
                Id = Guid.NewGuid(),
                TenantId = TenantId,
                ClientId = multiChannel.Id,
                EventType = ClientTimelineEventType.WhatsAppInitiated,
                OccurredAt = now.AddHours(-2),
            },
            new ClientTimelineEvent
            {
                Id = Guid.NewGuid(),
                TenantId = TenantId,
                ClientId = multiChannel.Id,
                EventType = ClientTimelineEventType.ViberInitiated,
                OccurredAt = now.AddHours(-1),
            });
        await db.SaveChangesAsync();

        var service = new DashboardService(db, new NullDashboardMetricsCache(), current);
        var metrics = await service.GetMetricsAsync();

        Assert.Equal(1, metrics.TotalLeads);
        Assert.Equal(100.0, metrics.FollowUpCoveragePercent);
    }

    private static CurrentTenant CreateCurrentTenant()
    {
        var current = new CurrentTenant();
        current.SetResolved(TenantId, "coverage-tenant");
        return current;
    }

    private static CohestraDbContext CreateDb(CurrentTenant current)
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new CohestraDbContext(options, current);
    }

    private static async Task SeedTenantAsync(CohestraDbContext db, DateTimeOffset now)
    {
        db.Tenants.Add(new Tenant
        {
            Id = TenantId,
            Slug = "coverage",
            Name = "Coverage Tenant",
            Plan = TenantPlan.Core,
            Status = TenantStatus.Active,
            BillingStatus = BillingStatus.Free,
            CreatedAt = now,
            UpdatedAt = now,
        });
        await db.SaveChangesAsync();
    }

    private static Client CreateClient(string fullName, DateTimeOffset createdAt) =>
        new()
        {
            Id = Guid.NewGuid(),
            TenantId = TenantId,
            FullName = fullName,
            LeadStatus = LeadStatus.New,
            CreatedAt = createdAt,
            UpdatedAt = createdAt,
        };

    private sealed class NullDashboardMetricsCache : IDashboardMetricsCache
    {
        public Task<Contracts.Dashboard.DashboardMetricsResponse?> GetAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<Contracts.Dashboard.DashboardMetricsResponse?>(null);

        public Task SetAsync(
            Guid tenantId,
            Contracts.Dashboard.DashboardMetricsResponse metrics,
            CancellationToken cancellationToken = default) =>
            Task.CompletedTask;
    }
}
