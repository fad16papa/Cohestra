namespace Cohestra.Contracts.Clients;

public sealed record ClientRegistrationAnswerResponse(
    string FieldId,
    string Label,
    string? Value);

public sealed record ClientRegistrationAnswerHistoryResponse(
    Guid RegistrationId,
    string RegistrationNumber,
    Guid ActivityId,
    string ActivityName,
    DateTimeOffset RegisteredAt,
    IReadOnlyList<ClientRegistrationAnswerResponse> Answers);

public sealed record ClientDetailResponse(
    Guid Id,
    string FullName,
    string? Phone,
    string? Email,
    string? Profession,
    string? Nationality,
    string? Residency,
    bool ConsentGiven,
    string? ReferralSource,
    string? Notes,
    string LeadStatus,
    bool IsMergeSuspect,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    IReadOnlyList<ClientRegistrationAnswerHistoryResponse> RegistrationHistory,
    IReadOnlyList<ClientTimelineItemResponse> Timeline);

public sealed record UpdateClientLeadStatusRequest(string LeadStatus);

public sealed record UpdateClientMasterProfileRequest(
    string FullName,
    string? Phone,
    string? PhoneCountry,
    string? Email,
    string? Profession,
    string? Nationality,
    string? Residency,
    bool ConsentGiven,
    string? ReferralSource,
    string? Notes);
