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

    [SkippableFact]
    public async Task RegistrationSubmit_EnqueuesOperatorNotifyOutboxMessage()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = $"outbox-op-{Guid.NewGuid():N}"[..20];
        await IntegrationTestHelpers.SeedPublishedActivityAsync(Factory.Services, slug);

        using var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Host = $"{TenantIds.DefaultSlug}.localhost";

        var response = await IntegrationTestHelpers.SubmitRegistrationAsync(
            client,
            slug,
            new Dictionary<string, object?>
            {
                ["full_name"] = "Operator Notify User",
                ["phone"] = "09181234568",
                ["email"] = $"operator-notify-{Guid.NewGuid():N}@example.com",
                ["consent"] = true,
            });

        await using var scope = Factory.Services.CreateAsyncScope();
        IntegrationTestHelpers.BindDefaultTenant(scope.ServiceProvider);
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();

        var outbox = await db.OutboxMessages
            .AsNoTracking()
            .SingleOrDefaultAsync(
                message =>
                    message.MessageType == OutboxMessageTypes.RegistrationOperatorNotify
                    && message.DedupeKey == $"registration:{response.RegistrationId}:operator_notify");

        Assert.NotNull(outbox);
        Assert.Equal(OutboxMessageStatus.Pending, outbox!.Status);
    }

    [SkippableFact]
    public async Task RegistrationSubmit_WhenOperatorNotifyDisabled_DoesNotEnqueueOperatorNotify()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        await using (var setupScope = Factory.Services.CreateAsyncScope())
        {
            IntegrationTestHelpers.BindDefaultTenant(setupScope.ServiceProvider);
            var db = setupScope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            var tenant = await db.Tenants.FirstAsync(t => t.Id == TenantIds.Default);
            tenant.EmailOnNewRegistration = false;
            await db.SaveChangesAsync();
        }

        try
        {
            var slug = $"outbox-off-{Guid.NewGuid():N}"[..20];
            await IntegrationTestHelpers.SeedPublishedActivityAsync(Factory.Services, slug);

            using var client = Factory.CreateClient();
            client.DefaultRequestHeaders.Host = $"{TenantIds.DefaultSlug}.localhost";

            var response = await IntegrationTestHelpers.SubmitRegistrationAsync(
                client,
                slug,
                new Dictionary<string, object?>
                {
                    ["full_name"] = "Notify Off User",
                    ["phone"] = "09181234569",
                    ["email"] = $"notify-off-{Guid.NewGuid():N}@example.com",
                    ["consent"] = true,
                });

            Assert.True(response.RegistrationId != Guid.Empty);

            await using var scope = Factory.Services.CreateAsyncScope();
            IntegrationTestHelpers.BindDefaultTenant(scope.ServiceProvider);
            var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();

            var operatorOutbox = await db.OutboxMessages
                .AsNoTracking()
                .AnyAsync(
                    message =>
                        message.MessageType == OutboxMessageTypes.RegistrationOperatorNotify
                        && message.DedupeKey == $"registration:{response.RegistrationId}:operator_notify");

            Assert.False(operatorOutbox);
        }
        finally
        {
            await using var restoreScope = Factory.Services.CreateAsyncScope();
            IntegrationTestHelpers.BindDefaultTenant(restoreScope.ServiceProvider);
            var db = restoreScope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            var tenant = await db.Tenants.FirstAsync(t => t.Id == TenantIds.Default);
            tenant.EmailOnNewRegistration = true;
            await db.SaveChangesAsync();
        }
    }
}
