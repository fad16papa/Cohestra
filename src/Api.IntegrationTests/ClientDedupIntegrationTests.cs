using LeadGenerationCrm.Api.IntegrationTests.Infrastructure;
using LeadGenerationCrm.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LeadGenerationCrm.Api.IntegrationTests;

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
        var phoneSuffix = Guid.NewGuid().ToString("N")[..7];
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

        var second = await IntegrationTestHelpers.SubmitRegistrationAsync(
            client,
            slug,
            new Dictionary<string, object?>
            {
                ["full_name"] = "Elena Santos",
                ["phone"] = phoneWithoutLeadingZero,
                ["email"] = $"elena-{phoneSuffix}@example.com",
                ["consent"] = true,
            });

        Assert.Equal(first.ClientId, second.ClientId);
        Assert.NotEqual(first.RegistrationId, second.RegistrationId);

        await using var scope = Factory.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<LeadGenerationCrmDbContext>();

        var matchingClient = await dbContext.Clients
            .SingleAsync(item => item.Id == first.ClientId);
        var matchingClients = await dbContext.Clients
            .Where(item => item.NormalizedPhone == matchingClient.NormalizedPhone)
            .ToListAsync();
        Assert.Single(matchingClients);
        Assert.Equal(2, await dbContext.Registrations.CountAsync(registration => registration.ActivityId == activity.Id));
    }
}
