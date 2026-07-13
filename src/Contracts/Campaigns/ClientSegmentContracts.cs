namespace Cohestra.Contracts.Campaigns;

public sealed record ClientSegmentQueryRequest(
    IReadOnlyList<Guid>? ActivityIds,
    string? LeadStatus,
    string? Community,
    IReadOnlyList<Guid>? ClientIds,
    string? Name = null,
    string? Nationality = null,
    string? Profession = null,
    bool ConsentOnly = false,
    bool AllClients = false,
    IReadOnlyList<Guid>? AdditionalClientIds = null);

public sealed record ClientSegmentPreviewItemResponse(
    Guid Id,
    string FullName,
    string? Email,
    bool ConsentGiven,
    bool IsAdditionalRecipient = false);

public sealed record ClientSegmentPreviewResponse(
    int TotalCount,
    int WithEmailCount,
    int WithoutEmailCount,
    int WithoutConsentCount,
    int CommunityWithEmailCount,
    int AdditionalWithEmailCount,
    IReadOnlyList<ClientSegmentPreviewItemResponse> PreviewItems);
