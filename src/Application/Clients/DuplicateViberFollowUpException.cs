namespace Cohestra.Application.Clients;

public sealed class DuplicateViberFollowUpException : Exception
{
    public DuplicateViberFollowUpException()
        : base(
            "An identical Viber follow-up was recorded recently. " +
            "Change the status or note, or wait before logging again.")
    {
    }
}
