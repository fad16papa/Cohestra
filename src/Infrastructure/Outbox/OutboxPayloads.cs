namespace Cohestra.Infrastructure.Outbox;

public sealed record RegistrationConfirmationOutboxPayload(Guid RegistrationId);

public sealed record CampaignRecipientOutboxPayload(
    Guid CampaignId,
    Guid RecipientId);

public sealed record BillingNotificationOutboxPayload(
    Guid TenantId,
    string NoticeType,
    string ToEmail,
    string Subject,
    string PlainBody,
    string HtmlBody);

public static class BillingNotificationNoticeTypes
{
    public const string TrialReminder = "trial_reminder";
    public const string PastDue = "past_due";
    public const string OnHold = "on_hold";
    public const string Dormancy = "dormancy";
    public const string ScheduledDowngrade = "scheduled_downgrade";
    public const string ScheduledDowngradeReminder = "scheduled_downgrade_reminder";
    public const string ScheduledDowngradeApplied = "scheduled_downgrade_applied";
    public const string FollowUpDigest = "follow_up_digest";
}
