using System.Net;
using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class BillingIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task TenantAdmin_GetDetails_ReturnsPersistedBillingContactPhone()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            var row = await db.Tenants.FirstAsync(tenant => tenant.Id == TenantIds.Default);
            row.BillingContactPhone = "+6591234567";
            await db.SaveChangesAsync();
        }

        using var client = Factory.CreateClient();
        var token = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, token);

        using var response = await client.GetAsync("/api/v1/admin/billing/details");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var details = await response.Content.ReadFromJsonAsync<BillingDetailsResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(details);
        Assert.Equal("+6591234567", details.Contact?.Phone);
    }

    [SkippableFact]
    public async Task TenantAdmin_GetBilling_ReturnsUsageAndPlanLimits()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

        using var client = Factory.CreateClient();
        var token = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, token);

        using var response = await client.GetAsync("/api/v1/admin/billing");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var summary = await response.Content.ReadFromJsonAsync<BillingSummaryResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(summary);
        Assert.Equal("Pro", summary.Plan);
        Assert.NotNull(summary.Usage);
        Assert.NotNull(summary.CoreLimits);
        Assert.NotNull(summary.ProLimits);
        Assert.Equal(3, summary.CoreLimits.Seats);
        Assert.Equal(10, summary.ProLimits.Seats);
        Assert.False(summary.BillingConfigured);
    }

    [SkippableFact]
    public async Task TenantAdmin_Sync_WhenPaddleNotConfigured_Returns503()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

        using var client = Factory.CreateClient();
        var token = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, token);

        using var response = await client.PostAsync("/api/v1/admin/billing/sync", content: null);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    [SkippableFact]
    public async Task TenantAdmin_CancelScheduledChange_WhenPaddleNotConfigured_Returns503()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

        using var client = Factory.CreateClient();
        var token = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, token);

        using var response = await client.PostAsync(
            "/api/v1/admin/billing/subscription/cancel-scheduled-change",
            content: null);
        // 29.1: money APIs 503 when Paddle is not configured. Local 400 (no schedule)
        // returns once Story 29.5 implements scheduled-change cancel.
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    [SkippableFact]
    public async Task InvitedTenantAdmin_CreatePortal_Returns403OwnerManaged()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"bill-{Guid.NewGuid():N}"[..16];
        var ownerEmail = $"owner-{slug}@example.com";
        var invitedEmail = $"invited-{slug}@example.com";

        using var platformClient = Factory.CreateClient();
        var platformToken = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platformClient);
        IntegrationTestHelpers.UseBearerToken(platformClient, platformToken);
        var tenant = await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            platformClient,
            "Billing portal owner",
            slug,
            ownerEmail);

        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            var row = await db.Tenants.FirstAsync(item => item.Id == tenant.Id);
            row.Plan = TenantPlan.Pro;
            await db.SaveChangesAsync();
        }

        await IntegrationTestHelpers.CreateTenantAdminUserAsync(
            Factory.Services,
            tenant.Id,
            ownerEmail);
        var (invited, _) = await IntegrationTestHelpers.CreateTenantAdminUserAsync(
            Factory.Services,
            tenant.Id,
            invitedEmail);
        var token = IntegrationTestHelpers.MintTenantAccessToken(
            Factory.Services,
            invited,
            tenant.Id,
            TenantMembershipRole.TenantAdmin);

        using var client = Factory.CreateClient();
        IntegrationTestHelpers.UseTenantHost(client, slug);
        IntegrationTestHelpers.UseBearerToken(client, token);

        using var response = await client.PostAsJsonAsync(
            "/api/v1/admin/billing/portal",
            new CreatePortalSessionRequest($"http://{slug}.localhost/settings/billing"),
            IntegrationTestHelpers.JsonOptions);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("managed by", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("503", body, StringComparison.Ordinal);
    }

    [SkippableFact]
    public async Task TenantAdmin_CreatePortal_ValidWorkspaceUrl_Returns503WhenPaddleMissing()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        using var client = await CreateBillingOwnerClientAsync();

        using var response = await client.PostAsJsonAsync(
            "/api/v1/admin/billing/portal",
            new CreatePortalSessionRequest(WorkspaceUrl("/settings/billing")),
            IntegrationTestHelpers.JsonOptions);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("Invalid return URL", body, StringComparison.Ordinal);
    }

    [SkippableFact]
    public async Task TenantAdmin_CreatePortal_DefaultReturnUrl_Returns503WhenPaddleMissing()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        using var client = await CreateBillingOwnerClientAsync();

        using var response = await client.PostAsJsonAsync(
            "/api/v1/admin/billing/portal",
            new CreatePortalSessionRequest(null),
            IntegrationTestHelpers.JsonOptions);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("Invalid return URL", body, StringComparison.Ordinal);
    }

    [SkippableTheory]
    [InlineData("https://default.localhost/settings/billing", "Invalid return URL")]
    [InlineData("http://harbourline.localhost/settings/billing", "Invalid return URL")]
    [InlineData("https://evil.example/settings/billing", "Invalid return URL")]
    [InlineData("http://default.localhost.evil.example/settings/billing", "Invalid return URL")]
    [InlineData("http://default.localhost:8443/settings/billing", "Invalid return URL")]
    [InlineData("http://default.localhost/settings/billing", "Invalid return URL")]
    [InlineData("not-a-url", "Invalid return URL")]
    public async Task TenantAdmin_CreatePortal_RejectsUnsafeReturnUrl(string returnUrl, string title)
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        using var client = await CreateBillingOwnerClientAsync();

        using var response = await client.PostAsJsonAsync(
            "/api/v1/admin/billing/portal",
            new CreatePortalSessionRequest(returnUrl),
            IntegrationTestHelpers.JsonOptions);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains(title, body, StringComparison.Ordinal);
        Assert.Contains("current workspace host", body, StringComparison.OrdinalIgnoreCase);
    }

    [SkippableFact]
    public async Task TenantAdmin_CreatePortal_ForwardedHeadersDoNotBypassAllowList()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        using var client = await CreateBillingOwnerClientAsync();
        // Loopback is a trusted ForwardedHeaders peer. Keep the forwarded host on the
        // authenticated tenant so resolution still succeeds; proto https would have
        // failed the old Request.Scheme compare against an http PublicWeb origin.
        client.DefaultRequestHeaders.Add("X-Forwarded-Proto", "https");
        client.DefaultRequestHeaders.Add("X-Forwarded-Host", $"{TenantIds.DefaultSlug}.localhost");

        using var rejected = await client.PostAsJsonAsync(
            "/api/v1/admin/billing/portal",
            new CreatePortalSessionRequest("https://evil.example/settings/billing"),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);

        using var accepted = await client.PostAsJsonAsync(
            "/api/v1/admin/billing/portal",
            new CreatePortalSessionRequest(WorkspaceUrl("/settings/billing")),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, accepted.StatusCode);
    }

    [SkippableFact]
    public async Task TenantAdmin_CreatePortal_VerifiedCustomDomain_IsAllowedOnPublicScheme()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await SetDefaultCustomDomainAsync("events.acme.example", DateTimeOffset.UtcNow);
        try
        {
            using var client = await CreateBillingOwnerClientAsync();

            using var accepted = await client.PostAsJsonAsync(
                "/api/v1/admin/billing/portal",
                new CreatePortalSessionRequest("http://events.acme.example/settings/billing"),
                IntegrationTestHelpers.JsonOptions);
            Assert.Equal(HttpStatusCode.ServiceUnavailable, accepted.StatusCode);

            using var rejected = await client.PostAsJsonAsync(
                "/api/v1/admin/billing/portal",
                new CreatePortalSessionRequest("https://events.acme.example/settings/billing"),
                IntegrationTestHelpers.JsonOptions);
            Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);
        }
        finally
        {
            await SetDefaultCustomDomainAsync(null, null);
        }
    }

    [SkippableFact]
    public async Task TenantAdmin_CreatePortal_UnverifiedCustomDomain_IsRejected()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await SetDefaultCustomDomainAsync("events.acme.example", verifiedAt: null);
        try
        {
            using var client = await CreateBillingOwnerClientAsync();
            using var response = await client.PostAsJsonAsync(
                "/api/v1/admin/billing/portal",
                new CreatePortalSessionRequest("http://events.acme.example/settings/billing"),
                IntegrationTestHelpers.JsonOptions);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }
        finally
        {
            await SetDefaultCustomDomainAsync(null, null);
        }
    }

    [SkippableFact]
    public async Task TenantAdmin_CreateCheckout_ValidWorkspaceUrls_Returns503WhenPaddleMissing()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        using var client = await CreateBillingOwnerClientAsync();

        using var response = await client.PostAsJsonAsync(
            "/api/v1/admin/billing/checkout",
            new CreateCheckoutSessionRequest(
                "Core",
                "monthly",
                WorkspaceUrl("/dashboard?billing=success"),
                WorkspaceUrl("/billing/checkout?canceled=1")),
            IntegrationTestHelpers.JsonOptions);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("Invalid success URL", body, StringComparison.Ordinal);
        Assert.DoesNotContain("Invalid cancel URL", body, StringComparison.Ordinal);
    }

    [SkippableFact]
    public async Task TenantAdmin_PlanChangePreviewAndConfirm_Return503WhenPaddleMissing()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        using var client = await CreateBillingOwnerClientAsync();

        using var preview = await client.PostAsJsonAsync(
            "/api/v1/admin/billing/subscription/change-preview",
            new PreviewPlanChangeRequest("Pro", "annual"),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, preview.StatusCode);

        using var confirm = await client.PostAsJsonAsync(
            "/api/v1/admin/billing/subscription/change",
            new ConfirmPlanChangeRequest(
                "Pro",
                "annual",
                "preview-state",
                WorkspaceUrl("/settings/billing?billing=success"),
                WorkspaceUrl("/billing/checkout")),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, confirm.StatusCode);

        var previewBody = await preview.Content.ReadAsStringAsync();
        Assert.DoesNotContain("pri_", previewBody, StringComparison.Ordinal);
        Assert.DoesNotContain("pdl_", previewBody, StringComparison.Ordinal);
    }

    [SkippableTheory]
    [InlineData("https://evil.example/success", "http://default.localhost:3000/cancel", "Invalid success URL")]
    [InlineData("http://default.localhost:3000/success", "https://evil.example/cancel", "Invalid cancel URL")]
    [InlineData("http://other.localhost:3000/success", "http://default.localhost:3000/cancel", "Invalid success URL")]
    [InlineData("http://default.localhost.evil.example/success", "http://default.localhost:3000/cancel", "Invalid success URL")]
    [InlineData("http://default.localhost:8443/success", "http://default.localhost:3000/cancel", "Invalid success URL")]
    public async Task TenantAdmin_CreateCheckout_RejectsUnsafeReturnUrls(
        string successUrl,
        string cancelUrl,
        string title)
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        using var client = await CreateBillingOwnerClientAsync();

        using var response = await client.PostAsJsonAsync(
            "/api/v1/admin/billing/checkout",
            new CreateCheckoutSessionRequest("Core", "monthly", successUrl, cancelUrl),
            IntegrationTestHelpers.JsonOptions);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains(title, body, StringComparison.Ordinal);
    }

    [SkippableFact]
    public async Task TenantAdmin_CreateCheckout_ForwardedHeadersDoNotBypassAllowList()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        using var client = await CreateBillingOwnerClientAsync();
        client.DefaultRequestHeaders.Add("X-Forwarded-Proto", "https");
        client.DefaultRequestHeaders.Add("X-Forwarded-Host", $"{TenantIds.DefaultSlug}.localhost");

        using var rejected = await client.PostAsJsonAsync(
            "/api/v1/admin/billing/checkout",
            new CreateCheckoutSessionRequest(
                "Core",
                "monthly",
                "https://evil.example/success",
                "https://evil.example/cancel"),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);

        using var accepted = await client.PostAsJsonAsync(
            "/api/v1/admin/billing/checkout",
            new CreateCheckoutSessionRequest(
                "Core",
                "monthly",
                WorkspaceUrl("/dashboard?billing=success"),
                WorkspaceUrl("/billing/checkout?canceled=1")),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, accepted.StatusCode);
    }

    private static string WorkspaceUrl(string path) =>
        $"http://{TenantIds.DefaultSlug}.localhost:3000{path}";

    private async Task<HttpClient> CreateBillingOwnerClientAsync()
    {
        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);
        var client = Factory.CreateClient();
        var token = await IntegrationTestHelpers.LoginAsOperatorAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, token);
        return client;
    }

    private async Task SetDefaultCustomDomainAsync(string? host, DateTimeOffset? verifiedAt)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var row = await db.Tenants.FirstAsync(tenant => tenant.Id == TenantIds.Default);
        row.CustomDomain = host;
        row.CustomDomainVerifiedAt = verifiedAt;
        await db.SaveChangesAsync();
    }
}
