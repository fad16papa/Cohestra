namespace LeadGenerationCrm.Contracts.Campaigns;

public sealed record EmailTemplateResponse(
    Guid Id,
    string Name,
    string Subject,
    string Body,
    string BodyFormat,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record EmailTemplateListResponse(
    IReadOnlyList<EmailTemplateResponse> Items);

public sealed record CreateEmailTemplateRequest(
    string Name,
    string Subject,
    string Body,
    string? BodyFormat = null);

public sealed record UpdateEmailTemplateRequest(
    string Name,
    string Subject,
    string Body,
    string? BodyFormat = null);
