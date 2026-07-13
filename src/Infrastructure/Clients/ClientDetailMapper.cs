using LeadGenerationCrm.Contracts.Clients;
using LeadGenerationCrm.Domain.Clients;
using LeadGenerationCrm.Domain.Registrations;

namespace LeadGenerationCrm.Infrastructure.Clients;

internal static class ClientDetailMapper
{
    public static ClientDetailResponse ToResponse(
        Client client,
        IReadOnlyList<Registration> registrations,
        IReadOnlyList<ClientTimelineEvent> timelineEvents) =>
        new(
            client.Id,
            client.FullName,
            client.Phone,
            client.Email,
            client.Profession,
            client.Nationality,
            client.Residency,
            client.ConsentGiven,
            client.ReferralSource,
            client.Notes,
            client.LeadStatus.ToString().ToLowerInvariant(),
            client.IsMergeSuspect,
            client.CreatedAt,
            client.UpdatedAt,
            registrations
                .OrderByDescending(registration => registration.CreatedAt)
                .Select(registration => new ClientRegistrationAnswerHistoryResponse(
                    registration.Id,
                    registration.RegistrationNumber,
                    registration.ActivityId,
                    registration.Activity.Name,
                    registration.CreatedAt,
                    ClientRegistrationAnswerFormatter.FormatAnswers(
                        registration.Activity.FormSchema,
                        registration.Answers)))
                .ToList(),
            ClientTimelineBuilder.Build(registrations, timelineEvents));
}
