namespace Cohestra.Contracts.Campaigns;

public sealed record SendCampaignRequest(
    string Subject,
    string Body,
    Guid? EmailTemplateId,
    ClientSegmentQueryRequest Segment,
    string? BodyFormat = null);

public sealed record CampaignRecipientResultResponse(
    Guid ClientId,
    string FullName,
    string? Email,
    string Status,
    string? FailureReason);

public sealed record SendCampaignResponse(
    Guid CampaignId,
    string Subject,
    DateTimeOffset SentAt,
    int SentCount,
    int FailedCount,
    int SkippedCount,
    IReadOnlyList<CampaignRecipientResultResponse> Results);

public sealed record CampaignListItemResponse(
    Guid Id,
    string Subject,
    DateTimeOffset SentAt,
    int SentCount,
    int FailedCount,
    int SkippedCount,
    string Status);

public sealed record CampaignListResponse(
    IReadOnlyList<CampaignListItemResponse> Items,
    int Page,
    int PageSize,
    int TotalCount);

public sealed record CampaignDetailResponse(
    Guid Id,
    string Subject,
    string Body,
    string BodyFormat,
    DateTimeOffset SentAt,
    int SentCount,
    int FailedCount,
    int SkippedCount,
    string Status,
    IReadOnlyList<CampaignRecipientResultResponse> Results);
