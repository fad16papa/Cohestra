using System.Text.Json;
using Cohestra.Application.Outbox;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Billing;
using Cohestra.Infrastructure.Outbox;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class BillingNotificationComposerScheduleTests
{
    [Fact]
    public void EnqueueScheduledDowngradeConfirmation_intervalOnly_usesIntervalCopy()
    {
        var publisher = new CapturingOutboxPublisher();
        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Slug = "acme",
            Name = "Acme",
            Plan = TenantPlan.Pro,
            BillingInterval = BillingInterval.Annual,
            AdminContactEmail = "billing@acme.test",
        };
        var now = new DateTimeOffset(2026, 8, 10, 12, 0, 0, TimeSpan.Zero);
        var effectiveAt = now.AddDays(30);

        BillingNotificationComposer.EnqueueScheduledDowngradeConfirmation(
            publisher,
            tenant,
            TenantPlan.Pro,
            BillingInterval.Monthly,
            intervalOnlyChange: true,
            effectiveAt,
            [],
            new PublicWebOptions { BaseUrl = "https://app.cohestra.test" },
            now);

        var payload = Assert.Single(publisher.Payloads);
        var message = JsonSerializer.Deserialize<BillingNotificationOutboxPayload>(payload)
            ?? throw new InvalidOperationException("Payload was not deserializable.");

        Assert.Contains("yearly to monthly", message.PlainBody, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("from Pro to Pro", message.PlainBody, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Billing interval change scheduled", message.Subject, StringComparison.OrdinalIgnoreCase);
    }

    private sealed class CapturingOutboxPublisher : IOutboxPublisher
    {
        public List<string> Payloads { get; } = [];

        public void Enqueue(
            Guid tenantId,
            string messageType,
            string payloadJson,
            string? dedupeKey = null,
            DateTimeOffset? nextAttemptAt = null)
        {
            Payloads.Add(payloadJson);
        }
    }
}
