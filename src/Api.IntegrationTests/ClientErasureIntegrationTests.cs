using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Application.Email;
using Cohestra.Application.Outbox;
using Cohestra.Contracts.Platform;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Campaigns;
using Cohestra.Domain.Clients;
using Cohestra.Domain.Outbox;
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

    [SkippableFact]
    public async Task EraseClient_RemovesInquiryPii_AndDoesNotDispatchPendingNotifications()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var platform = Factory.CreateClient();
        var platformToken = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platform);
        IntegrationTestHelpers.UseBearerToken(platform, platformToken);
        var tenantA = await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            platform, "Erasure Outbox A", NewSlug(), "a-outbox@erasure.example");
        var tenantB = await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            platform, "Erasure Outbox B", NewSlug(), "b-outbox@erasure.example");

        var seeded = await SeedInquiryOutboxAsync(tenantA.Id, tenantB.Id);
        var sender = (FakeEmailSender)Factory.Services.GetRequiredService<IEmailSender>();
        var sentBefore = sender.SentCount;

        using var erased = await PostErasureAsync(platform, tenantA.Id, seeded.TargetId);
        Assert.Equal(HttpStatusCode.OK, erased.StatusCode);

        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            Assert.False(await db.OutboxMessages.AnyAsync(row => row.Id == seeded.PendingId));

            var processing = await db.OutboxMessages.SingleAsync(row => row.Id == seeded.ProcessingId);
            var completed = await db.OutboxMessages.SingleAsync(row => row.Id == seeded.CompletedId);
            var failed = await db.OutboxMessages.SingleAsync(row => row.Id == seeded.FailedId);
            AssertRedacted(processing, seeded.TargetId);
            Assert.Equal(OutboxMessageStatus.Completed, processing.Status);
            AssertRedacted(completed, seeded.TargetId);
            Assert.Equal(OutboxMessageStatus.Completed, completed.Status);
            AssertRedacted(failed, seeded.TargetId);
            Assert.Equal(OutboxMessageStatus.Failed, failed.Status);
            Assert.Equal("provider unavailable", failed.LastError);
            Assert.DoesNotContain(SecretName, failed.LastError, StringComparison.Ordinal);

            var survivor = await db.OutboxMessages.SingleAsync(row => row.Id == seeded.SurvivorId);
            Assert.Contains("SURVIVOR_KEEP_NAME", survivor.PayloadJson, StringComparison.Ordinal);
            Assert.Contains(seeded.TargetId.ToString(), survivor.PayloadJson, StringComparison.Ordinal);
            Assert.Equal(OutboxMessageStatus.Pending, survivor.Status);

            var foreign = await db.OutboxMessages.SingleAsync(row => row.Id == seeded.ForeignId);
            Assert.Equal(seeded.ForeignPayload, foreign.PayloadJson);
            Assert.Equal(tenantB.Id, foreign.TenantId);

            var registration = await db.OutboxMessages.SingleAsync(row => row.Id == seeded.RegistrationId);
            Assert.Equal(seeded.RegistrationPayload, registration.PayloadJson);

            var broken = await db.OutboxMessages.SingleAsync(row => row.Id == seeded.BrokenId);
            Assert.Equal(seeded.BrokenPayload, broken.PayloadJson);

            var audits = await db.PlatformAuditLogs.AsNoTracking()
                .Where(entry => entry.TenantId == tenantA.Id && entry.Action == PlatformAuditAction.ClientErased)
                .ToListAsync();
            var audit = Assert.Single(
                audits,
                entry => entry.DetailsJson!.Contains(seeded.TargetId.ToString(), StringComparison.Ordinal));
            var stored = (audit.Reason ?? string.Empty) + (audit.DetailsJson ?? string.Empty);
            Assert.DoesNotContain(SecretName, stored, StringComparison.Ordinal);
            Assert.DoesNotContain(SecretPhone, stored, StringComparison.Ordinal);
            Assert.DoesNotContain(SecretEmail, stored, StringComparison.Ordinal);
            Assert.DoesNotContain(SecretNote, stored, StringComparison.Ordinal);
        }

        await IntegrationTestHelpers.ProcessOutboxUntilIdleAsync(Factory.Services);
        Assert.DoesNotContain(
            sender.Sent.Skip(sentBefore),
            message => message.PlainTextBody.Contains(SecretName, StringComparison.Ordinal)
                || message.PlainTextBody.Contains(SecretPhone, StringComparison.Ordinal)
                || message.PlainTextBody.Contains(SecretEmail, StringComparison.Ordinal)
                || message.PlainTextBody.Contains(SecretNote, StringComparison.Ordinal));
    }

    [SkippableFact]
    public async Task EraseClient_WaitsUntilInFlightInquirySendFinishes_ThenRedactsPayload()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var platform = Factory.CreateClient();
        var platformToken = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platform);
        IntegrationTestHelpers.UseBearerToken(platform, platformToken);
        var tenant = await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            platform, "Erasure Inflight", NewSlug(), "inflight@erasure.example");
        var targetId = await SeedSendableInquiryAsync(tenant.Id);

        var sender = (FakeEmailSender)Factory.Services.GetRequiredService<IEmailSender>();
        var started = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        sender.BeforeSendAsync = async (message, cancellationToken) =>
        {
            if (!message.PlainTextBody.Contains(SecretName, StringComparison.Ordinal))
            {
                return;
            }

            started.TrySetResult();
            await release.Task.WaitAsync(cancellationToken);
        };

        try
        {
            var processing = Task.Run(async () =>
            {
                var deadline = DateTime.UtcNow.AddSeconds(20);
                while (DateTime.UtcNow < deadline && !started.Task.IsCompleted)
                {
                    await using var scope = Factory.Services.CreateAsyncScope();
                    var processor = scope.ServiceProvider.GetRequiredService<IOutboxProcessor>();
                    await processor.ProcessBatchAsync();
                }
            });

            var startedInTime = await Task.WhenAny(started.Task, Task.Delay(TimeSpan.FromSeconds(20)));
            Assert.Same(started.Task, startedInTime);

            var erase = PostErasureAsync(platform, tenant.Id, targetId);
            var finishedEarly = await Task.WhenAny(erase, Task.Delay(TimeSpan.FromMilliseconds(750)));
            Assert.NotSame(erase, finishedEarly);

            release.TrySetResult();
            using var erased = await erase.WaitAsync(TimeSpan.FromSeconds(20));
            Assert.Equal(HttpStatusCode.OK, erased.StatusCode);
            await processing.WaitAsync(TimeSpan.FromSeconds(20));

            await using var scope = Factory.Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            var remaining = await db.OutboxMessages
                .Where(row => row.TenantId == tenant.Id && row.MessageType == OutboxMessageTypes.WebsiteInquiryOperatorNotify)
                .ToListAsync();
            Assert.NotEmpty(remaining);
            Assert.All(remaining, row => AssertRedacted(row, targetId));
            Assert.DoesNotContain(remaining, row => row.LastError != null && row.LastError.Contains(SecretName, StringComparison.Ordinal));
        }
        finally
        {
            sender.BeforeSendAsync = null;
            release.TrySetResult();
        }
    }

    private static void AssertRedacted(OutboxMessage message, Guid clientId)
    {
        Assert.DoesNotContain(SecretName, message.PayloadJson, StringComparison.Ordinal);
        Assert.DoesNotContain(SecretPhone, message.PayloadJson, StringComparison.Ordinal);
        Assert.DoesNotContain(SecretEmail, message.PayloadJson, StringComparison.Ordinal);
        Assert.DoesNotContain(SecretNote, message.PayloadJson, StringComparison.Ordinal);
        using var document = JsonDocument.Parse(message.PayloadJson);
        Assert.True(document.RootElement.TryGetProperty("ClientId", out var id));
        Assert.Equal(clientId, id.GetGuid());
        Assert.True(document.RootElement.TryGetProperty("Redacted", out var redacted) && redacted.GetBoolean());
        Assert.False(document.RootElement.TryGetProperty("ParticipantName", out var name) && name.GetString() == SecretName);
    }

    private async Task<InquiryOutboxSeed> SeedInquiryOutboxAsync(Guid tenantA, Guid tenantB)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var now = DateTimeOffset.UtcNow;
        var target = ClientRow(tenantA, SecretName, SecretPhone, SecretEmail, now);
        var survivor = ClientRow(tenantA, "SURVIVOR_KEEP_NAME", "+6591110002", "survivor-keep@example.com", now);
        var foreign = ClientRow(tenantB, "FOREIGN_KEEP_NAME", "+6591110003", "foreign-keep@example.com", now);
        db.Clients.AddRange(target, survivor, foreign);

        var targetTimeline = Guid.NewGuid();
        var survivorTimeline = Guid.NewGuid();
        var foreignTimeline = Guid.NewGuid();
        db.ClientTimelineEvents.AddRange(
            Timeline(tenantA, target.Id, targetTimeline, now),
            Timeline(tenantA, survivor.Id, survivorTimeline, now),
            Timeline(tenantB, foreign.Id, foreignTimeline, now));

        var pending = Inquiry(tenantA, target.Id, targetTimeline, OutboxMessageStatus.Pending, now);
        var processing = Inquiry(tenantA, target.Id, targetTimeline, OutboxMessageStatus.Processing, now);
        processing.ClaimedAt = now;
        processing.AttemptCount = 1;
        var completed = Inquiry(tenantA, target.Id, targetTimeline, OutboxMessageStatus.Completed, now);
        completed.ProcessedAt = now;
        var failed = Inquiry(tenantA, target.Id, targetTimeline, OutboxMessageStatus.Failed, now);
        failed.ProcessedAt = now;
        failed.AttemptCount = 3;
        failed.LastError = "provider unavailable";
        var survivorMessage = new OutboxMessage
        {
            Id = Guid.NewGuid(),
            TenantId = tenantA,
            MessageType = OutboxMessageTypes.WebsiteInquiryOperatorNotify,
            PayloadJson = JsonSerializer.Serialize(new
            {
                ClientId = survivor.Id,
                TimelineEventId = survivorTimeline,
                ParticipantName = "SURVIVOR_KEEP_NAME",
                Phone = "+6591110002",
                Email = "survivor-keep@example.com",
                Message = "keep survivor " + target.Id,
            }),
            DedupeKey = "inquiry-erasure:" + Guid.NewGuid().ToString("N"),
            Status = OutboxMessageStatus.Pending,
            CreatedAt = now,
            NextAttemptAt = now,
        };
        var foreignPayload = JsonSerializer.Serialize(new
        {
            ClientId = foreign.Id,
            TimelineEventId = foreignTimeline,
            ParticipantName = "FOREIGN_KEEP_NAME",
            Phone = "+6591110003",
            Email = "foreign-keep@example.com",
            Message = "keep foreign " + target.Id,
        });
        var foreignMessage = Inquiry(tenantB, foreign.Id, foreignTimeline, OutboxMessageStatus.Pending, now, "FOREIGN_KEEP_NAME");
        foreignMessage.PayloadJson = foreignPayload;
        var registrationPayload = JsonSerializer.Serialize(new
        {
            RegistrationId = Guid.NewGuid(),
            Note = SecretName,
        });
        var registration = new OutboxMessage
        {
            Id = Guid.NewGuid(),
            TenantId = tenantA,
            MessageType = OutboxMessageTypes.RegistrationConfirmation,
            PayloadJson = registrationPayload,
            Status = OutboxMessageStatus.Completed,
            CreatedAt = now,
            NextAttemptAt = now,
            ProcessedAt = now,
        };
        var brokenPayload = "BROKEN_KEEP " + SecretName;
        var broken = new OutboxMessage
        {
            Id = Guid.NewGuid(),
            TenantId = tenantA,
            MessageType = OutboxMessageTypes.WebsiteInquiryOperatorNotify,
            PayloadJson = brokenPayload,
            Status = OutboxMessageStatus.Completed,
            CreatedAt = now,
            NextAttemptAt = now,
            ProcessedAt = now,
        };

        db.OutboxMessages.AddRange(pending, processing, completed, failed, survivorMessage, foreignMessage, registration, broken);
        await db.SaveChangesAsync();
        return new InquiryOutboxSeed(
            target.Id,
            pending.Id,
            processing.Id,
            completed.Id,
            failed.Id,
            survivorMessage.Id,
            foreignMessage.Id,
            foreignPayload,
            registration.Id,
            registrationPayload,
            broken.Id,
            brokenPayload);
    }

    private async Task<Guid> SeedSendableInquiryAsync(Guid tenantId)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var now = DateTimeOffset.UtcNow;
        var target = ClientRow(tenantId, SecretName, SecretPhone, SecretEmail, now);
        var timelineId = Guid.NewGuid();
        db.Clients.Add(target);
        db.ClientTimelineEvents.Add(Timeline(tenantId, target.Id, timelineId, now));
        db.OutboxMessages.Add(Inquiry(tenantId, target.Id, timelineId, OutboxMessageStatus.Pending, now));
        await db.SaveChangesAsync();
        return target.Id;
    }

    private static async Task<HttpResponseMessage> PostErasureAsync(HttpClient platform, Guid tenantId, Guid clientId) =>
        await platform.PostAsJsonAsync(
            $"/api/v1/platform/tenants/{tenantId}/clients/{clientId}/erasure",
            new EraseClientRequest("participant requested erasure", "ERASE CLIENT"),
            IntegrationTestHelpers.JsonOptions);

    private static ClientTimelineEvent Timeline(Guid tenantId, Guid clientId, Guid timelineId, DateTimeOffset now) =>
        new()
        {
            Id = timelineId,
            TenantId = tenantId,
            ClientId = clientId,
            EventType = ClientTimelineEventType.WebsiteInquiry,
            OccurredAt = now,
            Subject = "Website inquiry",
            Note = SecretNote,
        };

    private static OutboxMessage Inquiry(
        Guid tenantId,
        Guid clientId,
        Guid timelineId,
        OutboxMessageStatus status,
        DateTimeOffset now,
        string participantName = SecretName) =>
        new()
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            MessageType = OutboxMessageTypes.WebsiteInquiryOperatorNotify,
            PayloadJson = JsonSerializer.Serialize(new
            {
                ClientId = clientId,
                TimelineEventId = timelineId,
                ParticipantName = participantName,
                Phone = SecretPhone,
                Email = SecretEmail,
                Message = SecretNote,
            }),
            DedupeKey = "inquiry-erasure:" + Guid.NewGuid().ToString("N"),
            Status = status,
            CreatedAt = now,
            NextAttemptAt = now,
        };

    private sealed record InquiryOutboxSeed(
        Guid TargetId,
        Guid PendingId,
        Guid ProcessingId,
        Guid CompletedId,
        Guid FailedId,
        Guid SurvivorId,
        Guid ForeignId,
        string ForeignPayload,
        Guid RegistrationId,
        string RegistrationPayload,
        Guid BrokenId,
        string BrokenPayload);

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
