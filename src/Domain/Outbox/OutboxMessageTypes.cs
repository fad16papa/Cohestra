namespace Cohestra.Domain.Outbox;

public static class OutboxMessageTypes
{
    public const string RegistrationConfirmation = "registration.confirmation";
    public const string CampaignRecipient = "campaign.recipient";
    public const string BillingNotification = "billing.notification";
}
