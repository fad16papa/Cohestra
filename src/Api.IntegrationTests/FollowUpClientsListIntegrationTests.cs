using System.Net;
using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Application.Clients;
using Cohestra.Contracts.Clients;
using Cohestra.Domain.Clients;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class FollowUpClientsListIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task FollowUpCategory_FiltersAndTotals_MatchAcceptedContract()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

        var marker = $"fu-{Guid.NewGuid():N}"[..12];
        var now = DateTimeOffset.UtcNow;
        var seeded = new List<Guid>();

        try
        {
            seeded.Add(await SeedDefaultClientAsync(client =>
            {
                client.FullName = $"{marker} due";
                client.LeadStatus = LeadStatus.Active;
                client.NextFollowUpAt = now.AddDays(-1);
            }));
            seeded.Add(await SeedDefaultClientAsync(client =>
            {
                client.FullName = $"{marker} new";
                client.LeadStatus = LeadStatus.New;
            }));
            var talkedId = await SeedDefaultClientAsync(client =>
            {
                client.FullName = $"{marker} talked";
                client.LeadStatus = LeadStatus.New;
            });
            seeded.Add(talkedId);
            await SeedOutreachAsync(talkedId, now.AddDays(-2));
            seeded.Add(await SeedDefaultClientAsync(client =>
            {
                client.FullName = $"{marker} risk";
                client.LeadStatus = LeadStatus.Inactive;
            }));
            seeded.Add(await SeedDefaultClientAsync(client =>
            {
                client.FullName = $"{marker} opp";
                client.LeadStatus = LeadStatus.Contacted;
            }));
            seeded.Add(await SeedDefaultClientAsync(client =>
            {
                client.FullName = $"{marker} healthy";
                client.LeadStatus = LeadStatus.Active;
            }));

            using var client = await CreateDefaultAdminClientAsync();
            var dueNow = await GetFollowUpAsync(client, FollowUpCategoryContract.DueNow, page: 1, pageSize: 100);
            Assert.True(dueNow.FollowUpCategoryCounts!.DueNowCount >= 2);
            Assert.Contains(dueNow.Items, item => item.FullName == $"{marker} due");
            Assert.Contains(dueNow.Items, item => item.FullName == $"{marker} new");
            Assert.DoesNotContain(dueNow.Items, item => item.FullName == $"{marker} healthy");

            var atRisk = await GetFollowUpAsync(client, FollowUpCategoryContract.AtRisk, page: 1, pageSize: 100);
            Assert.Contains(atRisk.Items, item => item.FullName == $"{marker} risk");
            Assert.True(atRisk.FollowUpCategoryCounts!.AtRiskCount >= 1);

            var opportunity = await GetFollowUpAsync(client, FollowUpCategoryContract.Opportunity, page: 1, pageSize: 100);
            Assert.Contains(opportunity.Items, item => item.FullName == $"{marker} talked");
            Assert.Contains(opportunity.Items, item => item.FullName == $"{marker} opp");

            var healthy = await GetFollowUpAsync(client, FollowUpCategoryContract.Healthy, page: 1, pageSize: 100);
            Assert.Contains(healthy.Items, item => item.FullName == $"{marker} healthy");
            Assert.Equal(
                dueNow.FollowUpCategoryCounts.DueNowCount
                + dueNow.FollowUpCategoryCounts.AtRiskCount
                + dueNow.FollowUpCategoryCounts.OpportunityCount
                + dueNow.FollowUpCategoryCounts.HealthyCount,
                healthy.FollowUpCategoryCounts!.DueNowCount
                + healthy.FollowUpCategoryCounts.AtRiskCount
                + healthy.FollowUpCategoryCounts.OpportunityCount
                + healthy.FollowUpCategoryCounts.HealthyCount);
        }
        finally
        {
            await DeleteClientsAsync(seeded);
        }
    }

    [SkippableFact]
    public async Task FollowUpCategory_TenantMember_CanRead()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

        using var client = await CreateDefaultMemberClientAsync();
        using var response = await client.GetAsync(
            $"/api/v1/admin/clients?page=1&pageSize=25&followUpCategory={FollowUpCategoryContract.DueNow}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ClientListResponse>(IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(body);
        Assert.NotNull(body!.FollowUpCategoryCounts);
    }

    [SkippableFact]
    public async Task FollowUpCategory_UnauthorizedAndCrossTenant_RemainDenied()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

        using var anonymous = Factory.CreateClient();
        using var anonymousResponse = await anonymous.GetAsync(
            $"/api/v1/admin/clients?followUpCategory={FollowUpCategoryContract.DueNow}");
        Assert.Equal(HttpStatusCode.Unauthorized, anonymousResponse.StatusCode);

        var marker = $"fu-x-{Guid.NewGuid():N}"[..14];
        Guid foreignId;
        using (var platformClient = Factory.CreateClient())
        {
            var platformToken = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platformClient);
            IntegrationTestHelpers.UseBearerToken(platformClient, platformToken);
            var slug = $"fu-{Guid.NewGuid():N}"[..12];
            var foreignTenant = await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
                platformClient,
                "Follow-up isolation",
                slug,
                $"admin@{slug}.test");
            foreignId = (await IntegrationTestHelpers.SeedClientAsync(
                Factory.Services,
                client =>
                {
                    client.TenantId = foreignTenant.Id;
                    client.FullName = marker;
                    client.LeadStatus = LeadStatus.New;
                })).Id;
        }

        using var admin = await CreateDefaultAdminClientAsync();
        var dueNow = await GetFollowUpAsync(admin, FollowUpCategoryContract.DueNow, page: 1, pageSize: 100);
        Assert.DoesNotContain(dueNow.Items, item => item.Id == foreignId || item.FullName == marker);

        using var platformOnly = Factory.CreateClient();
        var platformAdminToken = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platformOnly);
        IntegrationTestHelpers.UseBearerToken(platformOnly, platformAdminToken);
        using var platformResponse = await platformOnly.GetAsync(
            $"/api/v1/admin/clients?followUpCategory={FollowUpCategoryContract.DueNow}");
        Assert.True(
            platformResponse.StatusCode is HttpStatusCode.Forbidden or HttpStatusCode.Unauthorized,
            $"PlatformAdmin must not read tenant Follow-up pages, got {(int)platformResponse.StatusCode}.");
    }

    [SkippableFact]
    public async Task FollowUpCategory_IdenticalSortValues_PaginateDeterministicallyOnRealDatabase()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var platformClient = Factory.CreateClient();
        var platformToken = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platformClient);
        IntegrationTestHelpers.UseBearerToken(platformClient, platformToken);
        var slug = $"fu-p-{Guid.NewGuid():N}"[..12];
        var tenant = await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            platformClient,
            "Follow-up paging",
            slug,
            $"admin@{slug}.test");

        var (adminUser, _) = await IntegrationTestHelpers.CreateTenantAdminUserAsync(
            Factory.Services,
            tenant.Id,
            $"admin-{slug}@example.com");
        var token = IntegrationTestHelpers.MintTenantAccessToken(
            Factory.Services,
            adminUser,
            tenant.Id,
            TenantMembershipRole.TenantAdmin);

        var ids = new List<Guid>();
        var now = DateTimeOffset.UtcNow;
        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            for (var index = 0; index < 101; index++)
            {
                var row = new Client
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    FullName = $"Page Twin {index:D3}",
                    LeadStatus = LeadStatus.Active,
                    CreatedAt = now,
                    UpdatedAt = now,
                };
                ids.Add(row.Id);
                db.Clients.Add(row);
            }

            await db.SaveChangesAsync();
        }

        try
        {
            using var client = Factory.CreateClient();
            IntegrationTestHelpers.UseTenantHost(client, slug);
            IntegrationTestHelpers.UseBearerToken(client, token);

            var page1 = await GetFollowUpAsync(client, FollowUpCategoryContract.Healthy, page: 1, pageSize: 100);
            var page2 = await GetFollowUpAsync(client, FollowUpCategoryContract.Healthy, page: 2, pageSize: 100);
            var page1Again = await GetFollowUpAsync(client, FollowUpCategoryContract.Healthy, page: 1, pageSize: 100);
            var page2Again = await GetFollowUpAsync(client, FollowUpCategoryContract.Healthy, page: 2, pageSize: 100);

            Assert.Equal(101, page1.TotalCount);
            Assert.Equal(101, page1.FollowUpCategoryCounts!.HealthyCount);
            Assert.Equal(0, page1.FollowUpCategoryCounts.DueNowCount);
            Assert.Equal(100, page1.Items.Count);
            Assert.Single(page2.Items);
            Assert.Equal(page1.Items.Select(item => item.Id), page1Again.Items.Select(item => item.Id));
            Assert.Equal(page2.Items.Select(item => item.Id), page2Again.Items.Select(item => item.Id));

            var merged = page1.Items.Select(item => item.Id)
                .Concat(page2.Items.Select(item => item.Id))
                .ToList();
            Assert.Equal(101, merged.Distinct().Count());
            Assert.Equal(ids.OrderBy(id => id), merged.OrderBy(id => id));
            Assert.Empty(page1.Items.Select(item => item.Id).Intersect(page2.Items.Select(item => item.Id)));
        }
        finally
        {
            await DeleteClientsAsync(ids);
        }
    }

    [SkippableFact]
    public async Task ClientsList_WithoutFollowUpCategory_OmitsFollowUpTotals()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

        using var client = await CreateDefaultAdminClientAsync();
        using var response = await client.GetAsync("/api/v1/admin/clients?page=1&pageSize=25");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ClientListResponse>(IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(body);
        Assert.Null(body!.FollowUpCategoryCounts);
        Assert.True(body.PageSize <= 100);
    }

    [SkippableFact]
    public async Task FollowUpCategory_InvalidInputs_UseExistingValidationContract()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

        using var client = await CreateDefaultAdminClientAsync();
        using var invalidCategory = await client.GetAsync("/api/v1/admin/clients?followUpCategory=overdue");
        Assert.Equal(HttpStatusCode.BadRequest, invalidCategory.StatusCode);
        var detail = await invalidCategory.Content.ReadAsStringAsync();
        Assert.Contains("followUpCategory", detail, StringComparison.OrdinalIgnoreCase);

        using var invalidLeadStatus = await client.GetAsync(
            $"/api/v1/admin/clients?followUpCategory={FollowUpCategoryContract.DueNow}&leadStatus=pipeline");
        Assert.Equal(HttpStatusCode.BadRequest, invalidLeadStatus.StatusCode);

        var zeroPage = await GetFollowUpAsync(client, FollowUpCategoryContract.DueNow, page: 0, pageSize: 25);
        Assert.Equal(1, zeroPage.Page);

        var oversized = await GetFollowUpAsync(client, FollowUpCategoryContract.DueNow, page: 1, pageSize: 500);
        Assert.Equal(100, oversized.PageSize);
    }

    private async Task<HttpClient> CreateDefaultAdminClientAsync()
    {
        var client = Factory.CreateClient();
        IntegrationTestHelpers.UseTenantHost(client, TenantIds.DefaultSlug);
        var token = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, token);
        return client;
    }

    private async Task<HttpClient> CreateDefaultMemberClientAsync()
    {
        var email = $"fu-member-{Guid.NewGuid():N}@example.com";
        var (user, _) = await IntegrationTestHelpers.CreateTenantMemberUserAsync(
            Factory.Services,
            TenantIds.Default,
            email);
        var token = IntegrationTestHelpers.MintTenantAccessToken(
            Factory.Services,
            user,
            TenantIds.Default,
            TenantMembershipRole.TenantMember);

        var client = Factory.CreateClient();
        IntegrationTestHelpers.UseTenantHost(client, TenantIds.DefaultSlug);
        IntegrationTestHelpers.UseBearerToken(client, token);
        return client;
    }

    private static async Task<ClientListResponse> GetFollowUpAsync(
        HttpClient client,
        string category,
        int page,
        int pageSize)
    {
        using var response = await client.GetAsync(
            $"/api/v1/admin/clients?page={page}&pageSize={pageSize}&sortBy=lastRegistrationDate&sortDirection=desc&followUpCategory={category}");
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<ClientListResponse>(IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(body);
        Assert.NotNull(body!.FollowUpCategoryCounts);
        return body;
    }

    private async Task<Guid> SeedDefaultClientAsync(Action<Client> configure)
    {
        var seeded = await IntegrationTestHelpers.SeedClientAsync(Factory.Services, configure);
        return seeded.Id;
    }

    private async Task SeedOutreachAsync(Guid clientId, DateTimeOffset occurredAt)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        IntegrationTestHelpers.BindDefaultTenant(scope.ServiceProvider);
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        db.ClientTimelineEvents.Add(new ClientTimelineEvent
        {
            Id = Guid.NewGuid(),
            ClientId = clientId,
            EventType = ClientTimelineEventType.WhatsAppInitiated,
            OccurredAt = occurredAt,
        });
        await db.SaveChangesAsync();
    }

    private async Task DeleteClientsAsync(IReadOnlyCollection<Guid> ids)
    {
        if (ids.Count == 0)
        {
            return;
        }

        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var events = await db.IgnoreTenantFilters<ClientTimelineEvent>()
            .Where(item => ids.Contains(item.ClientId))
            .ToListAsync();
        db.ClientTimelineEvents.RemoveRange(events);
        var rows = await db.IgnoreTenantFilters<Client>()
            .Where(item => ids.Contains(item.Id))
            .ToListAsync();
        db.Clients.RemoveRange(rows);
        await db.SaveChangesAsync();
    }
}
