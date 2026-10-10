using System.Net;
using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Billing;
using Cohestra.Contracts.Team;
using Cohestra.Domain.Tenants;

namespace Cohestra.Api.IntegrationTests;

/// <summary>
/// Epic 12 / Story 17.3 — live-stack proof that membership and platform authz policies hold on real routes.
/// </summary>
[Trait("Category", "Integration")]
[Trait("Category", "TenantIsolation")]
[Collection(IntegrationTestCollection.Name)]
public sealed class TenantAuthzIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task TenantMember_JWT_admin_only_routes_return_403()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = await CreateTenantMemberClientAsync();

        using var inviteResponse = await client.PostAsJsonAsync(
            "/api/v1/admin/team/invites",
            new CreateTeamInviteRequest("member-invite@example.com", "TenantMember"),
            IntegrationTestHelpers.JsonOptions);
        await AssertForbiddenAsync(inviteResponse);

        using var billingGetResponse = await client.GetAsync("/api/v1/admin/billing");
        await AssertForbiddenAsync(billingGetResponse);

        using var billingSyncResponse = await client.PostAsync("/api/v1/admin/billing/sync", content: null);
        await AssertForbiddenAsync(billingSyncResponse);

        using var checkoutResponse = await client.PostAsJsonAsync(
            "/api/v1/admin/billing/checkout",
            new CreateCheckoutSessionRequest(
                "Core",
                "monthly",
                "http://localhost/success",
                "http://localhost/cancel"),
            IntegrationTestHelpers.JsonOptions);
        await AssertForbiddenAsync(checkoutResponse);

        using var portalResponse = await client.PostAsJsonAsync(
            "/api/v1/admin/billing/portal",
            new CreatePortalSessionRequest("http://localhost/settings/billing"),
            IntegrationTestHelpers.JsonOptions);
        await AssertForbiddenAsync(portalResponse);

        using var embedGetResponse = await client.GetAsync("/api/v1/admin/tenant/embed-settings");
        await AssertForbiddenAsync(embedGetResponse);

        using var embedPatchResponse = await client.PatchAsJsonAsync(
            "/api/v1/admin/tenant/embed-settings",
            new { allowedEmbedOrigins = new[] { "https://club.example.com" } },
            IntegrationTestHelpers.JsonOptions);
        await AssertForbiddenAsync(embedPatchResponse);
    }

    [SkippableFact]
    public async Task TenantAdmin_JWT_platform_namespace_returns_403()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        var token = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, token);

        using var response = await client.GetAsync("/api/v1/platform/tenants");
        await AssertForbiddenAsync(response);
        await AssertPlatformOpsForbiddenAsync(client, TenantIds.Default, Guid.NewGuid());
    }

    [SkippableFact]
    public async Task TenantMember_JWT_platform_namespace_returns_403()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = await CreateTenantMemberClientAsync();
        client.DefaultRequestHeaders.Host = "localhost";

        using var response = await client.GetAsync("/api/v1/platform/tenants");
        await AssertForbiddenAsync(response);
        await AssertPlatformOpsForbiddenAsync(client, TenantIds.Default, Guid.NewGuid());
    }

    [SkippableFact]
    public async Task PlatformAdmin_JWT_platform_namespace_succeeds()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        var token = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, token);

        using var response = await client.GetAsync("/api/v1/platform/tenants");
        response.EnsureSuccessStatusCode();

        using var overview = await client.GetAsync("/api/v1/platform/ops/overview");
        overview.EnsureSuccessStatusCode();

        using var health = await client.GetAsync("/api/v1/platform/ops/health");
        health.EnsureSuccessStatusCode();

        using var outboxSummary = await client.GetAsync("/api/v1/platform/ops/outbox/summary");
        outboxSummary.EnsureSuccessStatusCode();

        using var outboxList = await client.GetAsync("/api/v1/platform/ops/outbox");
        outboxList.EnsureSuccessStatusCode();

        using var paddleConfig = await client.GetAsync("/api/v1/platform/ops/paddle/config");
        paddleConfig.EnsureSuccessStatusCode();

        using var paddleDeliveries = await client.GetAsync("/api/v1/platform/ops/paddle/deliveries");
        paddleDeliveries.EnsureSuccessStatusCode();

        using var timeline = await client.GetAsync($"/api/v1/platform/tenants/{TenantIds.Default}/timeline");
        timeline.EnsureSuccessStatusCode();

        using var audits = await client.GetAsync("/api/v1/platform/audits");
        audits.EnsureSuccessStatusCode();

        using var export = await client.GetAsync(
            $"/api/v1/platform/audits/export?from={Uri.EscapeDataString(DateTimeOffset.UtcNow.AddYears(10).ToString("O"))}");
        export.EnsureSuccessStatusCode();
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

    private static async Task AssertPlatformOpsForbiddenAsync(
        HttpClient client,
        Guid tenantId,
        Guid memberUserId)
    {
        using var overview = await client.GetAsync("/api/v1/platform/ops/overview");
        await AssertForbiddenAsync(overview);

        using var health = await client.GetAsync("/api/v1/platform/ops/health");
        await AssertForbiddenAsync(health);

        using var outboxSummary = await client.GetAsync("/api/v1/platform/ops/outbox/summary");
        await AssertForbiddenAsync(outboxSummary);

        using var outboxList = await client.GetAsync("/api/v1/platform/ops/outbox");
        await AssertForbiddenAsync(outboxList);

        using var paddleConfig = await client.GetAsync("/api/v1/platform/ops/paddle/config");
        await AssertForbiddenAsync(paddleConfig);

        using var paddleDeliveries = await client.GetAsync("/api/v1/platform/ops/paddle/deliveries");
        await AssertForbiddenAsync(paddleDeliveries);

        using var search = await client.GetAsync("/api/v1/platform/search?q=ops");
        await AssertForbiddenAsync(search);

        using var snapshot = await client.GetAsync($"/api/v1/platform/tenants/{tenantId}/snapshot");
        await AssertForbiddenAsync(snapshot);

        using var members = await client.GetAsync($"/api/v1/platform/tenants/{tenantId}/members");
        await AssertForbiddenAsync(members);

        using var issues = await client.GetAsync($"/api/v1/platform/tenants/{tenantId}/open-issues");
        await AssertForbiddenAsync(issues);

        using var timeline = await client.GetAsync($"/api/v1/platform/tenants/{tenantId}/timeline");
        await AssertForbiddenAsync(timeline);

        using var audits = await client.GetAsync("/api/v1/platform/audits");
        await AssertForbiddenAsync(audits);

        using var export = await client.GetAsync("/api/v1/platform/audits/export");
        await AssertForbiddenAsync(export);

        using var reset = await client.PostAsync(
            $"/api/v1/platform/tenants/{tenantId}/members/{memberUserId}/send-password-reset",
            content: null);
        await AssertForbiddenAsync(reset);

        using var resend = await client.PostAsync(
            $"/api/v1/platform/tenants/{tenantId}/members/{memberUserId}/resend-email-verification",
            content: null);
        await AssertForbiddenAsync(resend);
    }

    private static async Task AssertForbiddenAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

        var contentType = response.Content.Headers.ContentType?.MediaType;
        if (string.Equals(contentType, "application/problem+json", StringComparison.OrdinalIgnoreCase))
        {
            var body = await response.Content.ReadAsStringAsync();
            Assert.Contains("status", body, StringComparison.OrdinalIgnoreCase);
        }
    }
}
