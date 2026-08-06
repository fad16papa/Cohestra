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
}
