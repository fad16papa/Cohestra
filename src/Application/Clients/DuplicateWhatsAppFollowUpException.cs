namespace Cohestra.Application.Clients;

public sealed class DuplicateWhatsAppFollowUpException : Exception
{
    public DuplicateWhatsAppFollowUpException()
        : base(
            "An identical WhatsApp follow-up was recorded recently. " +
            "Change the status or note, or wait before logging again.")
    {
    }
}
