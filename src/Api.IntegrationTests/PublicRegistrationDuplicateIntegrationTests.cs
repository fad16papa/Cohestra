using System.Net.Http.Json;
using LeadGenerationCrm.Api.IntegrationTests.Infrastructure;
using LeadGenerationCrm.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace LeadGenerationCrm.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class PublicRegistrationDuplicateIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task SubmitPublicRegistration_SecondSubmitForSameClientAndActivity_ReturnsConflict()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"duplicate-{Guid.NewGuid():N}";
        await IntegrationTestHelpers.SeedPublishedActivityAsync(Factory.Services, slug);
        var phone = $"0917{Random.Shared.Next(1000000, 9999999)}";

        using var client = Factory.CreateClient();
        var answers = new Dictionary<string, object?>
        {
            ["full_name"] = "Duplicate Tester",
            ["phone"] = phone,
            ["consent"] = true,
        };

        var first = await IntegrationTestHelpers.SubmitRegistrationAsync(client, slug, answers);
        var secondResponse = await client.PostAsJsonAsync(
            "/api/v1/public/registrations",
            new { activitySlug = slug, answers });

        Assert.Equal(System.Net.HttpStatusCode.Conflict, secondResponse.StatusCode);

        await using var scope = Factory.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<LeadGenerationCrmDbContext>();

        Assert.Equal(1, dbContext.Registrations.Count());
        Assert.Matches("^REG\\d{14}$", first.RegistrationNumber);
    }
}
