namespace Cohestra.Domain.Outbox;

public static class OutboxMessageTypes
{
    public const string RegistrationConfirmation = "registration.confirmation";
    public const string CampaignRecipient = "campaign.recipient";
    public const string BillingNotification = "billing.notification";
    public const string SupportIssueTech = "support.issue.tech";
    public const string SupportIssueConfirmation = "support.issue.confirmation";
    public const string SupportIssueFilerReply = "support.issue.filer.reply";
    public const string SupportIssueFilerStatus = "support.issue.filer.status";
    public const string ActivityExpired = "activity.expired";
    public const string ActivityExpiringSoon = "activity.expiring_soon";
}
