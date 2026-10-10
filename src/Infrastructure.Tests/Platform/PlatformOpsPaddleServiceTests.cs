using Cohestra.Contracts.Platform;
using Cohestra.Domain.Billing;
using Cohestra.Infrastructure.Billing;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Platform;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Tests.Platform;

public sealed class PlatformOpsPaddleServiceTests
{
    [Fact]
    public void Config_uses_existing_IsConfigured_and_omits_secrets()
    {
        var settings = new PaddleSettings
        {
            ApiKey = "pdl_sdbx_secret",
            ClientToken = "test_token",
            WebhookSecret = "pdl_ntfset_secret",
            Environment = "sandbox",
            AllowLive = false,
            PriceCoreMonthly = "pri_core_m",
        };
        var service = new PlatformOpsPaddleService(CreateDb(), Options.Create(settings));

        var config = service.GetConfig();

        Assert.True(config.IsConfigured);
        Assert.Equal("sandbox", config.Environment);
        Assert.False(config.AllowLive);
        Assert.Equal("https://sandbox-api.paddle.com", config.ApiHost);
        Assert.Null(config.GetType().GetProperty("ApiKey"));
        Assert.Null(config.GetType().GetProperty("WebhookSecret"));
        Assert.Null(config.GetType().GetProperty("ClientToken"));
        Assert.Null(config.GetType().GetProperty("PriceCoreMonthly"));
    }

    [Fact]
    public void Config_unconfigured_and_live_host_follow_existing_settings()
    {
        var settings = new PaddleSettings
        {
            Environment = "production",
            AllowLive = true,
        };
        var service = new PlatformOpsPaddleService(CreateDb(), Options.Create(settings));

        var config = service.GetConfig();

        Assert.False(config.IsConfigured);
        Assert.Equal("production", config.Environment);
        Assert.True(config.AllowLive);
        Assert.Equal("https://api.paddle.com", config.ApiHost);
    }

    [Fact]
    public async Task List_filters_before_pagination_and_clamps_page_size()
    {
        await using var db = CreateDb();
        var tenantA = Guid.CreateVersion7();
        var tenantB = Guid.CreateVersion7();
        var older = DateTimeOffset.Parse("2026-01-01T00:00:00Z");
        var newer = DateTimeOffset.Parse("2026-06-01T00:00:00Z");
        db.PaddleWebhookDeliveries.AddRange(
            Row(tenantA, PaddleWebhookDeliveryDisposition.Rejected, "transaction.completed", newer),
            Row(tenantA, PaddleWebhookDeliveryDisposition.Processed, "transaction.completed", newer),
            Row(tenantB, PaddleWebhookDeliveryDisposition.Rejected, "transaction.completed", newer),
            Row(tenantA, PaddleWebhookDeliveryDisposition.Rejected, "subscription.updated", older));
        await db.SaveChangesAsync();

        var service = new PlatformOpsPaddleService(db, Options.Create(new PaddleSettings()));
        var listed = await service.ListDeliveriesAsync(new PlatformOpsPaddleDeliveryListQuery(
            "rejected",
            "transaction.completed",
            tenantA,
            DateTimeOffset.Parse("2026-05-01T00:00:00Z"),
            DateTimeOffset.Parse("2026-07-01T00:00:00Z"),
            1,
            100));

        Assert.True(listed.Succeeded);
        var item = Assert.Single(listed.Value!.Items);
        Assert.Equal(tenantA, item.TenantId);
        Assert.Equal("Rejected", item.Disposition);
        Assert.Equal(50, listed.Value.PageSize);
        Assert.Null(item.GetType().GetProperty("PayloadJson"));
        Assert.Null(item.GetType().GetProperty("RawBody"));
        Assert.Null(item.GetType().GetProperty("Signature"));
    }

    [Fact]
    public async Task List_rejects_invalid_disposition_and_from_after_to()
    {
        var service = new PlatformOpsPaddleService(CreateDb(), Options.Create(new PaddleSettings()));

        var invalid = await service.ListDeliveriesAsync(
            new PlatformOpsPaddleDeliveryListQuery("failed", null, null, null, null, 1, 25));
        Assert.False(invalid.Succeeded);
        Assert.Contains("disposition", invalid.Error, StringComparison.OrdinalIgnoreCase);

        var range = await service.ListDeliveriesAsync(new PlatformOpsPaddleDeliveryListQuery(
            null,
            null,
            null,
            DateTimeOffset.Parse("2026-04-02T00:00:00Z"),
            DateTimeOffset.Parse("2026-04-01T00:00:00Z"),
            1,
            25));
        Assert.False(range.Succeeded);
        Assert.Contains("from", range.Error, StringComparison.OrdinalIgnoreCase);
    }

    private static PaddleWebhookDelivery Row(
        Guid tenantId,
        PaddleWebhookDeliveryDisposition disposition,
        string eventType,
        DateTimeOffset observedAt) =>
        new()
        {
            Id = Guid.CreateVersion7(),
            EventId = $"evt_{Guid.NewGuid():N}",
            EventType = eventType,
            Disposition = disposition,
            TenantId = tenantId,
            HttpStatus = disposition == PaddleWebhookDeliveryDisposition.Rejected ? 400 : 200,
            DetailSanitized = "safe",
            ObservedAt = observedAt,
        };

    private static CohestraDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new CohestraDbContext(options);
    }
}
