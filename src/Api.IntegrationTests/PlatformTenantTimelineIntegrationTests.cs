using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Contracts.Platform;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Outbox;
using Cohestra.Domain.Support;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Collection(IntegrationTestCollection.Name)]
[Trait("Category", "Integration")]
public sealed class PlatformTenantTimelineIntegrationTests(IntegrationTestFixture fixture)
{
    private const string AuditSecret = "AUDIT_DETAILS_SECRET_44_6";
    private const string OutboxSecret = "OUTBOX_PAYLOAD_SECRET_44_6";
    private const string SupportSecret = "SUPPORT_BODY_SECRET_44_6";
    private const string PaddleSecret = "PADDLE_SECRET_44_6";

    private static readonly string[] ForbiddenTokens =
    [
        AuditSecret,
        OutboxSecret,
        SupportSecret,
        PaddleSecret,
        "detailsJson",
        "payloadJson",
        "dedupeKey",
        "\"lastError\":",
        "webhookSecret",
        "apiKey",
        "clientToken",
        "paddle-signature",
    ];

    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task PlatformAdmin_receives_allow_listed_timeline_without_secrets()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var (tenantA, tenantB) = await CreatePairAsync();
        var seeded = await SeedBothAsync(tenantA.Id, tenantB.Id);

        using var client = Factory.CreateClient();
        IntegrationTestHelpers.UseBearerToken(client, await IntegrationTestHelpers.LoginAsPlatformAdminAsync(client));

        using var response = await client.GetAsync($"/api/v1/platform/tenants/{tenantA.Id}/timeline");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        foreach (var token in ForbiddenTokens)
        {
            Assert.DoesNotContain(token, body, StringComparison.OrdinalIgnoreCase);
        }

        var timeline = JsonSerializer.Deserialize<PlatformTenantTimelineResponse>(
            body,
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(timeline);
        Assert.Equal(tenantA.Id, timeline.TenantId);
        Assert.True(timeline.HasHistoricalEvents);
        Assert.Contains(timeline.Items, item => item.Type == PlatformTenantTimelineTypes.Audit);
        Assert.Contains(timeline.Items, item => item.Type == PlatformTenantTimelineTypes.Support);
        Assert.Contains(timeline.Items, item => item.Type == PlatformTenantTimelineTypes.Outbox);
        Assert.Contains(timeline.Items, item => item.Type == PlatformTenantTimelineTypes.Paddle);
        Assert.Contains(timeline.Items, item => item.Type == PlatformTenantTimelineTypes.BillingSnapshot);
        Assert.All(timeline.Items, item => Assert.Equal(TimeSpan.Zero, item.Timestamp.Offset));
        Assert.True(timeline.Items.Zip(timeline.Items.Skip(1)).All(pair =>
            pair.First.Timestamp > pair.Second.Timestamp
            || (pair.First.Timestamp == pair.Second.Timestamp
                && string.CompareOrdinal(pair.First.Type, pair.Second.Type) <= 0)));
        Assert.DoesNotContain(timeline.Items, item => item.Summary.Contains(seeded.IssueB, StringComparison.Ordinal));
        Assert.Contains(timeline.Items, item => item.Summary.Contains(seeded.IssueA, StringComparison.Ordinal));
        Assert.Equal(
            tenantA.Plan,
            timeline.Items.Single(item => item.Type == PlatformTenantTimelineTypes.BillingSnapshot).Metadata["plan"]);
        Assert.True(timeline.Items.Count <= 50);
    }

    [SkippableFact]
    public async Task Unknown_tenant_is_404_not_empty_200()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var client = Factory.CreateClient();
        IntegrationTestHelpers.UseBearerToken(client, await IntegrationTestHelpers.LoginAsPlatformAdminAsync(client));
        using var response = await client.GetAsync($"/api/v1/platform/tenants/{Guid.CreateVersion7()}/timeline");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [SkippableFact]
    public async Task TenantAdmin_and_member_are_403_anonymous_is_401()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var path = $"/api/v1/platform/tenants/{TenantIds.Default}/timeline";

        using var anonymous = Factory.CreateClient();
        using var anonymousResponse = await anonymous.GetAsync(path);
        Assert.Equal(HttpStatusCode.Unauthorized, anonymousResponse.StatusCode);

        using var tenantAdmin = Factory.CreateClient();
        IntegrationTestHelpers.UseBearerToken(
            tenantAdmin,
            await IntegrationTestHelpers.LoginAsOperatorAsync(tenantAdmin));
        using var adminResponse = await tenantAdmin.GetAsync(path);
        Assert.Equal(HttpStatusCode.Forbidden, adminResponse.StatusCode);

        var email = $"member-tl-{Guid.NewGuid():N}@example.com";
        var (user, _) = await IntegrationTestHelpers.CreateTenantMemberUserAsync(
            Factory.Services,
            TenantIds.Default,
            email);
        var token = IntegrationTestHelpers.MintTenantAccessToken(
            Factory.Services,
            user,
            TenantIds.Default,
            TenantMembershipRole.TenantMember);
        using var member = Factory.CreateClient();
        IntegrationTestHelpers.UseTenantHost(member, TenantIds.DefaultSlug);
        IntegrationTestHelpers.UseBearerToken(member, token);
        member.DefaultRequestHeaders.Host = "localhost";
        using var memberResponse = await member.GetAsync(path);
        Assert.Equal(HttpStatusCode.Forbidden, memberResponse.StatusCode);
    }

    [SkippableFact]
    public async Task Null_paddle_tenant_is_not_correlated_and_empty_paddle_is_missing_instrumentation()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var platform = Factory.CreateClient();
        IntegrationTestHelpers.UseBearerToken(platform, await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platform));
        var tenant = await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            platform,
            "Timeline Empty Paddle",
            $"tl-empty-{Guid.NewGuid():N}"[..12],
            "admin@tl-empty.test");

        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            db.PaddleWebhookDeliveries.Add(new PaddleWebhookDelivery
            {
                Id = Guid.CreateVersion7(),
                EventId = "evt-uncorrelated",
                EventType = "transaction.completed",
                Disposition = PaddleWebhookDeliveryDisposition.Rejected,
                TenantId = null,
                HttpStatus = 400,
                DetailSanitized = "Rejected.",
                ObservedAt = DateTimeOffset.UtcNow,
            });
            await db.SaveChangesAsync();
        }

        using var response = await platform.GetAsync($"/api/v1/platform/tenants/{tenant.Id}/timeline");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("evt-uncorrelated", body, StringComparison.Ordinal);
        var timeline = JsonSerializer.Deserialize<PlatformTenantTimelineResponse>(
            body,
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(timeline);
        Assert.DoesNotContain(timeline.Items, item => item.Type == PlatformTenantTimelineTypes.Paddle);
        Assert.Equal(
            PlatformTenantTimelineSourceStates.MissingInstrumentation,
            timeline.Sources.Single(source =>
                source.Source == PlatformTenantTimelineProvenance.PaddleWebhookDeliveries).State);
    }

    private async Task<(TenantResponse TenantA, TenantResponse TenantB)> CreatePairAsync()
    {
        using var platform = Factory.CreateClient();
        IntegrationTestHelpers.UseBearerToken(platform, await IntegrationTestHelpers.LoginAsPlatformAdminAsync(platform));
        var tenantA = await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            platform,
            "Timeline A",
            $"tl-a-{Guid.NewGuid():N}"[..12],
            "admin@tl-a.test");
        var tenantB = await IntegrationTestHelpers.CreateTenantViaPlatformAsync(
            platform,
            "Timeline B",
            $"tl-b-{Guid.NewGuid():N}"[..12],
            "admin@tl-b.test");
        return (tenantA, tenantB);
    }

    private async Task<(string IssueA, string IssueB)> SeedBothAsync(Guid tenantA, Guid tenantB)
    {
        var now = DateTimeOffset.UtcNow;
        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        db.PlatformAuditLogs.AddRange(
            new PlatformAuditLog
            {
                Id = Guid.CreateVersion7(),
                ActorUserId = Guid.CreateVersion7(),
                ActorEmail = "platform@cohestra.local",
                TenantId = tenantA,
                Action = PlatformAuditAction.TenantSuspended,
                Reason = "ToS review",
                DetailsJson = $"{{\"secret\":\"{AuditSecret}\"}}",
                CreatedAt = now.AddMinutes(-1),
            },
            new PlatformAuditLog
            {
                Id = Guid.CreateVersion7(),
                ActorUserId = Guid.CreateVersion7(),
                ActorEmail = "platform@cohestra.local",
                TenantId = tenantB,
                Action = PlatformAuditAction.TenantSuspended,
                Reason = "foreign",
                DetailsJson = $"{{\"secret\":\"{AuditSecret}\"}}",
                CreatedAt = now,
            });
        var issueANumber = $"A{Guid.NewGuid():N}"[..17];
        var issueBNumber = $"B{Guid.NewGuid():N}"[..17];
        var issueA = new SupportIssue
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantA,
            IssueNumber = issueANumber,
            SubmittedByUserId = Guid.CreateVersion7(),
            Subject = SupportSecret,
            Description = SupportSecret,
            InternalNote = SupportSecret,
            OperatorEmail = "op-a@example.com",
            OperatorDisplayName = "Op A",
            TenantSlug = "tl-a",
            TenantName = "Timeline A",
            Status = SupportIssueStatus.Open,
            CreatedAt = now.AddMinutes(-2),
            UpdatedAt = now.AddMinutes(-2),
        };
        var issueB = new SupportIssue
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantB,
            IssueNumber = issueBNumber,
            SubmittedByUserId = Guid.CreateVersion7(),
            Subject = SupportSecret,
            Description = SupportSecret,
            InternalNote = SupportSecret,
            OperatorEmail = "op-b@example.com",
            OperatorDisplayName = "Op B",
            TenantSlug = "tl-b",
            TenantName = "Timeline B",
            Status = SupportIssueStatus.Open,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.SupportIssues.AddRange(issueA, issueB);
        db.SupportIssueReplies.Add(new SupportIssueReply
        {
            Id = Guid.CreateVersion7(),
            SupportIssueId = issueA.Id,
            ActorUserId = Guid.CreateVersion7(),
            ActorEmail = "filer@example.com",
            Body = SupportSecret,
            CreatedAt = now.AddMinutes(-1),
        });
        db.OutboxMessages.AddRange(
            new OutboxMessage
            {
                Id = Guid.CreateVersion7(),
                TenantId = tenantA,
                MessageType = OutboxMessageTypes.CampaignRecipient,
                PayloadJson = $"{{\"body\":\"{OutboxSecret}\"}}",
                DedupeKey = OutboxSecret,
                Status = OutboxMessageStatus.Failed,
                AttemptCount = 3,
                CreatedAt = now.AddMinutes(-3),
                NextAttemptAt = now,
                LastError = $"Password={OutboxSecret}",
            },
            new OutboxMessage
            {
                Id = Guid.CreateVersion7(),
                TenantId = tenantB,
                MessageType = OutboxMessageTypes.CampaignRecipient,
                PayloadJson = $"{{\"body\":\"{OutboxSecret}\"}}",
                Status = OutboxMessageStatus.Failed,
                AttemptCount = 3,
                CreatedAt = now,
                NextAttemptAt = now,
                LastError = OutboxSecret,
            });
        db.PaddleWebhookDeliveries.AddRange(
            new PaddleWebhookDelivery
            {
                Id = Guid.CreateVersion7(),
                EventId = "evt-a-446",
                EventType = "transaction.completed",
                Disposition = PaddleWebhookDeliveryDisposition.Processed,
                TenantId = tenantA,
                HttpStatus = 200,
                DetailSanitized = "Processed.",
                ObservedAt = now.AddMinutes(-4),
            },
            new PaddleWebhookDelivery
            {
                Id = Guid.CreateVersion7(),
                EventId = "evt-b-446",
                EventType = "transaction.completed",
                Disposition = PaddleWebhookDeliveryDisposition.Processed,
                TenantId = tenantB,
                HttpStatus = 200,
                DetailSanitized = PaddleSecret,
                ObservedAt = now,
            },
            new PaddleWebhookDelivery
            {
                Id = Guid.CreateVersion7(),
                EventId = "evt-null-446",
                EventType = "transaction.completed",
                Disposition = PaddleWebhookDeliveryDisposition.Rejected,
                TenantId = null,
                HttpStatus = 400,
                DetailSanitized = PaddleSecret,
                ObservedAt = now,
            });
        await db.SaveChangesAsync();
        return (issueANumber, issueBNumber);
    }
}
