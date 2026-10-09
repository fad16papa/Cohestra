using System.Net;
using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Platform;

namespace Cohestra.Api.IntegrationTests;

[Collection(IntegrationTestCollection.Name)]
[Trait("Category", "Integration")]
public sealed class PlatformOpsHttpIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task PlatformAdmin_ops_routes_preserve_epic_28_contracts()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        var token = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, token);

        var slug = $"ops-{Guid.NewGuid():N}"[..12];
        var created = await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            client,
            "Ops Contract Org",
            slug,
            $"admin-{slug}@ops-contract.test");

        using var searchResponse = await client.GetAsync($"/api/v1/platform/search?q={slug}");
        Assert.Equal(HttpStatusCode.OK, searchResponse.StatusCode);
        var search = await searchResponse.Content.ReadFromJsonAsync<PlatformOmniSearchResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(search);
        Assert.Contains(search.Tenants, item => item.Id == created.Id && item.Slug == slug && item.Name == "Ops Contract Org");
        Assert.NotNull(search.Issues);

        using var snapshotResponse = await client.GetAsync($"/api/v1/platform/tenants/{created.Id}/snapshot");
        Assert.Equal(HttpStatusCode.OK, snapshotResponse.StatusCode);
        var snapshot = await snapshotResponse.Content.ReadFromJsonAsync<PlatformTenantSnapshotResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(snapshot);
        Assert.Equal(created.Id, snapshot.TenantId);
        Assert.Equal(slug, snapshot.Slug);
        Assert.Equal("Ops Contract Org", snapshot.Name);
        Assert.False(string.IsNullOrWhiteSpace(snapshot.Plan));
        Assert.False(string.IsNullOrWhiteSpace(snapshot.Status));
        Assert.False(string.IsNullOrWhiteSpace(snapshot.BillingStatus));
        Assert.NotNull(snapshot.Seats);
        Assert.NotNull(snapshot.Members);

        var verifiedEmail = $"verified-{Guid.NewGuid():N}@ops-contract.test";
        var unverifiedEmail = $"unverified-{Guid.NewGuid():N}@ops-contract.test";
        var (verified, _) = await IntegrationTestHelpers.CreateTenantMemberUserAsync(
            Factory.Services,
            created.Id,
            verifiedEmail);
        var (unverified, _) = await IntegrationTestHelpers.CreateTenantMemberUserAsync(
            Factory.Services,
            created.Id,
            unverifiedEmail);
        await IntegrationTestHelpers.SetEmailConfirmedAsync(Factory.Services, unverified.Id, false);

        using var membersResponse = await client.GetAsync($"/api/v1/platform/tenants/{created.Id}/members");
        Assert.Equal(HttpStatusCode.OK, membersResponse.StatusCode);
        var members = await membersResponse.Content.ReadFromJsonAsync<List<PlatformTenantMemberResponse>>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(members);
        Assert.Contains(members, member => member.UserId == verified.Id && member.Email == verifiedEmail && member.EmailVerified);
        Assert.Contains(members, member => member.UserId == unverified.Id && member.Email == unverifiedEmail && !member.EmailVerified);

        using var issuesResponse = await client.GetAsync($"/api/v1/platform/tenants/{created.Id}/open-issues");
        Assert.Equal(HttpStatusCode.OK, issuesResponse.StatusCode);
        var issues = await issuesResponse.Content.ReadFromJsonAsync<List<PlatformTenantOpenIssueResponse>>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(issues);
        Assert.Empty(issues);

        using var resetUnverified = await client.PostAsync(
            $"/api/v1/platform/tenants/{created.Id}/members/{unverified.Id}/send-password-reset",
            content: null);
        Assert.Equal(HttpStatusCode.Conflict, resetUnverified.StatusCode);

        using var resetVerified = await client.PostAsync(
            $"/api/v1/platform/tenants/{created.Id}/members/{verified.Id}/send-password-reset",
            content: null);
        Assert.Equal(HttpStatusCode.OK, resetVerified.StatusCode);
        var resetBody = await resetVerified.Content.ReadFromJsonAsync<PlatformRecoveryActionResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal("If an account exists, a reset code was sent.", resetBody?.Message);

        using var resendVerified = await client.PostAsync(
            $"/api/v1/platform/tenants/{created.Id}/members/{verified.Id}/resend-email-verification",
            content: null);
        Assert.Equal(HttpStatusCode.Conflict, resendVerified.StatusCode);

        using var resendUnverified = await client.PostAsync(
            $"/api/v1/platform/tenants/{created.Id}/members/{unverified.Id}/resend-email-verification",
            content: null);
        Assert.Equal(HttpStatusCode.OK, resendUnverified.StatusCode);
        var resendBody = await resendUnverified.Content.ReadFromJsonAsync<PlatformRecoveryActionResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.False(string.IsNullOrWhiteSpace(resendBody?.Message));
    }
}
