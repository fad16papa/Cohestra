using Cohestra.Contracts.Campaigns;

namespace Cohestra.Infrastructure.Campaigns;

internal static class ClientSegmentQueryValidator
{
    public const int MaxAdditionalRecipients = 50;

    public static void Validate(ClientSegmentQueryRequest query)
    {
        if (query.AllClients)
        {
            return;
        }

        if (query.ClientIds is { Count: 0 })
        {
            throw new ArgumentException("Manual selection requires at least one client.");
        }

        if (query.ActivityIds is { Count: 0 })
        {
            throw new ArgumentException("Activity filter requires at least one selected activity.");
        }

        if (query.AdditionalClientIds is { Count: > MaxAdditionalRecipients })
        {
            throw new ArgumentException(
                $"At most {MaxAdditionalRecipients} additional recipients are allowed.");
        }

        if (query.AdditionalClientIds is { Count: > 0 } &&
            string.IsNullOrWhiteSpace(query.Community))
        {
            throw new ArgumentException(
                "Additional recipients require a target community segment.");
        }

        var hasClientIds = query.ClientIds is { Count: > 0 };
        var hasActivityIds = query.ActivityIds is { Count: > 0 };
        var hasLeadStatus = !string.IsNullOrWhiteSpace(query.LeadStatus);
        var hasCommunity = !string.IsNullOrWhiteSpace(query.Community);
        var hasName = !string.IsNullOrWhiteSpace(query.Name);
        var hasNationality = !string.IsNullOrWhiteSpace(query.Nationality);
        var hasProfession = !string.IsNullOrWhiteSpace(query.Profession);
        var hasAdditional = query.AdditionalClientIds is { Count: > 0 };

        if (!hasClientIds &&
            !hasActivityIds &&
            !hasLeadStatus &&
            !hasCommunity &&
            !hasName &&
            !hasNationality &&
            !hasProfession &&
            !hasAdditional)
        {
            throw new ArgumentException(
                "Segment must include at least one filter or set allClients to true.");
        }
    }
}
