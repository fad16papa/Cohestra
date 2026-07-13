using Cohestra.Contracts.Clients;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Clients;
using Cohestra.Domain.Registrations;
using Cohestra.Infrastructure.Registrations;

namespace Cohestra.Infrastructure.Clients;

internal static class ClientTimelineBuilder
{
    public static IReadOnlyList<ClientTimelineItemResponse> Build(
        IReadOnlyList<Registration> registrations,
        IReadOnlyList<ClientTimelineEvent> timelineEvents)
    {
        var items = new List<ClientTimelineItemResponse>(registrations.Count + timelineEvents.Count);

        foreach (var registration in registrations)
        {
            items.Add(new ClientTimelineItemResponse(
                "registration_submitted",
                registration.CreatedAt,
                "Registration submitted",
                registration.Activity.Name,
                ExtractReferralSource(registration),
                null,
                null,
                registration.Id,
                null,
                null));
        }

        foreach (var timelineEvent in timelineEvents)
        {
            switch (timelineEvent.EventType)
            {
                case ClientTimelineEventType.LeadStatusChanged:
                    items.Add(new ClientTimelineItemResponse(
                        "lead_status_changed",
                        timelineEvent.OccurredAt,
                        "Lead status changed",
                        null,
                        null,
                        NormalizeStatusToken(timelineEvent.PreviousLeadStatus),
                        NormalizeStatusToken(timelineEvent.NewLeadStatus),
                        null,
                        null,
                        null));
                    break;

                case ClientTimelineEventType.EmailCampaignSent:
                    items.Add(new ClientTimelineItemResponse(
                        "email_campaign_sent",
                        timelineEvent.OccurredAt,
                        "Email campaign sent",
                        null,
                        null,
                        null,
                        null,
                        null,
                        timelineEvent.Subject,
                        null));
                    break;

                case ClientTimelineEventType.WhatsAppInitiated:
                    items.Add(new ClientTimelineItemResponse(
                        "whatsapp_initiated",
                        timelineEvent.OccurredAt,
                        "WhatsApp initiated",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null));
                    break;

                case ClientTimelineEventType.WhatsAppFollowUpRecorded:
                    items.Add(new ClientTimelineItemResponse(
                        "whatsapp_follow_up_recorded",
                        timelineEvent.OccurredAt,
                        "WhatsApp follow-up recorded",
                        null,
                        null,
                        null,
                        null,
                        null,
                        timelineEvent.Subject,
                        timelineEvent.Note));
                    break;
            }
        }

        return items
            .OrderByDescending(item => item.OccurredAt)
            .ToList();
    }

    internal static string? ExtractReferralSource(Registration registration)
    {
        var schema = registration.Activity.FormSchema;
        if (schema?.Fields is null)
        {
            return null;
        }

        foreach (var field in schema.Fields)
        {
            if (field.Type != FormFieldTypes.ReferralSource)
            {
                continue;
            }

            if (!registration.Answers.TryGetValue(field.Id, out var rawValue))
            {
                continue;
            }

            if (!RegistrationAnswerValidator.TryGetStringForExtraction(rawValue, out var text) ||
                string.IsNullOrWhiteSpace(text))
            {
                continue;
            }

            var optionLabel = field.Options?
                .FirstOrDefault(option =>
                    string.Equals(option.Value, text.Trim(), StringComparison.Ordinal))
                ?.Label;

            return optionLabel ?? text.Trim();
        }

        return null;
    }

    private static string? NormalizeStatusToken(string? rawStatus)
    {
        if (string.IsNullOrWhiteSpace(rawStatus))
        {
            return null;
        }

        return rawStatus.Trim().ToLowerInvariant();
    }
}
