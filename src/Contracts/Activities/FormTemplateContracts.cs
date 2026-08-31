namespace Cohestra.Contracts.Activities;

public sealed record FormTemplateSummaryResponse(
    Guid Id,
    string Name,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record FormTemplateResponse(
    Guid Id,
    string Name,
    ActivityFormSchemaDto FormSchema,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record FormTemplateUsageResponse(int Used, int Limit);

public sealed record FormTemplateListResponse(
    IReadOnlyList<FormTemplateSummaryResponse> Templates,
    FormTemplateUsageResponse Usage);

public sealed record CreateFormTemplateRequest(string Name, ActivityFormSchemaDto FormSchema);

public sealed record UpdateFormTemplateRequest(
    string? Name,
    ActivityFormSchemaDto? FormSchema);
