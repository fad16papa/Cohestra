using System.Net;
using System.Net.Http.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Platform;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Campaigns;
using Cohestra.Domain.Clients;
using Cohestra.Domain.Registrations;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Trait("Category", "TenantIsolation")]
[Collection(IntegrationTestCollection.Name)]
public sealed class ClientErasureIntegrationTests(IntegrationTestFixture fixture)
{
    private const string SecretName = "SECRET_ERASURE_NAME";
    private const string SecretPhone = "+6591110001";
    private const string SecretAnswer = "SECRET_ERASURE_ANSWER";
    private const string SecretNote = "SECRET_ERASURE_NOTE";
    private const string SecretEmail = "secret-erasure@example.com";

    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task PlatformAdmin_ErasesOneClient_AndLeavesOtherTenantData()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var platform = Factory.CreateClient();
        var platformToken = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platform);
        IntegrationTestHelpers.UseBearerToken(platform, platformToken);

        var tenantA = await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            platform, "Erasure A", NewSlug(), "a@erasure.example");
        var tenantB = await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            platform, "Erasure B", NewSlug(), "b@erasure.example");

        var activityA = await IntegrationTestHelpers.SeedPublishedActivityForTenantAsync(
            Factory.Services, tenantA.Id, "ers-a-" + Guid.NewGuid().ToString("N")[..8]);
        var activityB = await IntegrationTestHelpers.SeedPublishedActivityForTenantAsync(
            Factory.Services, tenantB.Id, "ers-b-" + Guid.NewGuid().ToString("N")[..8]);

        var (targetId, survivorId, foreignId) = await SeedAsync(tenantA.Id, tenantB.Id, activityA, activityB);

        using var missingReason = await platform.PostAsJsonAsync(
            $"/api/v1/platform/tenants/{tenantA.Id}/clients/{targetId}/erasure",
            new EraseClientRequest("short", "ERASE CLIENT"),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.BadRequest, missingReason.StatusCode);

        using var wrongConfirm = await platform.PostAsJsonAsync(
            $"/api/v1/platform/tenants/{tenantA.Id}/clients/{targetId}/erasure",
            new EraseClientRequest("participant requested erasure", "erase"),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.BadRequest, wrongConfirm.StatusCode);

        using var cross = await platform.PostAsJsonAsync(
            $"/api/v1/platform/tenants/{tenantA.Id}/clients/{foreignId}/erasure",
            new EraseClientRequest("participant requested erasure", "ERASE CLIENT"),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.NotFound, cross.StatusCode);

        using var erased = await platform.PostAsJsonAsync(
            $"/api/v1/platform/tenants/{tenantA.Id}/clients/{targetId}/erasure",
            new EraseClientRequest("participant requested erasure", "ERASE CLIENT"),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.OK, erased.StatusCode);
        var body = await erased.Content.ReadFromJsonAsync<EraseClientResponse>(IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(body);
        Assert.Equal(1, body!.RegistrationsRemoved);
        Assert.Equal(1, body.TimelineEventsRemoved);
        Assert.Equal(1, body.CampaignRecipientsRemoved);

        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        Assert.False(await db.IgnoreTenantFilters<Client>().AnyAsync(row => row.Id == targetId));
        Assert.False(await db.IgnoreTenantFilters<Registration>().AnyAsync(row => row.ClientId == targetId));
        Assert.False(await db.IgnoreTenantFilters<ClientTimelineEvent>().AnyAsync(row => row.ClientId == targetId));
        Assert.False(await db.IgnoreTenantFilters<CampaignRecipient>().AnyAsync(row => row.ClientId == targetId));
        Assert.True(await db.IgnoreTenantFilters<Client>().AnyAsync(row => row.Id == survivorId && row.TenantId == tenantA.Id));
        Assert.True(await db.IgnoreTenantFilters<Client>().AnyAsync(row => row.Id == foreignId && row.TenantId == tenantB.Id));
        Assert.True(await db.IgnoreTenantFilters<Registration>().AnyAsync(row => row.ClientId == foreignId));
        Assert.True(await db.IgnoreTenantFilters<Activity>().AnyAsync(row => row.Id == activityA.Id));

        var audit = await db.PlatformAuditLogs.AsNoTracking().SingleAsync(entry =>
            entry.TenantId == tenantA.Id && entry.Action == PlatformAuditAction.ClientErased);
        var stored = (audit.Reason ?? string.Empty) + (audit.DetailsJson ?? string.Empty);
        Assert.DoesNotContain(SecretName, stored, StringComparison.Ordinal);
        Assert.DoesNotContain(SecretPhone, stored, StringComparison.Ordinal);
        Assert.DoesNotContain(SecretAnswer, stored, StringComparison.Ordinal);
        Assert.DoesNotContain(SecretNote, stored, StringComparison.Ordinal);
        Assert.DoesNotContain(SecretEmail, stored, StringComparison.Ordinal);
    }

    [SkippableFact]
    public async Task TenantAdmin_CannotEraseClients()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var platform = Factory.CreateClient();
        var platformToken = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platform);
        IntegrationTestHelpers.UseBearerToken(platform, platformToken);
        var tenant = await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            platform, "Erasure Denied", NewSlug(), "denied@erasure.example");
        var (admin, _) = await IntegrationTestHelpers.CreateTenantAdminUserAsync(
            Factory.Services, tenant.Id, $"admin-{tenant.Slug}@erasure.example");

        using var client = Factory.CreateClient();
        IntegrationTestHelpers.UseTenantHost(client, tenant.Slug);
        IntegrationTestHelpers.UseBearerToken(
            client,
            IntegrationTestHelpers.MintTenantAccessToken(Factory.Services, admin, tenant.Id));
        using var response = await client.PostAsJsonAsync(
            $"/api/v1/platform/tenants/{tenant.Id}/clients/{Guid.NewGuid()}/erasure",
            new EraseClientRequest("participant requested erasure", "ERASE CLIENT"),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private async Task<(Guid Target, Guid Survivor, Guid Foreign)> SeedAsync(
        Guid tenantA,
        Guid tenantB,
        Activity activityA,
        Activity activityB)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var now = DateTimeOffset.UtcNow;
        var target = ClientRow(tenantA, SecretName, SecretPhone, SecretEmail, now);
        var survivor = ClientRow(tenantA, "Survivor", "+6591110002", "survivor@example.com", now);
        var foreign = ClientRow(tenantB, "Foreign", "+6591110003", "foreign@example.com", now);
        db.Clients.AddRange(target, survivor, foreign);

        db.Registrations.Add(new Registration
        {
            Id = Guid.NewGuid(),
            TenantId = tenantA,
            RegistrationNumber = "E" + Guid.NewGuid().ToString("N")[..8],
            ActivityId = activityA.Id,
            ClientId = target.Id,
            Answers = new Dictionary<string, object?> { ["note"] = SecretAnswer },
            CreatedAt = now,
        });
        db.Registrations.Add(new Registration
        {
            Id = Guid.NewGuid(),
            TenantId = tenantB,
            RegistrationNumber = "F" + Guid.NewGuid().ToString("N")[..8],
            ActivityId = activityB.Id,
            ClientId = foreign.Id,
            Answers = new Dictionary<string, object?> { ["note"] = "keep" },
            CreatedAt = now,
        });
        db.ClientTimelineEvents.Add(new ClientTimelineEvent
        {
            Id = Guid.NewGuid(),
            TenantId = tenantA,
            ClientId = target.Id,
            EventType = ClientTimelineEventType.NextFollowUpChanged,
            OccurredAt = now,
            Note = SecretNote,
        });

        var campaign = new Campaign
        {
            Id = Guid.NewGuid(),
            TenantId = tenantA,
            Subject = "Erasure rehearsal",
            Body = "Body",
            Status = CampaignStatus.Completed,
            CreatedAt = now,
            SentAt = now,
            SentCount = 1,
        };
        campaign.Recipients.Add(new CampaignRecipient
        {
            Id = Guid.NewGuid(),
            TenantId = tenantA,
            CampaignId = campaign.Id,
            ClientId = target.Id,
            Email = SecretEmail,
            Status = CampaignRecipientStatus.Sent,
        });
        db.Campaigns.Add(campaign);
        await db.SaveChangesAsync();
        return (target.Id, survivor.Id, foreign.Id);
    }

    private static Client ClientRow(Guid tenantId, string name, string phone, string email, DateTimeOffset now) =>
        new()
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            FullName = name,
            Phone = phone,
            NormalizedPhone = phone,
            Email = email,
            NormalizedEmail = email,
            ConsentGiven = true,
            Notes = name,
            CreatedAt = now,
            UpdatedAt = now,
        };

    private static string NewSlug() => "e" + Guid.NewGuid().ToString("N")[..12];
}
