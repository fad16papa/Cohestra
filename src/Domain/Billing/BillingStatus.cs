namespace Cohestra.Domain.Billing;

public enum BillingStatus
{
    Free = 0,
    Trialing = 1,
    Active = 2,
    PastDue = 3,
    OnHold = 4,
    Canceled = 5,
}
