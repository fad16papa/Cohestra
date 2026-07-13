namespace LeadGenerationCrm.Contracts.Campaigns;

public sealed record CampaignAssetResponse(
    Guid Id,
    string FileName,
    string ContentType,
    long SizeBytes,
    string? AltText,
    string Url,
    DateTimeOffset CreatedAt);

public sealed record CreateCampaignAssetFromQrRequest(
    Guid ActivityId,
    string? AltText);

public sealed record SendTestCampaignEmailRequest(
    string Subject,
    string Body,
    string? BodyFormat = null);

public sealed record SendTestCampaignEmailResponse(
    bool Success,
    string? FailureReason);
