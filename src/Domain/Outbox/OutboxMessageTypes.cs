namespace Cohestra.Domain.Outbox;

public static class OutboxMessageTypes
{
    public const string RegistrationConfirmation = "registration.confirmation";
    public const string CampaignRecipient = "campaign.recipient";
    public const string BillingNotification = "billing.notification";
    public const string SupportIssueTech = "support.issue.tech";
    public const string SupportIssueConfirmation = "support.issue.confirmation";
}
