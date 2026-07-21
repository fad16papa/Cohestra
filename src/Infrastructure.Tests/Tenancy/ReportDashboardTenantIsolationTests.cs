using System.Text;
using Cohestra.Application.Dashboard;
using Cohestra.Application.Tenants;
using Cohestra.Contracts.Dashboard;
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

namespace Cohestra.Infrastructure.Tests.Tenancy;

/// <summary>
/// FR28 isolation proofs for Story 13.3 — report CSV / aggregates and dashboard metrics.
/// </summary>
public sealed class ReportDashboardTenantIsolationTests
{
    private const string TenantAMarker = "TENANT_A_ISOLATION_MARKER";
    private const string TenantBMarker = "TENANT_B_ISOLATION_MARKER";
    private const string TenantAEmail = "alice-a@isolation-a.test";
    private const string TenantBEmail = "bob-b@isolation-b.test";
    private const string TenantARegNumber = "REG-A-ISOLATION-001";
    private const string TenantBRegNumber = "REG-B-ISOLATION-001";

    [Fact]
    public async Task ExportReportCsv_ForTenantA_ExcludesTenantBRows()
    {
        var (tenantA, tenantB, current, db) = await SeedDualTenantAsync();
        await using (db)
        {
            var service = new ReportService(db, current);
            var from = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-7));
            var to = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));

            var export = await service.ExportReportCsvAsync(
                new ReportQuery("custom", from, to));

            var csv = Encoding.UTF8.GetString(export.Content);
            Assert.Equal(1, export.RegistrationRowCount);
            Assert.Contains(TenantAMarker, csv, StringComparison.Ordinal);
            Assert.Contains(TenantAEmail, csv, StringComparison.Ordinal);
            Assert.Contains(TenantARegNumber, csv, StringComparison.Ordinal);
            Assert.DoesNotContain(TenantBMarker, csv, StringComparison.Ordinal);
            Assert.DoesNotContain(TenantBEmail, csv, StringComparison.Ordinal);
            Assert.DoesNotContain(TenantBRegNumber, csv, StringComparison.Ordinal);
            Assert.DoesNotContain(tenantB.ToString("D"), csv, StringComparison.OrdinalIgnoreCase);
            _ = tenantA;
        }
    }

    [Fact]
    public async Task GetReport_ForTenantA_CountsOnlyTenantA()
    {
        var (_, _, current, db) = await SeedDualTenantAsync();
        await using (db)
        {
            var service = new ReportService(db, current);
            var from = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-7));
            var to = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));

            var report = await service.GetReportAsync(new ReportQuery("custom", from, to));

            Assert.Equal(1, report.Registrations);
            Assert.Equal(1, report.ActivitiesHosted);
            Assert.Equal(1, report.NewLeads);
            Assert.Single(report.ActivityRanking);
            Assert.Equal(TenantAMarker, report.ActivityRanking[0].ActivityName);
            Assert.DoesNotContain(
                report.ActivityRanking,
                item => item.ActivityName.Contains(TenantBMarker, StringComparison.Ordinal));
        }
    }

    [Fact]
    public async Task GetMetrics_ForTenantA_ExcludesTenantBCounts()
    {
        var (_, _, current, db) = await SeedDualTenantAsync();
        await using (db)
        {
            var service = new DashboardService(db, new NullDashboardMetricsCache(), current);

            var metrics = await service.GetMetricsAsync();

            Assert.Equal(1, metrics.TotalLeads);
            Assert.Equal(1, metrics.NewLeadsInPeriod);
            Assert.Equal(1, metrics.ActiveActivitiesCount);
            Assert.Single(metrics.ActivityPerformance);
            Assert.Equal(TenantAMarker, metrics.ActivityPerformance[0].ActivityName);
            Assert.DoesNotContain(
                metrics.ActivityPerformance,
                item => item.ActivityName.Contains(TenantBMarker, StringComparison.Ordinal));
        }
    }

    [Fact]
    public async Task ReportService_UnresolvedTenant_FailsClosed()
    {
        var current = new CurrentTenant();
        await using var db = CreateDb(current);
        var service = new ReportService(db, current);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.GetReportAsync(new ReportQuery("weekly")));

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.ExportReportCsvAsync(new ReportQuery("weekly")));
    }

    [Fact]
    public async Task DashboardService_UnresolvedTenant_FailsClosed()
    {
        var current = new CurrentTenant();
        await using var db = CreateDb(current);
        var service = new DashboardService(db, new NullDashboardMetricsCache(), current);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.GetMetricsAsync());
    }

    private static async Task<(Guid TenantA, Guid TenantB, CurrentTenant Current, CohestraDbContext Db)>
        SeedDualTenantAsync()
    {
        var tenantA = Guid.CreateVersion7();
        var tenantB = Guid.CreateVersion7();
        var current = new CurrentTenant();
        current.SetResolved(tenantA, "tenant-a");

        var db = CreateDb(current);
        await SeedTenantsAsync(db, tenantA, tenantB);

        var now = DateTimeOffset.UtcNow;
        var activityA = CreateActivity(tenantA, "activity-a", TenantAMarker);
        var activityB = CreateActivity(tenantB, "activity-b", TenantBMarker);
        db.Activities.AddRange(activityA, activityB);

        var clientA = CreateClient(tenantA, TenantAMarker, TenantAEmail, now.AddDays(-1));
        var clientB = CreateClient(tenantB, TenantBMarker, TenantBEmail, now.AddDays(-1));
        db.Clients.AddRange(clientA, clientB);

        db.Registrations.AddRange(
            new Registration
            {
                Id = Guid.NewGuid(),
                TenantId = tenantA,
                RegistrationNumber = TenantARegNumber,
                ActivityId = activityA.Id,
                ClientId = clientA.Id,
                CreatedAt = now.AddHours(-2),
            },
            new Registration
            {
                Id = Guid.NewGuid(),
                TenantId = tenantB,
                RegistrationNumber = TenantBRegNumber,
                ActivityId = activityB.Id,
                ClientId = clientB.Id,
                CreatedAt = now.AddHours(-1),
            });

        await db.SaveChangesAsync();
        return (tenantA, tenantB, current, db);
    }

    private static CohestraDbContext CreateDb(ICurrentTenant currentTenant)
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new CohestraDbContext(options, currentTenant);
    }

    private static async Task SeedTenantsAsync(CohestraDbContext db, params Guid[] tenantIds)
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var id in tenantIds)
        {
            db.Tenants.Add(new Tenant
            {
                Id = id,
                Slug = id.ToString("N")[..8],
                Name = "T",
                Status = TenantStatus.Active,
                BillingStatus = BillingStatus.Free,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }

        await db.SaveChangesAsync();
    }

    private static Activity CreateActivity(Guid tenantId, string slug, string name) =>
        new()
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = name,
            Slug = slug,
            Category = "General",
            Schedule = "TBD",
            Location = "TBD",
            CommunityLabel = $"{name}-community",
            Status = ActivityStatus.Published,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

    private static Client CreateClient(
        Guid tenantId,
        string fullName,
        string email,
        DateTimeOffset createdAt) =>
        new()
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            FullName = fullName,
            Email = email,
            NormalizedEmail = email.ToLowerInvariant(),
            LeadStatus = LeadStatus.New,
            CreatedAt = createdAt,
            UpdatedAt = createdAt,
        };

    private sealed class NullDashboardMetricsCache : IDashboardMetricsCache
    {
        public Task<DashboardMetricsResponse?> GetAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<DashboardMetricsResponse?>(null);

        public Task SetAsync(
            Guid tenantId,
            DashboardMetricsResponse metrics,
            CancellationToken cancellationToken = default) =>
            Task.CompletedTask;
    }
}
