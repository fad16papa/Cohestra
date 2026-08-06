using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Domain.Outbox;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Collection(IntegrationTestCollection.Name)]
public sealed class OutboxIntegrationTests(IntegrationTestFixture fixture)
{
    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task RegistrationSubmit_EnqueuesConfirmationOutboxMessage()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"outbox-reg-{Guid.NewGuid():N}"[..20];
        await IntegrationTestHelpers.SeedPublishedActivityAsync(Factory.Services, slug);

        using var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Host = $"{TenantIds.DefaultSlug}.localhost";

        var response = await IntegrationTestHelpers.SubmitRegistrationAsync(
            client,
            slug,
            new Dictionary<string, object?>
            {
                ["full_name"] = "Outbox Test User",
                ["phone"] = "09181234567",
                ["email"] = $"outbox-{Guid.NewGuid():N}@example.com",
                ["consent"] = true,
            });

        Assert.True(response.ConfirmationEmailQueued);

        await using var scope = Factory.Services.CreateAsyncScope();
        IntegrationTestHelpers.BindDefaultTenant(scope.ServiceProvider);
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();

        var outbox = await db.OutboxMessages
            .AsNoTracking()
            .SingleOrDefaultAsync(
                message =>
                    message.MessageType == OutboxMessageTypes.RegistrationConfirmation
                    && message.DedupeKey == $"registration:{response.RegistrationId}:confirmation");

        Assert.NotNull(outbox);
        Assert.Equal(OutboxMessageStatus.Pending, outbox!.Status);
    }
}
