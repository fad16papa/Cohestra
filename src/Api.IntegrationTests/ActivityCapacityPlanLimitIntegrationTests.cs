using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Activities;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Tenants;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class ActivityCapacityPlanLimitIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task UpdateActivity_WhenMaxRegistrantsExceedsProPlanLimit_Returns400()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

        var slug = $"plan-cap-{Guid.NewGuid():N}"[..24];
        var activity = await IntegrationTestHelpers.SeedPublishedActivityForTenantAsync(
            Factory.Services,
            TenantIds.Default,
            slug,
            maxRegistrants: null);

        using var adminClient = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(adminClient);
        IntegrationTestHelpers.UseBearerToken(adminClient, accessToken);

        var overLimitRequest = BuildUpdateRequest(activity, maxRegistrants: 5001);
        using var overLimitResponse = await adminClient.PutAsJsonAsync(
            $"/api/v1/admin/activities/{activity.Id}",
            overLimitRequest,
            IntegrationTestHelpers.JsonOptions);

        Assert.Equal(HttpStatusCode.BadRequest, overLimitResponse.StatusCode);

        var detail = await ReadProblemDetailAsync(overLimitResponse);
        Assert.Contains("plan limit", detail, StringComparison.OrdinalIgnoreCase);
        AssertPlanLimitAmountInDetail(detail, 5000);

        var atLimitRequest = BuildUpdateRequest(activity, maxRegistrants: 5000);
        using var atLimitResponse = await adminClient.PutAsJsonAsync(
            $"/api/v1/admin/activities/{activity.Id}",
            atLimitRequest,
            IntegrationTestHelpers.JsonOptions);

        Assert.Equal(HttpStatusCode.OK, atLimitResponse.StatusCode);

        var updated = await atLimitResponse.Content.ReadFromJsonAsync<ActivityResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(updated);
        Assert.Equal(5000, updated!.MaxRegistrants);
    }

    [SkippableFact]
    public async Task UpdateActivity_WhenOverPlanCapUnchanged_AllowsOtherFieldEdits()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

        var slug = $"plan-cap-legacy-{Guid.NewGuid():N}"[..24];
        var activity = await IntegrationTestHelpers.SeedPublishedActivityForTenantAsync(
            Factory.Services,
            TenantIds.Default,
            slug,
            maxRegistrants: 5001);

        using var adminClient = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(adminClient);
        IntegrationTestHelpers.UseBearerToken(adminClient, accessToken);

        var renameRequest = BuildUpdateRequest(activity, maxRegistrants: 5001) with
        {
            Name = $"{activity.Name} (renamed)",
        };

        using var response = await adminClient.PutAsJsonAsync(
            $"/api/v1/admin/activities/{activity.Id}",
            renameRequest,
            IntegrationTestHelpers.JsonOptions);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var updated = await response.Content.ReadFromJsonAsync<ActivityResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(updated);
        Assert.Equal(5001, updated!.MaxRegistrants);
        Assert.Contains("(renamed)", updated.Name, StringComparison.Ordinal);
    }

    [SkippableFact]
    public async Task CreateActivity_WhenMaxRegistrantsExceedsProPlanLimit_Returns409()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);
        await IntegrationTestHelpers.EnsureDefaultTenantProPlanAsync(Factory.Services);

        using var adminClient = Factory.CreateClient();
        var accessToken = await IntegrationTestHelpers.LoginAsOperatorAsync(adminClient);
        IntegrationTestHelpers.UseBearerToken(adminClient, accessToken);

        var request = new CreateActivityRequest(
            Name: $"Plan cap create {Guid.NewGuid():N}"[..32],
            Category: "Test",
            Schedule: "Saturday 10:00",
            Location: "Test Court",
            CommunityLabel: "Integration Community",
            Status: ActivityStatus.Draft.ToString().ToLowerInvariant(),
            MaxRegistrants: 5001);

        using var response = await adminClient.PostAsJsonAsync(
            "/api/v1/admin/activities",
            request,
            IntegrationTestHelpers.JsonOptions);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);

        var detail = await ReadProblemDetailAsync(response);
        Assert.Contains("plan limit", detail, StringComparison.OrdinalIgnoreCase);
    }

    private static UpdateActivityRequest BuildUpdateRequest(
        Activity activity,
        int? maxRegistrants) =>
        new(
            activity.Name,
            activity.Category,
            activity.Schedule,
            activity.Location,
            activity.CommunityLabel,
            activity.HeroImageUrl,
            activity.AccentColor,
            maxRegistrants);

    private static async Task<string> ReadProblemDetailAsync(HttpResponseMessage response)
    {
        var raw = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(raw);
        if (document.RootElement.TryGetProperty("detail", out var detail)
            && detail.ValueKind == JsonValueKind.String)
        {
            return detail.GetString() ?? raw;
        }

        if (document.RootElement.TryGetProperty("Detail", out var detailPascal)
            && detailPascal.ValueKind == JsonValueKind.String)
        {
            return detailPascal.GetString() ?? raw;
        }

        return raw;
    }

    private static void AssertPlanLimitAmountInDetail(string detail, int expectedLimit)
    {
        var digitsOnly = string.Concat(detail.Where(char.IsDigit));
        Assert.Contains(expectedLimit.ToString(), digitsOnly, StringComparison.Ordinal);
    }
}
