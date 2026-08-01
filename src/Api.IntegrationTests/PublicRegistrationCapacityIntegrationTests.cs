using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class PublicRegistrationCapacityIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task SubmitPublicRegistration_WhenActivityAtCapacity_Returns409ActivityFull()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"capacity-full-{Guid.NewGuid():N}";
        await IntegrationTestHelpers.SeedPublishedActivityForTenantAsync(
            Factory.Services,
            TenantIds.Default,
            slug,
            maxRegistrants: 1);

        using var client = Factory.CreateClient();
        var answers = CreateAnswers($"0917{Random.Shared.Next(1000000, 9999999)}");

        await IntegrationTestHelpers.SubmitRegistrationAsync(client, slug, answers);

        var fullResponse = await IntegrationTestHelpers.SubmitRegistrationRawAsync(
            client,
            slug,
            CreateAnswers($"0918{Random.Shared.Next(1000000, 9999999)}"));

        Assert.Equal(HttpStatusCode.Conflict, fullResponse.StatusCode);

        var problem = await fullResponse.Content.ReadFromJsonAsync<JsonElement>(
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal("activity_full", problem.GetProperty("errorCode").GetString());
    }

    [SkippableFact]
    public async Task SubmitPublicRegistration_WhenOneSpotRemains_OnlyOneConcurrentSubmitSucceeds()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"capacity-race-{Guid.NewGuid():N}";
        await IntegrationTestHelpers.SeedPublishedActivityForTenantAsync(
            Factory.Services,
            TenantIds.Default,
            slug,
            maxRegistrants: 2);

        using var client = Factory.CreateClient();
        await IntegrationTestHelpers.SubmitRegistrationAsync(
            client,
            slug,
            CreateAnswers($"0919{Random.Shared.Next(1000000, 9999999)}"));

        var firstAnswers = CreateAnswers($"0920{Random.Shared.Next(1000000, 9999999)}");
        var secondAnswers = CreateAnswers($"0921{Random.Shared.Next(1000000, 9999999)}");

        var firstTask = IntegrationTestHelpers.SubmitRegistrationRawAsync(client, slug, firstAnswers);
        var secondTask = IntegrationTestHelpers.SubmitRegistrationRawAsync(client, slug, secondAnswers);

        await Task.WhenAll(firstTask, secondTask);

        var responses = new[] { firstTask.Result, secondTask.Result };
        Assert.Equal(1, responses.Count(response => response.StatusCode == HttpStatusCode.Created));
        Assert.Equal(1, responses.Count(response => response.StatusCode == HttpStatusCode.Conflict));

        var conflict = responses.Single(response => response.StatusCode == HttpStatusCode.Conflict);
        var problem = await conflict.Content.ReadFromJsonAsync<JsonElement>(
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal("activity_full", problem.GetProperty("errorCode").GetString());

        await using var scope = Factory.Services.CreateAsyncScope();
        IntegrationTestHelpers.BindDefaultTenant(scope.ServiceProvider);
        var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var activity = dbContext.Activities.Single(item => item.Slug == slug);

        Assert.Equal(2, dbContext.Registrations.Count(registration => registration.ActivityId == activity.Id));
    }

    [SkippableFact]
    public async Task GetPublicActivity_WhenAtCapacity_IncludesIsRegistrationFull()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"capacity-public-{Guid.NewGuid():N}";
        await IntegrationTestHelpers.SeedPublishedActivityForTenantAsync(
            Factory.Services,
            TenantIds.Default,
            slug,
            maxRegistrants: 1);

        using var client = Factory.CreateClient();
        await IntegrationTestHelpers.SubmitRegistrationAsync(
            client,
            slug,
            CreateAnswers($"0922{Random.Shared.Next(1000000, 9999999)}"));

        var response = await client.GetAsync($"/api/v1/public/activities/{slug}");
        response.EnsureSuccessStatusCode();

        var activity = await response.Content.ReadFromJsonAsync<JsonElement>(
            IntegrationTestHelpers.JsonOptions);

        Assert.True(activity.GetProperty("isRegistrationOpen").GetBoolean());
        Assert.True(activity.GetProperty("isRegistrationFull").GetBoolean());
        Assert.Equal(1, activity.GetProperty("registrationCount").GetInt32());
        Assert.Equal(1, activity.GetProperty("maxRegistrants").GetInt32());
    }

    private static Dictionary<string, object?> CreateAnswers(string phone) =>
        new()
        {
            ["full_name"] = "Capacity Tester",
            ["phone"] = phone,
            ["consent"] = true,
        };
}
