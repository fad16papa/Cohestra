namespace LeadGenerationCrm.Infrastructure.Registrations;

internal static class ClientContactNormalizer
{
    public static string? NormalizeEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return null;
        }

        return email.Trim().ToLowerInvariant();
    }

    /// <summary>
    /// Normalizes phone numbers to E.164 using the field's ISO country when provided.
    /// Legacy callers omit country and keep +63 (Philippines) behavior.
    /// </summary>
    public static string? NormalizePhone(string? phone, string? isoCountryCode = null) =>
        PhoneCountrySupport.NormalizePhone(phone, isoCountryCode);
}
