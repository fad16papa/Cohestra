using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Registrations;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class ClientDedupIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task SubmitPublicRegistration_PhoneMatch_ReusesExistingClient()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"dedup-{Guid.NewGuid():N}";
        var activity = await IntegrationTestHelpers.SeedPublishedActivityAsync(Factory.Services, slug);
        var phoneSuffix = Random.Shared.Next(1000000, 9999999).ToString();
        var phoneWithLeadingZero = $"0917{phoneSuffix}";
        var phoneWithoutLeadingZero = $"917{phoneSuffix}";

        using var client = Factory.CreateClient();

        var first = await IntegrationTestHelpers.SubmitRegistrationAsync(
            client,
            slug,
            new Dictionary<string, object?>
            {
                ["full_name"] = "Elena Santos",
                ["phone"] = phoneWithLeadingZero,
                ["email"] = $"elena-{phoneSuffix}@example.com",
                ["consent"] = true,
            });

        var secondResponse = await client.PostAsJsonAsync(
            "/api/v1/public/registrations",
            new SubmitPublicRegistrationRequest(
                slug,
                new Dictionary<string, object?>
                {
                    ["full_name"] = "Elena Santos",
                    ["phone"] = phoneWithoutLeadingZero,
                    ["email"] = $"elena-{phoneSuffix}@example.com",
                    ["consent"] = true,
                }),
            IntegrationTestHelpers.JsonOptions);

        Assert.Equal(HttpStatusCode.Conflict, secondResponse.StatusCode);

        using var conflictDocument = JsonDocument.Parse(await secondResponse.Content.ReadAsStringAsync());
        var conflictRoot = conflictDocument.RootElement;
        var conflictClientId = conflictRoot.TryGetProperty("clientId", out var clientIdElement)
            ? clientIdElement.GetGuid()
            : conflictRoot.GetProperty("extensions").GetProperty("clientId").GetGuid();
        var conflictRegistrationId = conflictRoot.TryGetProperty("registrationId", out var registrationIdElement)
            ? registrationIdElement.GetGuid()
            : conflictRoot.GetProperty("extensions").GetProperty("registrationId").GetGuid();

        Assert.Equal(first.ClientId, conflictClientId);
        Assert.Equal(first.RegistrationId, conflictRegistrationId);

        await using var scope = Factory.Services.CreateAsyncScope();
        IntegrationTestHelpers.BindDefaultTenant(scope.ServiceProvider);
        var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();

        var matchingClient = await dbContext.Clients
            .SingleAsync(item => item.Id == first.ClientId);
        var matchingClients = await dbContext.Clients
            .Where(item => item.NormalizedPhone == matchingClient.NormalizedPhone)
            .ToListAsync();
        Assert.Single(matchingClients);
        Assert.Equal(1, await dbContext.Registrations.CountAsync(registration => registration.ActivityId == activity.Id));
    }
}
