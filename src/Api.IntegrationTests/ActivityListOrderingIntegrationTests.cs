using System.Net;
using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Activities;
using Cohestra.Contracts.Platform;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Clients;
using Cohestra.Domain.Registrations;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Identity;
using Cohestra.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

/// <summary>
/// Story 40.4 — PostgreSQL proof of Archived-last list ordering, paging, replay, and isolation.
/// Does not mutate the default tenant or shared demo activities.
/// </summary>
[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class ActivityListOrderingIntegrationTests(IntegrationTestFixture fixture)
{
    private const int PageSize = 5;
    private const string ForeignMarker = "40-4-FOREIGN-ACTIVITY-MARKER";

    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task List_Unfiltered_PagesArchivedLast_ReplaysDeterministically_AndExcludesForeignTenant()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var owned = await CreateOwnedTenantAsync();
        var now = DateTimeOffset.Parse("2026-10-04T12:00:00Z");
        var tieUpdatedAt = now.AddHours(-2);
        var (tieEarlyId, tieLateId) = OrderedIds();

        var seeded = new List<SeededActivity>
        {
            await SeedOwnedActivityAsync(owned.TenantId, "P-newest", ActivityStatus.Published, now.AddHours(-1)),
            await SeedOwnedActivityAsync(
                owned.TenantId,
                "P-tie-early",
                ActivityStatus.Published,
                tieUpdatedAt,
                tieEarlyId),
            await SeedOwnedActivityAsync(
                owned.TenantId,
                "P-tie-late",
                ActivityStatus.Published,
                tieUpdatedAt,
                tieLateId),
            await SeedOwnedActivityAsync(owned.TenantId, "D-3", ActivityStatus.Draft, now.AddHours(-3)),
            await SeedOwnedActivityAsync(owned.TenantId, "D-4", ActivityStatus.Draft, now.AddHours(-4)),
            await SeedOwnedActivityAsync(owned.TenantId, "P-5", ActivityStatus.Published, now.AddHours(-5)),
            await SeedOwnedActivityAsync(owned.TenantId, "D-6", ActivityStatus.Draft, now.AddHours(-6)),
            await SeedOwnedActivityAsync(owned.TenantId, "A-1", ActivityStatus.Archived, now),
            await SeedOwnedActivityAsync(owned.TenantId, "A-2", ActivityStatus.Archived, now.AddMinutes(-1)),
            await SeedOwnedActivityAsync(owned.TenantId, "A-3", ActivityStatus.Archived, now.AddMinutes(-2)),
            await SeedOwnedActivityAsync(owned.TenantId, "A-4", ActivityStatus.Archived, now.AddMinutes(-3)),
            await SeedOwnedActivityAsync(owned.TenantId, "A-5", ActivityStatus.Archived, now.AddMinutes(-4)),
        };

        var foreign = await CreateOwnedTenantAsync("foreign");
        await SeedOwnedActivityAsync(
            foreign.TenantId,
            ForeignMarker,
            ActivityStatus.Published,
            now.AddHours(1));

        using var client = await CreateTenantAdminClientAsync(owned);
        var expected = OrderUnfilteredDefault(seeded);
        var firstWalk = await FetchAllPagesAsync(client);
        var secondWalk = await FetchAllPagesAsync(client);

        Assert.Equal(seeded.Count, firstWalk.TotalCount);
        Assert.DoesNotContain(firstWalk.Items, item => item.Name.Contains(ForeignMarker, StringComparison.Ordinal));
        Assert.Equal(expected.Select(item => item.Id), firstWalk.Items.Select(item => item.Id));
        Assert.Equal(firstWalk.Items.Select(item => item.Id), secondWalk.Items.Select(item => item.Id));
        Assert.Equal(seeded.Select(item => item.Id).OrderBy(id => id), firstWalk.Items.Select(item => item.Id).OrderBy(id => id));
        Assert.Equal(firstWalk.Items.Count, firstWalk.Items.Select(item => item.Id).Distinct().Count());

        Assert.True(firstWalk.Pages.Count >= 2, "Fixture must cross at least two pages.");
        Assert.All(firstWalk.Pages[0].Items, item => Assert.NotEqual("archived", item.Status));
        Assert.Contains(firstWalk.Pages[0].Items, item => item.Status is "draft" or "published");
        Assert.Contains(firstWalk.Pages[^1].Items, item => item.Status == "archived");

        var flattenedStatuses = firstWalk.Items.Select(item => item.Status).ToList();
        var firstArchived = flattenedStatuses.FindIndex(status => status == "archived");
        Assert.True(firstArchived > 0, "Archived must not lead while actionable rows exist.");
        Assert.All(flattenedStatuses.Take(firstArchived), status => Assert.NotEqual("archived", status));
        Assert.All(flattenedStatuses.Skip(firstArchived), status => Assert.Equal("archived", status));

        var tieEarly = seeded.Single(item => item.Name.EndsWith("P-tie-early", StringComparison.Ordinal));
        var tieLate = seeded.Single(item => item.Name.EndsWith("P-tie-late", StringComparison.Ordinal));
        var ids = firstWalk.Items.Select(item => item.Id).ToList();
        Assert.True(ids.IndexOf(tieEarly.Id) < ids.IndexOf(tieLate.Id), "Equal UpdatedAt must use Id ASC.");

        Assert.All(firstWalk.Pages, page =>
        {
            Assert.Equal(PageSize, page.PageSize);
            Assert.Equal(seeded.Count, page.TotalCount);
        });
        Assert.Equal(1, firstWalk.Pages[0].Page);
        Assert.Equal(2, firstWalk.Pages[1].Page);
    }

    [SkippableFact]
    public async Task List_StatusArchived_IsTruthful_AndKeepsRequestedSortWithIdTieBreak()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var owned = await CreateOwnedTenantAsync();
        var now = DateTimeOffset.Parse("2026-10-04T13:00:00Z");
        var tie = now.AddHours(-1);
        var (tieEarlyId, tieLateId) = OrderedIds();

        var newerArchived = await SeedOwnedActivityAsync(owned.TenantId, "A-new", ActivityStatus.Archived, now);
        var tieEarly = await SeedOwnedActivityAsync(
            owned.TenantId,
            "A-tie-early",
            ActivityStatus.Archived,
            tie,
            tieEarlyId);
        var tieLate = await SeedOwnedActivityAsync(
            owned.TenantId,
            "A-tie-late",
            ActivityStatus.Archived,
            tie,
            tieLateId);
        await SeedOwnedActivityAsync(owned.TenantId, "Hidden-draft", ActivityStatus.Draft, now.AddHours(1));
        await SeedOwnedActivityAsync(owned.TenantId, "Hidden-published", ActivityStatus.Published, now.AddHours(1));

        using var client = await CreateTenantAdminClientAsync(owned);
        var first = await FetchPageAsync(client, page: 1, status: "archived");
        var second = await FetchPageAsync(client, page: 1, status: "archived");

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(3, first.Body.TotalCount);
        Assert.Equal(3, first.Body.Items.Count);
        Assert.All(first.Body.Items, item => Assert.Equal("archived", item.Status));
        Assert.DoesNotContain(first.Body.Items, item => item.Name.Contains("Hidden-", StringComparison.Ordinal));
        Assert.Equal(
            new[] { newerArchived.Id, tieEarly.Id, tieLate.Id },
            first.Body.Items.Select(item => item.Id).ToArray());
        Assert.Equal(first.Body.Items.Select(item => item.Id), second.Body.Items.Select(item => item.Id));
        Assert.Equal(1, first.Body.Page);
        Assert.Equal(PageSize, first.Body.PageSize);
    }

    [SkippableFact]
    public async Task List_RegistrationCountSort_KeepsArchivedSecondary_OnPostgreSQL()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var owned = await CreateOwnedTenantAsync();
        var now = DateTimeOffset.Parse("2026-10-04T14:00:00Z");

        var high = await SeedOwnedActivityAsync(owned.TenantId, "R-high", ActivityStatus.Published, now.AddHours(-3));
        var mid = await SeedOwnedActivityAsync(owned.TenantId, "R-mid", ActivityStatus.Published, now.AddHours(-2));
        var zero = await SeedOwnedActivityAsync(owned.TenantId, "R-zero", ActivityStatus.Draft, now.AddHours(-1));
        var archivedHigh = await SeedOwnedActivityAsync(
            owned.TenantId,
            "R-archived-highest",
            ActivityStatus.Archived,
            now);

        await SeedRegistrationsAsync(owned.TenantId, high.Id, count: 3);
        await SeedRegistrationsAsync(owned.TenantId, mid.Id, count: 1);
        await SeedRegistrationsAsync(owned.TenantId, archivedHigh.Id, count: 9);

        using var client = await CreateTenantAdminClientAsync(owned);
        var first = await FetchPageAsync(
            client,
            page: 1,
            sortBy: "registrationCount",
            sortDirection: "desc");
        var second = await FetchPageAsync(
            client,
            page: 1,
            sortBy: "registrationCount",
            sortDirection: "desc");

        Assert.Equal(4, first.Body.TotalCount);
        Assert.Equal(
            new[] { high.Id, mid.Id, zero.Id, archivedHigh.Id },
            first.Body.Items.Select(item => item.Id).ToArray());
        Assert.Equal(new[] { 3, 1, 0, 9 }, first.Body.Items.Select(item => item.RegistrationCount).ToArray());
        Assert.Equal("archived", first.Body.Items[^1].Status);
        Assert.Equal(first.Body.Items.Select(item => item.Id), second.Body.Items.Select(item => item.Id));
        Assert.All(first.Body.Items.Take(3), item => Assert.NotEqual("archived", item.Status));
    }

    private async Task<OwnedTenant> CreateOwnedTenantAsync(string? label = null)
    {
        using var platformClient = Factory.CreateClient();
        var platformToken = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platformClient);
        IntegrationTestHelpers.UseBearerToken(platformClient, platformToken);

        var slug = $"o4{(label ?? "own")}{Guid.NewGuid():N}"[..12];
        var tenant = await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            platformClient,
            $"40.4 order {slug}",
            slug,
            $"admin@{slug}.test");

        var (user, password) = await IntegrationTestHelpers.CreateTenantAdminUserAsync(
            Factory.Services,
            tenant.Id,
            $"owner-{slug}@40-4.test");

        return new OwnedTenant(tenant, user, password);
    }

    private async Task<HttpClient> CreateTenantAdminClientAsync(OwnedTenant owned)
    {
        var client = Factory.CreateClient();
        IntegrationTestHelpers.UseTenantHost(client, owned.Tenant.Slug);
        var token = await IntegrationTestHelpers.LoginAsync(client, owned.User.Email!, owned.Password);
        IntegrationTestHelpers.UseBearerToken(client, token);
        return client;
    }

    private async Task<SeededActivity> SeedOwnedActivityAsync(
        Guid tenantId,
        string suffix,
        ActivityStatus status,
        DateTimeOffset updatedAt,
        Guid? id = null)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        IntegrationTestHelpers.BindDefaultTenant(scope.ServiceProvider);
        var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var activityId = id ?? Guid.NewGuid();
        var name = $"40-4-ord-{suffix}";
        var activity = new Activity
        {
            Id = activityId,
            TenantId = tenantId,
            Name = name,
            Slug = $"o4-{activityId:N}"[..20],
            Category = "Test",
            Schedule = "Saturday 10:00",
            Location = "Order Court",
            CommunityLabel = "Order Community",
            Status = status,
            FormSchema = new ActivityFormSchema { Version = 1, Fields = [] },
            ShowOnHomepage = false,
            CreatedAt = updatedAt.AddDays(-2),
            UpdatedAt = updatedAt,
        };

        dbContext.Activities.Add(activity);
        await dbContext.SaveChangesAsync();
        return new SeededActivity(activity.Id, activity.Name, activity.Status, activity.UpdatedAt);
    }

    private async Task SeedRegistrationsAsync(Guid tenantId, Guid activityId, int count)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        IntegrationTestHelpers.BindDefaultTenant(scope.ServiceProvider);
        var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var now = DateTimeOffset.UtcNow;
        for (var index = 0; index < count; index++)
        {
            var client = new Client
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                FullName = $"40-4 registrant {index} {activityId:N}"[..40],
                LeadStatus = LeadStatus.New,
                CreatedAt = now,
                UpdatedAt = now,
            };
            dbContext.Clients.Add(client);
            dbContext.Registrations.Add(new Registration
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                RegistrationNumber = $"R{activityId:N}"[..12] + $"{index:D4}",
                ActivityId = activityId,
                ClientId = client.Id,
                CreatedAt = now,
            });
        }

        await dbContext.SaveChangesAsync();
    }

    private static async Task<PagedWalk> FetchAllPagesAsync(HttpClient client)
    {
        var pages = new List<ActivityListResponse>();
        var items = new List<ActivityResponse>();
        var page = 1;
        ActivityListResponse? latest;

        do
        {
            var fetched = await FetchPageAsync(client, page);
            Assert.Equal(HttpStatusCode.OK, fetched.StatusCode);
            latest = fetched.Body;
            pages.Add(latest);
            items.AddRange(latest.Items);
            page++;
        }
        while (items.Count < latest.TotalCount && latest.Items.Count > 0);

        return new PagedWalk(items, pages, latest.TotalCount);
    }

    private static async Task<(HttpStatusCode StatusCode, ActivityListResponse Body)> FetchPageAsync(
        HttpClient client,
        int page,
        string? status = null,
        string? sortBy = null,
        string? sortDirection = null)
    {
        var query = $"page={page}&pageSize={PageSize}";
        if (!string.IsNullOrWhiteSpace(status))
        {
            query += $"&status={Uri.EscapeDataString(status)}";
        }

        if (!string.IsNullOrWhiteSpace(sortBy))
        {
            query += $"&sortBy={Uri.EscapeDataString(sortBy)}";
        }

        if (!string.IsNullOrWhiteSpace(sortDirection))
        {
            query += $"&sortDirection={Uri.EscapeDataString(sortDirection)}";
        }

        using var response = await client.GetAsync($"/api/v1/admin/activities?{query}");
        var body = await response.Content.ReadFromJsonAsync<ActivityListResponse>(
            IntegrationTestHelpers.JsonOptions)
            ?? throw new InvalidOperationException("Activities list response body was empty.");
        return (response.StatusCode, body);
    }

    private static (Guid Early, Guid Late) OrderedIds()
    {
        var first = Guid.NewGuid();
        var second = Guid.NewGuid();
        return first.CompareTo(second) < 0 ? (first, second) : (second, first);
    }

    private static List<SeededActivity> OrderUnfilteredDefault(IReadOnlyCollection<SeededActivity> seeded) =>
        seeded
            .OrderBy(item => item.Status == ActivityStatus.Archived ? 1 : 0)
            .ThenByDescending(item => item.UpdatedAt)
            .ThenBy(item => item.Id)
            .ToList();

    private sealed record OwnedTenant(TenantResponse Tenant, ApplicationUser User, string Password)
    {
        public Guid TenantId => Tenant.Id;
    }

    private sealed record SeededActivity(
        Guid Id,
        string Name,
        ActivityStatus Status,
        DateTimeOffset UpdatedAt);

    private sealed record PagedWalk(
        IReadOnlyList<ActivityResponse> Items,
        IReadOnlyList<ActivityListResponse> Pages,
        int TotalCount);
}
