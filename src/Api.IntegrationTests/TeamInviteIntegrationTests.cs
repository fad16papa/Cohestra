using System.Net;
using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Team;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Trait("Category", "TenantIsolation")]
[Collection(IntegrationTestCollection.Name)]
public sealed class TeamInviteIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task TenantMember_GetTeam_Returns403()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var (adminClient, slug, tenantId) = await CreatePlanTenantAsync(TenantPlan.Core);
        using (adminClient)
        {
            var (member, _) = await IntegrationTestHelpers.CreateTenantMemberUserAsync(
                Factory.Services,
                tenantId,
                $"member-{Guid.NewGuid():N}@example.com");

            using var memberClient = Factory.CreateClient();
            IntegrationTestHelpers.UseTenantHost(memberClient, slug);
            var token = IntegrationTestHelpers.MintTenantAccessToken(
                Factory.Services,
                member,
                tenantId,
                TenantMembershipRole.TenantMember);
            IntegrationTestHelpers.UseBearerToken(memberClient, token);

            using var response = await memberClient.GetAsync("/api/v1/admin/team");
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }
    }

    [SkippableFact]
    public async Task BasicAdmin_CreateInvite_Returns403PlanLocked()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var (client, slug, _) = await CreatePlanTenantAsync(TenantPlan.Basic);
        using (client)
        {
            using var response = await client.PostAsJsonAsync(
                "/api/v1/admin/team/invites",
                new CreateTeamInviteRequest($"invite-{slug}@example.com", "TenantMember"),
                IntegrationTestHelpers.JsonOptions);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            Assert.Equal("plan_locked", await IntegrationTestHelpers.ReadProblemErrorCodeAsync(response));
        }
    }

    [SkippableFact]
    public async Task CoreAdmin_CreateInvite_AtSeatCap_Returns409()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var (client, slug, _) = await CreatePlanTenantAsync(TenantPlan.Core);
        using (client)
        {
            for (var i = 0; i < 2; i++)
            {
                using var fill = await client.PostAsJsonAsync(
                    "/api/v1/admin/team/invites",
                    new CreateTeamInviteRequest($"fill-{i}-{slug}@example.com", "TenantMember"),
                    IntegrationTestHelpers.JsonOptions);
                Assert.Equal(HttpStatusCode.NoContent, fill.StatusCode);
            }

            using var blocked = await client.PostAsJsonAsync(
                "/api/v1/admin/team/invites",
                new CreateTeamInviteRequest($"over-{slug}@example.com", "TenantMember"),
                IntegrationTestHelpers.JsonOptions);

            Assert.Equal(HttpStatusCode.Conflict, blocked.StatusCode);
            Assert.Equal("seat_cap_reached", await IntegrationTestHelpers.ReadProblemErrorCodeAsync(blocked));
        }
    }

    [SkippableFact]
    public async Task CoreAdmin_InvalidEmail_Returns400_AndRevokeFreesSeat()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var (client, slug, _) = await CreatePlanTenantAsync(TenantPlan.Core);
        using (client)
        {
            using var invalid = await client.PostAsJsonAsync(
                "/api/v1/admin/team/invites",
                new CreateTeamInviteRequest("not-an-email", "TenantMember"),
                IntegrationTestHelpers.JsonOptions);
            Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);

            using var created = await client.PostAsJsonAsync(
                "/api/v1/admin/team/invites",
                new CreateTeamInviteRequest($"pending-{slug}@example.com", "TenantMember"),
                IntegrationTestHelpers.JsonOptions);
            Assert.Equal(HttpStatusCode.NoContent, created.StatusCode);

            using var overviewResponse = await client.GetAsync("/api/v1/admin/team");
            overviewResponse.EnsureSuccessStatusCode();
            var overview = await overviewResponse.Content.ReadFromJsonAsync<TeamOverviewResponse>(
                IntegrationTestHelpers.JsonOptions);
            Assert.NotNull(overview);
            Assert.Single(overview!.Invites);

            using var revoked = await client.DeleteAsync(
                $"/api/v1/admin/team/invites/{overview.Invites[0].InviteId}");
            Assert.Equal(HttpStatusCode.NoContent, revoked.StatusCode);

            using var after = await client.GetAsync("/api/v1/admin/team");
            var afterBody = await after.Content.ReadFromJsonAsync<TeamOverviewResponse>(
                IntegrationTestHelpers.JsonOptions);
            Assert.NotNull(afterBody);
            Assert.Empty(afterBody!.Invites);
        }
    }

    [SkippableFact]
    public async Task Admin_CannotRemoveSelf_AndCannotSeeOtherTenantTeam()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var (clientA, _, _) = await CreatePlanTenantAsync(TenantPlan.Core);
        var (clientB, _, _) = await CreatePlanTenantAsync(TenantPlan.Core);
        using (clientA)
        using (clientB)
        {
            using var overviewA = await clientA.GetAsync("/api/v1/admin/team");
            overviewA.EnsureSuccessStatusCode();
            var teamA = await overviewA.Content.ReadFromJsonAsync<TeamOverviewResponse>(
                IntegrationTestHelpers.JsonOptions);
            Assert.NotNull(teamA);
            var selfId = teamA!.Members[0].UserId;

            using var selfRemove = await clientA.DeleteAsync($"/api/v1/admin/team/members/{selfId}");
            Assert.Equal(HttpStatusCode.BadRequest, selfRemove.StatusCode);

            using var overviewB = await clientB.GetAsync("/api/v1/admin/team");
            var teamB = await overviewB.Content.ReadFromJsonAsync<TeamOverviewResponse>(
                IntegrationTestHelpers.JsonOptions);
            Assert.NotNull(teamB);
            var otherMember = teamB!.Members[0].UserId;

            using var cross = await clientA.DeleteAsync($"/api/v1/admin/team/members/{otherMember}");
            Assert.True(
                cross.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Forbidden,
                $"Expected isolation denial, got {(int)cross.StatusCode}");
        }
    }

    private async Task<(HttpClient Client, string Slug, Guid TenantId)> CreatePlanTenantAsync(TenantPlan plan)
    {
        var slug = $"team-{Guid.NewGuid():N}"[..16];
        var adminEmail = $"admin-{slug}@example.com";

        using var platformClient = Factory.CreateClient();
        var platformToken = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platformClient);
        IntegrationTestHelpers.UseBearerToken(platformClient, platformToken);

        var tenant = await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            platformClient,
            "Team permissions",
            slug,
            adminEmail);

        if (plan != TenantPlan.Basic)
        {
            await SetTenantPlanAsync(tenant.Id, plan);
        }

        var (_, password) = await IntegrationTestHelpers.CreateTenantAdminUserAsync(
            Factory.Services,
            tenant.Id,
            adminEmail);

        var client = Factory.CreateClient();
        IntegrationTestHelpers.UseTenantHost(client, slug);
        var token = await IntegrationTestHelpers.LoginAsync(client, adminEmail, password);
        IntegrationTestHelpers.UseBearerToken(client, token);
        return (client, slug, tenant.Id);
    }

    private async Task SetTenantPlanAsync(Guid tenantId, TenantPlan plan)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var tenant = await db.Tenants.FirstAsync(item => item.Id == tenantId);
        tenant.Plan = plan;
        await db.SaveChangesAsync();
    }
}
