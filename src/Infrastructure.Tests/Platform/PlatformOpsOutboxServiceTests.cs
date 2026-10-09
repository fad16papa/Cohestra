using Cohestra.Contracts.Platform;
using Cohestra.Domain.Outbox;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Platform;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Tests.Platform;

public sealed class PlatformOpsOutboxServiceTests
{
    [Fact]
    public async Task Summary_aggregates_all_statuses_including_zeros_with_actual_provenance()
    {
        await using var db = CreateDb();
        var tenantA = Guid.CreateVersion7();
        db.OutboxMessages.AddRange(
            CreateMessage(tenantA, OutboxMessageStatus.Failed, OutboxMessageTypes.CampaignRecipient, DateTimeOffset.UtcNow),
            CreateMessage(tenantA, OutboxMessageStatus.Failed, OutboxMessageTypes.CampaignRecipient, DateTimeOffset.UtcNow),
            CreateMessage(tenantA, OutboxMessageStatus.Pending, OutboxMessageTypes.RegistrationConfirmation, DateTimeOffset.UtcNow),
            CreateMessage(tenantA, OutboxMessageStatus.Completed, OutboxMessageTypes.BillingNotification, DateTimeOffset.UtcNow));
        await db.SaveChangesAsync();

        var summary = await new PlatformOpsOutboxService(db).GetSummaryAsync();

        Assert.Equal(PlatformKpiFreshness.Actual, summary.CountsByStatus.Freshness);
        Assert.Equal(PlatformOpsOutboxSources.OutboxMessages, summary.CountsByStatus.Source);
        Assert.Equal(TimeSpan.Zero, summary.CountsByStatus.ObservedAt.Offset);
        Assert.Equal(
            new[] { "Pending", "Processing", "Completed", "Failed" },
            summary.CountsByStatus.Value!.Select(row => row.Key).ToArray());
        Assert.Equal(1, CountFor(summary.CountsByStatus.Value!, "Pending"));
        Assert.Equal(0, CountFor(summary.CountsByStatus.Value!, "Processing"));
        Assert.Equal(1, CountFor(summary.CountsByStatus.Value!, "Completed"));
        Assert.Equal(2, CountFor(summary.CountsByStatus.Value!, "Failed"));
        Assert.Contains(summary.CountsByMessageType.Value!, row => row is { Key: "campaign.recipient", Count: 2 });
        Assert.Equal(PlatformKpiFreshness.Actual, summary.CountsByMessageType.Freshness);
    }

    [Fact]
    public async Task List_filters_before_pagination_and_omits_payload()
    {
        await using var db = CreateDb();
        var tenantA = Guid.CreateVersion7();
        var tenantB = Guid.CreateVersion7();
        var older = DateTimeOffset.Parse("2026-01-01T00:00:00Z");
        var newer = DateTimeOffset.Parse("2026-06-01T00:00:00Z");
        db.OutboxMessages.AddRange(
            CreateMessage(tenantA, OutboxMessageStatus.Failed, OutboxMessageTypes.CampaignRecipient, newer, "Password=leak"),
            CreateMessage(tenantA, OutboxMessageStatus.Pending, OutboxMessageTypes.CampaignRecipient, newer),
            CreateMessage(tenantB, OutboxMessageStatus.Failed, OutboxMessageTypes.CampaignRecipient, newer),
            CreateMessage(tenantA, OutboxMessageStatus.Failed, OutboxMessageTypes.RegistrationConfirmation, older));
        await db.SaveChangesAsync();

        var service = new PlatformOpsOutboxService(db);
        var listed = await service.ListAsync(new PlatformOpsOutboxListQuery(
            "Failed",
            OutboxMessageTypes.CampaignRecipient,
            tenantA,
            DateTimeOffset.Parse("2026-05-01T00:00:00Z"),
            DateTimeOffset.Parse("2026-07-01T00:00:00Z"),
            1,
            25));

        Assert.True(listed.Succeeded);
        var item = Assert.Single(listed.Value!.Items);
        Assert.Equal(tenantA, item.TenantId);
        Assert.Equal("Failed", item.Status);
        Assert.Equal(OutboxMessageTypes.CampaignRecipient, item.MessageType);
        Assert.DoesNotContain("leak", item.LastErrorSanitized, StringComparison.OrdinalIgnoreCase);
        Assert.Null(item.GetType().GetProperty("PayloadJson"));
        Assert.Null(item.GetType().GetProperty("DedupeKey"));
        Assert.Null(item.GetType().GetProperty("LastError"));
    }

    [Fact]
    public async Task List_orders_newest_first_and_clamps_page_size()
    {
        await using var db = CreateDb();
        var tenant = Guid.CreateVersion7();
        for (var i = 0; i < 3; i++)
        {
            db.OutboxMessages.Add(CreateMessage(
                tenant,
                OutboxMessageStatus.Failed,
                OutboxMessageTypes.SupportIssueTech,
                DateTimeOffset.UtcNow.AddMinutes(i)));
        }

        await db.SaveChangesAsync();
        var service = new PlatformOpsOutboxService(db);
        var listed = await service.ListAsync(new PlatformOpsOutboxListQuery(
            null, null, null, null, null, Page: 0, PageSize: 100));

        Assert.True(listed.Succeeded);
        Assert.Equal(50, listed.Value!.PageSize);
        Assert.Equal(1, listed.Value.Page);
        Assert.Equal(3, listed.Value.TotalCount);
        Assert.True(listed.Value.Items[0].CreatedAt >= listed.Value.Items[1].CreatedAt);
        Assert.True(listed.Value.Items[1].CreatedAt >= listed.Value.Items[2].CreatedAt);
    }

    [Fact]
    public async Task Invalid_status_and_from_after_to_fail_without_listing()
    {
        await using var db = CreateDb();
        var service = new PlatformOpsOutboxService(db);

        var badStatus = await service.ListAsync(new PlatformOpsOutboxListQuery(
            "DeadLetter", null, null, null, null, 1, 25));
        Assert.False(badStatus.Succeeded);
        Assert.Contains("Pending", badStatus.Error, StringComparison.Ordinal);

        var badRange = await service.ListAsync(new PlatformOpsOutboxListQuery(
            null,
            null,
            null,
            DateTimeOffset.Parse("2026-10-02T00:00:00Z"),
            DateTimeOffset.Parse("2026-10-01T00:00:00Z"),
            1,
            25));
        Assert.False(badRange.Succeeded);
        Assert.Contains("CreatedAt", badRange.Error, StringComparison.Ordinal);
        Assert.DoesNotContain("swapped", badRange.Error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void TryNormalize_defaults_and_clamps_pagination()
    {
        Assert.True(PlatformOpsOutboxService.TryNormalize(
            new PlatformOpsOutboxListQuery(null, null, null, null, null, 0, 0),
            out var defaults,
            out _));
        Assert.Equal(1, defaults.Page);
        Assert.Equal(25, defaults.PageSize);

        Assert.True(PlatformOpsOutboxService.TryNormalize(
            new PlatformOpsOutboxListQuery("failed", " campaign.recipient ", null, null, null, 2, 50),
            out var parsed,
            out _));
        Assert.Equal(OutboxMessageStatus.Failed, parsed.Status);
        Assert.Equal("campaign.recipient", parsed.MessageType);
        Assert.Equal(50, parsed.PageSize);
    }

    private static int CountFor(IReadOnlyList<PlatformNamedCount> rows, string key) =>
        rows.Single(row => row.Key == key).Count;

    private static OutboxMessage CreateMessage(
        Guid tenantId,
        OutboxMessageStatus status,
        string messageType,
        DateTimeOffset createdAt,
        string? lastError = null) =>
        new()
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantId,
            MessageType = messageType,
            PayloadJson = """{"body":"CUSTOMER_BODY_SENTINEL_44_4","to":"buyer@example.com"}""",
            DedupeKey = $"dedupe-{Guid.NewGuid():N}",
            Status = status,
            AttemptCount = status == OutboxMessageStatus.Failed ? 5 : 1,
            CreatedAt = createdAt,
            NextAttemptAt = createdAt,
            LastError = lastError,
        };

    private static CohestraDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new CohestraDbContext(options);
    }
}
