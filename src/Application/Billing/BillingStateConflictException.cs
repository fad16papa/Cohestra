namespace Cohestra.Application.Billing;

public sealed class BillingStateConflictException : InvalidOperationException
{
    public const string DefaultMessage =
        "Your billing state changed while you were reviewing this change. Review the updated billing details and try again.";

    public BillingStateConflictException()
        : base(DefaultMessage)
    {
    }

    public BillingStateConflictException(string message)
        : base(message)
    {
    }
}
