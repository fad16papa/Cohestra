using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Registrations;
using Cohestra.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class PublicRegistrationIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task SubmitPublicRegistration_CreatesRegistrationAndClient()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"registration-{Guid.NewGuid():N}";
        await IntegrationTestHelpers.SeedPublishedActivityAsync(Factory.Services, slug);
        var email = $"elena-{Guid.NewGuid():N}@example.com";

        using var client = Factory.CreateClient();
        var response = await IntegrationTestHelpers.SubmitRegistrationAsync(
            client,
            slug,
            new Dictionary<string, object?>
            {
                ["full_name"] = "Elena Santos",
                ["phone"] = "09181234567",
                ["email"] = email,
                ["consent"] = true,
            });

        Assert.Equal("created", response.Status);
        Assert.NotEqual(Guid.Empty, response.RegistrationId);
        Assert.Matches("^REG\\d{14}$", response.RegistrationNumber);
        Assert.NotEqual(Guid.Empty, response.ClientId);

        await using var scope = Factory.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();

        Assert.Equal(1, dbContext.Registrations.Count(registration => registration.Id == response.RegistrationId));
        Assert.Equal(1, dbContext.Clients.Count(item => item.Id == response.ClientId));
    }
}
