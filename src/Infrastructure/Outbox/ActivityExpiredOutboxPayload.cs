using System.Text.Json.Serialization;

namespace Cohestra.Infrastructure.Outbox;

public sealed class ActivityExpiredOutboxPayload
{
    public Guid ActivityId { get; init; }

    public string ActivityName { get; init; } = string.Empty;

    public string Schedule { get; init; } = string.Empty;

    public string RecipientEmail { get; init; } = string.Empty;

    [JsonPropertyName("AdminEmail")]
    public string? LegacyAdminEmail { get; init; }

    public string TenantName { get; init; } = string.Empty;

    public DateTimeOffset ArchivedAtUtc { get; init; }

    public string ResolveRecipientEmail()
    {
        if (!string.IsNullOrWhiteSpace(RecipientEmail))
        {
            return RecipientEmail.Trim();
        }

        if (!string.IsNullOrWhiteSpace(LegacyAdminEmail))
        {
            return LegacyAdminEmail.Trim();
        }

        throw new InvalidOperationException("Activity expired outbox payload is missing a recipient email.");
    }
}
