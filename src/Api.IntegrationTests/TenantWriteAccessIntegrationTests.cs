using System.Net;
using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Activities;
using Cohestra.Contracts.Admin;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

/// <summary>
/// Read-only workspace middleware must block tenant mutations but allow operator profile preferences.
/// </summary>
[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class TenantWriteAccessIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task TenantMember_CanUpdateAppearance_WhenWorkspaceIsReadOnly()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

        var previousBillingStatus = await SetDefaultTenantBillingStatusAsync(BillingStatus.OnHold);

        try
        {
            using var client = await CreateTenantMemberClientAsync();

            using var appearanceResponse = await client.PatchAsJsonAsync(
                "/api/v1/admin/me/appearance",
                new UpdateAppearanceRequest("dark", null),
                IntegrationTestHelpers.JsonOptions);

            Assert.Equal(HttpStatusCode.OK, appearanceResponse.StatusCode);

            var profile = await appearanceResponse.Content.ReadFromJsonAsync<AdminProfileResponse>(
                IntegrationTestHelpers.JsonOptions);
            Assert.NotNull(profile);
            Assert.Equal("dark", profile!.ThemePreference);
        }
        finally
        {
            await SetDefaultTenantBillingStatusAsync(previousBillingStatus);
        }
    }

    [SkippableFact]
    public async Task TenantMember_CanUpdateAppearance_WhenOverPlanLimits()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

        var seededCommunityIds = await SeedDefaultTenantCommunitiesToProCapAsync();

        try
        {
            using var client = await CreateTenantMemberClientAsync();

            using var appearanceResponse = await client.PatchAsJsonAsync(
                "/api/v1/admin/me/appearance",
                new UpdateAppearanceRequest("light", null),
                IntegrationTestHelpers.JsonOptions);

            Assert.Equal(HttpStatusCode.OK, appearanceResponse.StatusCode);

            var profile = await appearanceResponse.Content.ReadFromJsonAsync<AdminProfileResponse>(
                IntegrationTestHelpers.JsonOptions);
            Assert.NotNull(profile);
            Assert.Equal("light", profile!.ThemePreference);
        }
        finally
        {
            await DeleteCommunitiesAsync(seededCommunityIds);
        }
    }

    [SkippableFact]
    public async Task TenantAdmin_WorkspaceWrites_StillBlocked_WhenReadOnly()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

        var previousBillingStatus = await SetDefaultTenantBillingStatusAsync(BillingStatus.OnHold);

        try
        {
            using var client = Factory.CreateClient();
            var token = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
            IntegrationTestHelpers.UseBearerToken(client, token);

            using var createResponse = await client.PostAsJsonAsync(
                "/api/v1/admin/activities",
                new CreateActivityRequest(
                    Name: $"Read-only block {Guid.NewGuid():N}"[..32],
                    Category: "Test",
                    Schedule: "Saturday 10:00",
                    Location: "Test Court",
                    CommunityLabel: "Integration Community",
                    Status: ActivityStatus.Draft.ToString().ToLowerInvariant(),
                    MaxRegistrants: null),
                IntegrationTestHelpers.JsonOptions);

            Assert.Equal(HttpStatusCode.Forbidden, createResponse.StatusCode);

            var detail = await createResponse.Content.ReadAsStringAsync();
            Assert.Contains("read-only", detail, StringComparison.OrdinalIgnoreCase);
        }
        finally
        {
            await SetDefaultTenantBillingStatusAsync(previousBillingStatus);
        }
    }

    private async Task<HttpClient> CreateTenantMemberClientAsync()
    {
        var email = $"member-{Guid.NewGuid():N}@example.com";
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

    private async Task<BillingStatus> SetDefaultTenantBillingStatusAsync(BillingStatus billingStatus)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        IntegrationTestHelpers.BindDefaultTenant(scope.ServiceProvider);

        var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var tenant = await dbContext.Tenants.FindAsync(TenantIds.Default)
            ?? throw new InvalidOperationException("Default tenant not found.");

        var previous = tenant.BillingStatus;
        if (tenant.BillingStatus != billingStatus)
        {
            tenant.BillingStatus = billingStatus;
            tenant.UpdatedAt = DateTimeOffset.UtcNow;
            await dbContext.SaveChangesAsync();
        }

        return previous;
    }

    private async Task<List<Guid>> SeedDefaultTenantCommunitiesToProCapAsync()
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        IntegrationTestHelpers.BindDefaultTenant(scope.ServiceProvider);

        var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var cap = TenantPlanLimits.For(TenantPlan.Pro).Communities;
        var current = await dbContext.Communities
            .CountAsync(c => c.TenantId == TenantIds.Default);

        var added = new List<Guid>();
        var now = DateTimeOffset.UtcNow;
        for (var index = current; index < cap; index++)
        {
            var id = Guid.NewGuid();
            dbContext.Communities.Add(new Community
            {
                Id = id,
                TenantId = TenantIds.Default,
                Name = $"Read-only cap {id:N}"[..28],
                CreatedAt = now,
                UpdatedAt = now,
            });
            added.Add(id);
        }

        if (added.Count > 0)
        {
            await dbContext.SaveChangesAsync();
        }

        return added;
    }

    private async Task DeleteCommunitiesAsync(IReadOnlyList<Guid> communityIds)
    {
        if (communityIds.Count == 0)
        {
            return;
        }

        await using var scope = Factory.Services.CreateAsyncScope();
        IntegrationTestHelpers.BindDefaultTenant(scope.ServiceProvider);

        var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var communities = await dbContext.Communities
            .Where(c => communityIds.Contains(c.Id))
            .ToListAsync();

        dbContext.Communities.RemoveRange(communities);
        await dbContext.SaveChangesAsync();
    }
}
