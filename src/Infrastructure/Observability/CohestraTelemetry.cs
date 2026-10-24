using System.Diagnostics;
using System.Diagnostics.Metrics;
using Cohestra.Domain.Outbox;

namespace Cohestra.Infrastructure.Observability;

public static class CohestraTelemetry
{
    public const string ServiceName = "cohestra-api";
    public const string ActivitySourceName = "Cohestra";
    public const string MeterName = "Cohestra";

    public const string OutboxDispatchActivity = "outbox.dispatch";
    public const string PaddleWebhookActivity = "paddle.webhook";
    public const string JobRunActivity = "job.run";
    public const string UnhandledExceptionActivity = "http.unhandled_exception";

    public static readonly ActivitySource ActivitySource = new(ActivitySourceName);
    public static readonly Meter Meter = new(MeterName);

    public static readonly Counter<long> OutboxDispatchCounter =
        Meter.CreateCounter<long>("cohestra.outbox.dispatch", unit: "{dispatch}");

    public static readonly Counter<long> PaddleWebhookCounter =
        Meter.CreateCounter<long>("cohestra.paddle.webhook", unit: "{webhook}");

    public static readonly Counter<long> EmailSendFailureCounter =
        Meter.CreateCounter<long>("cohestra.email.send.failure", unit: "{failure}");

    public static readonly Histogram<double> JobDurationMs =
        Meter.CreateHistogram<double>("cohestra.job.duration", unit: "ms");

    private static readonly Dictionary<string, string> KnownPaddleEventTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        ["transaction.completed"] = "transaction.completed",
        ["transaction.payment_failed"] = "transaction.payment_failed",
        ["subscription.created"] = "subscription.created",
        ["subscription.updated"] = "subscription.updated",
        ["subscription.canceled"] = "subscription.canceled",
        ["subscription.past_due"] = "subscription.past_due",
        ["subscription.activated"] = "subscription.activated",
        ["adjustment.created"] = "adjustment.created",
        ["adjustment.updated"] = "adjustment.updated",
        ["missing"] = "missing",
        ["rejected"] = "rejected",
    };

    private static readonly HashSet<string> KnownOutboxMessageTypes = new(StringComparer.Ordinal)
    {
        OutboxMessageTypes.RegistrationConfirmation,
        OutboxMessageTypes.RegistrationOperatorNotify,
        OutboxMessageTypes.CampaignRecipient,
        OutboxMessageTypes.BillingNotification,
        OutboxMessageTypes.SupportIssueTech,
        OutboxMessageTypes.SupportIssueConfirmation,
        OutboxMessageTypes.SupportIssueFilerReply,
        OutboxMessageTypes.SupportIssueFilerStatus,
        OutboxMessageTypes.ActivityExpired,
        OutboxMessageTypes.ActivityExpiringSoon,
        OutboxMessageTypes.WebsiteInquiryOperatorNotify,
    };

    public static bool IsAlwaysOnActivity(string? name) =>
        name is OutboxDispatchActivity or PaddleWebhookActivity or JobRunActivity or UnhandledExceptionActivity;

    public static async Task TraceJobAsync(string jobName, Func<Task> action)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(jobName);
        ArgumentNullException.ThrowIfNull(action);

        var started = Stopwatch.GetTimestamp();
        using var activity = StartAlwaysOn(JobRunActivity, ActivityKind.Internal);
        activity?.SetTag("job.name", jobName);
        try
        {
            await action().ConfigureAwait(false);
            activity?.SetTag("job.success", true);
            activity?.SetStatus(ActivityStatusCode.Ok);
            JobDurationMs.Record(Stopwatch.GetElapsedTime(started).TotalMilliseconds, new KeyValuePair<string, object?>("job.name", jobName), new KeyValuePair<string, object?>("job.success", true));
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            activity?.SetTag("job.success", false);
            activity?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
            JobDurationMs.Record(Stopwatch.GetElapsedTime(started).TotalMilliseconds, new KeyValuePair<string, object?>("job.name", jobName), new KeyValuePair<string, object?>("job.success", false));
            throw;
        }
    }

    public static async Task<T> TraceOutboxDispatchAsync<T>(
        string messageType,
        Func<Task<T>> action)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(messageType);
        ArgumentNullException.ThrowIfNull(action);

        var normalizedType = NormalizeOutboxMessageType(messageType);
        using var activity = StartAlwaysOn(OutboxDispatchActivity, ActivityKind.Internal);
        activity?.SetTag("outbox.message_type", normalizedType);
        try
        {
            var result = await action().ConfigureAwait(false);
            var status = result?.ToString() ?? "unknown";
            activity?.SetTag("outbox.status", status);
            if (string.Equals(status, "Failed", StringComparison.OrdinalIgnoreCase))
            {
                activity?.SetStatus(ActivityStatusCode.Error, "outbox.failed");
            }
            else
            {
                activity?.SetStatus(ActivityStatusCode.Ok);
            }

            OutboxDispatchCounter.Add(1, new KeyValuePair<string, object?>("outbox.message_type", normalizedType), new KeyValuePair<string, object?>("outbox.status", status));
            return result;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            activity?.SetTag("outbox.status", "Failed");
            activity?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
            OutboxDispatchCounter.Add(1, new KeyValuePair<string, object?>("outbox.message_type", normalizedType), new KeyValuePair<string, object?>("outbox.status", "Failed"));
            throw;
        }
    }

    public static Activity? StartPaddleWebhook(string? eventType)
    {
        var activity = StartAlwaysOn(PaddleWebhookActivity, ActivityKind.Server);
        activity?.SetTag("paddle.event_type", NormalizePaddleEventType(eventType));
        return activity;
    }

    public static void CompletePaddleWebhook(Activity? activity, string disposition)
    {
        var normalizedDisposition = string.IsNullOrWhiteSpace(disposition) ? "unknown" : disposition.Trim();
        var eventType = activity?.GetTagItem("paddle.event_type")?.ToString() ?? "other";
        activity?.SetTag("paddle.disposition", normalizedDisposition);
        if (normalizedDisposition is "Invalid" or "Retryable" or "Rejected")
        {
            activity?.SetStatus(ActivityStatusCode.Error, normalizedDisposition);
        }
        else
        {
            activity?.SetStatus(ActivityStatusCode.Ok);
        }

        PaddleWebhookCounter.Add(
            1,
            new KeyValuePair<string, object?>("paddle.event_type", eventType),
            new KeyValuePair<string, object?>("paddle.disposition", normalizedDisposition));
    }

    public static void RecordEmailSendFailure() => EmailSendFailureCounter.Add(1);

    public static void RecordUnhandledException(string method)
    {
        using var activity = StartAlwaysOn(UnhandledExceptionActivity, ActivityKind.Internal);
        activity?.SetTag("http.request.method", method);
        activity?.SetStatus(ActivityStatusCode.Error, "unhandled");
        Activity.Current?.SetStatus(ActivityStatusCode.Error, "unhandled");
    }

    public static string NormalizePaddleEventType(string? eventType)
    {
        if (string.IsNullOrWhiteSpace(eventType))
        {
            return "other";
        }

        var trimmed = eventType.Trim();
        return KnownPaddleEventTypes.TryGetValue(trimmed, out var canonical) ? canonical : "other";
    }

    public static string NormalizeOutboxMessageType(string? messageType)
    {
        if (string.IsNullOrWhiteSpace(messageType))
        {
            return "other";
        }

        var trimmed = messageType.Trim();
        return KnownOutboxMessageTypes.Contains(trimmed) ? trimmed : "other";
    }

    public static Activity? StartAlwaysOn(string name, ActivityKind kind)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        return ActivitySource.StartActivity(name, kind)
            ?? ActivitySource.StartActivity(name, kind, parentContext: default);
    }
}
