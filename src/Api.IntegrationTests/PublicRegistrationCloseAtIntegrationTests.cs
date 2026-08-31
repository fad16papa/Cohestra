using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class PublicRegistrationCloseAtIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task GetPublicActivity_WhenPastCloseAt_IncludesIsRegistrationClosedAt()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"close-at-public-{Guid.NewGuid():N}";
        var activity = await IntegrationTestHelpers.SeedPublishedActivityAsync(Factory.Services, slug);
        await SetRegistrationClosesAtAsync(activity.Id, DateTimeOffset.UtcNow.AddHours(-1));

        using var client = Factory.CreateClient();
        var response = await client.GetAsync($"/api/v1/public/activities/{slug}");
        response.EnsureSuccessStatusCode();

        var payload = await response.Content.ReadFromJsonAsync<JsonElement>(
            IntegrationTestHelpers.JsonOptions);

        Assert.True(payload.GetProperty("isRegistrationOpen").GetBoolean());
        Assert.True(payload.GetProperty("isRegistrationClosedAt").GetBoolean());
    }

    [SkippableFact]
    public async Task SubmitPublicRegistration_WhenPastCloseAt_Returns409RegistrationClosedAt()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"close-at-submit-{Guid.NewGuid():N}";
        var activity = await IntegrationTestHelpers.SeedPublishedActivityAsync(Factory.Services, slug);
        await SetRegistrationClosesAtAsync(activity.Id, DateTimeOffset.UtcNow.AddHours(-1));

        using var client = Factory.CreateClient();
        var submitResponse = await IntegrationTestHelpers.SubmitRegistrationRawAsync(
            client,
            slug,
            CreateAnswers($"0933{Random.Shared.Next(1000000, 9999999)}"));

        Assert.Equal(HttpStatusCode.Conflict, submitResponse.StatusCode);

        var errorCode = await IntegrationTestHelpers.ReadProblemErrorCodeAsync(submitResponse);
        Assert.Equal("registration_closed_at", errorCode);
    }

    private async Task SetRegistrationClosesAtAsync(Guid activityId, DateTimeOffset closesAt)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        IntegrationTestHelpers.BindDefaultTenant(scope.ServiceProvider);
        var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var activity = dbContext.Activities.Single(item => item.Id == activityId);
        activity.FormSchema!.Meta ??= new FormSchemaMeta();
        activity.FormSchema.Meta.RegistrationClosesAt = closesAt.ToUniversalTime();
        await dbContext.SaveChangesAsync();
    }

    private static Dictionary<string, object?> CreateAnswers(string phone) =>
        new()
        {
            ["full_name"] = "Close At Test",
            ["phone"] = phone,
            ["consent"] = true,
        };
}
