using System.Text.Json;
using Cohestra.Domain.Outbox;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace Cohestra.Infrastructure.WebsiteInquiries;

/// <summary>
/// Matches website-inquiry notification rows by tenant id plus the payload's
/// ClientId property. Personal data is never located by searching the JSON text.
/// </summary>
internal static class WebsiteInquiryOutboxIdentity
{
    internal static async Task LockDispatchAsync(
        DatabaseFacade database,
        Guid tenantId,
        Guid clientId,
        CancellationToken cancellationToken)
    {
        var (tenantKey, clientKey) = DispatchLockKeys(tenantId, clientId);
        await database.ExecuteSqlInterpolatedAsync(
            $"SELECT pg_advisory_xact_lock({tenantKey}, {clientKey})",
            cancellationToken);
    }

    internal static (int TenantKey, int ClientKey) DispatchLockKeys(Guid tenantId, Guid clientId)
    {
        var tenantKey = BitConverter.ToInt32(tenantId.ToByteArray(), 0) ^ 0x57494E51;
        var clientKey = BitConverter.ToInt32(clientId.ToByteArray(), 4) ^ 0x4E4F5459;
        return (tenantKey, clientKey);
    }

    internal static bool TryReadClientId(string payloadJson, out Guid clientId) =>
        TryReadGuidProperty(payloadJson, "ClientId", out clientId);

    internal static bool TryReadTimelineEventId(string payloadJson, out Guid timelineEventId) =>
        TryReadGuidProperty(payloadJson, "TimelineEventId", out timelineEventId);

    internal static bool IsRedacted(string payloadJson) =>
        TryReadProperty(payloadJson, "Redacted", out var property) && property.ValueKind == JsonValueKind.True;

    internal static string RedactedPayload(Guid clientId, Guid timelineEventId) =>
        JsonSerializer.Serialize(new WebsiteInquiryOperatorNotifyOutboxPayload(
            clientId,
            timelineEventId,
            ParticipantName: string.Empty,
            Phone: null,
            Email: null,
            Message: string.Empty,
            Redacted: true));

    internal static bool MatchesClient(OutboxMessage message, Guid tenantId, Guid clientId) =>
        message.TenantId == tenantId
        && string.Equals(message.MessageType, OutboxMessageTypes.WebsiteInquiryOperatorNotify, StringComparison.Ordinal)
        && TryReadClientId(message.PayloadJson, out var payloadClientId)
        && payloadClientId == clientId;

    private static bool TryReadGuidProperty(string payloadJson, string propertyName, out Guid value)
    {
        value = Guid.Empty;
        if (!TryReadProperty(payloadJson, propertyName, out var property)
            || property.ValueKind != JsonValueKind.String)
        {
            return false;
        }

        return Guid.TryParse(property.GetString(), out value) && value != Guid.Empty;
    }

    private static bool TryReadProperty(string payloadJson, string propertyName, out JsonElement property)
    {
        property = default;
        try
        {
            using var document = JsonDocument.Parse(payloadJson);
            if (document.RootElement.ValueKind != JsonValueKind.Object)
            {
                return false;
            }

            JsonElement found;
            if (!document.RootElement.TryGetProperty(propertyName, out found))
            {
                var camel = char.ToLowerInvariant(propertyName[0]) + propertyName[1..];
                if (!document.RootElement.TryGetProperty(camel, out found))
                {
                    return false;
                }
            }

            property = found.Clone();
            return true;
        }
        catch (JsonException)
        {
            return false;
        }
    }
}
