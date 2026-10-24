using System.Diagnostics;
using Cohestra.Domain.Outbox;
using Cohestra.Infrastructure.Observability;

namespace Cohestra.Infrastructure.Tests.Observability;

public sealed class CohestraTelemetryInstrumentationTests
{
    [Fact]
    public async Task Job_outbox_and_paddle_activities_are_named_and_safe()
    {
        var stopped = new List<Activity>();
        using var listener = new ActivityListener
        {
            ShouldListenTo = source => source.Name == CohestraTelemetry.ActivitySourceName,
            Sample = (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllDataAndRecorded,
            ActivityStopped = activity => stopped.Add(activity),
        };
        ActivitySource.AddActivityListener(listener);

        await CohestraTelemetry.TraceJobAsync("billing-jobs", () => Task.CompletedTask);
        await CohestraTelemetry.TraceOutboxDispatchAsync(OutboxMessageTypes.RegistrationConfirmation, () => Task.FromResult("Completed"));
        await CohestraTelemetry.TraceOutboxDispatchAsync("not-a-known-type", () => Task.FromResult("Completed"));
        using (var paddle = CohestraTelemetry.StartPaddleWebhook("Transaction.Completed"))
        {
            CohestraTelemetry.CompletePaddleWebhook(paddle, "Processed");
        }

        using (var unknown = CohestraTelemetry.StartPaddleWebhook("customer.email.updated"))
        {
            CohestraTelemetry.CompletePaddleWebhook(unknown, "Ignored");
        }

        var ours = stopped
            .Where(activity =>
                Equals(activity.GetTagItem("job.name"), "billing-jobs")
                || Equals(activity.GetTagItem("outbox.message_type"), OutboxMessageTypes.RegistrationConfirmation)
                || Equals(activity.GetTagItem("outbox.message_type"), "other")
                || Equals(activity.GetTagItem("paddle.event_type"), "transaction.completed")
                || Equals(activity.GetTagItem("paddle.event_type"), "other"))
            .ToList();

        Assert.Contains(ours, activity => activity.OperationName == CohestraTelemetry.JobRunActivity && Equals(activity.GetTagItem("job.name"), "billing-jobs"));
        Assert.Contains(ours, activity => activity.OperationName == CohestraTelemetry.OutboxDispatchActivity && Equals(activity.GetTagItem("outbox.message_type"), OutboxMessageTypes.RegistrationConfirmation));
        Assert.Contains(ours, activity => activity.OperationName == CohestraTelemetry.OutboxDispatchActivity && Equals(activity.GetTagItem("outbox.message_type"), "other"));
        Assert.Contains(ours, activity => activity.OperationName == CohestraTelemetry.PaddleWebhookActivity && Equals(activity.GetTagItem("paddle.event_type"), "transaction.completed"));
        Assert.Contains(ours, activity => Equals(activity.GetTagItem("paddle.event_type"), "other"));
        Assert.DoesNotContain(ours, activity => activity.TagObjects.Any(tag => TelemetryRedactor.IsForbiddenKey(tag.Key)));
        Assert.DoesNotContain(ours, activity => activity.TagObjects.Any(tag => tag.Key.Contains("payload", StringComparison.OrdinalIgnoreCase)));
    }

    [Fact]
    public async Task Failed_outbox_is_marked_error()
    {
        using var listener = new ActivityListener
        {
            ShouldListenTo = source => source.Name == CohestraTelemetry.ActivitySourceName,
            Sample = (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllDataAndRecorded,
        };
        ActivitySource.AddActivityListener(listener);

        var status = await CohestraTelemetry.TraceOutboxDispatchAsync(OutboxMessageTypes.CampaignRecipient, async () =>
        {
            await Task.Yield();
            return "Failed";
        });

        Assert.Equal("Failed", status);
    }
}
