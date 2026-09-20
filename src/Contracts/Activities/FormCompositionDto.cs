namespace Cohestra.Contracts.Activities;

public sealed record FormCompositionContentPropsDto(
    string? Text = null,
    int? Level = null,
    string? ImageUrl = null,
    string? Alt = null);

public sealed record FormCompositionNodeDto(
    string Id,
    string Kind,
    string? FieldId = null,
    string? ContentType = null,
    FormCompositionContentPropsDto? Content = null,
    string? Title = null,
    string? Description = null,
    IReadOnlyList<FormCompositionNodeDto>? Children = null,
    IReadOnlyList<IReadOnlyList<FormCompositionNodeDto>>? Columns = null,
    string? Domain = null);
