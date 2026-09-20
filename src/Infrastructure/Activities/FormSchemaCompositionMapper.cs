using Cohestra.Contracts.Activities;
using Cohestra.Domain.Activities;

namespace Cohestra.Infrastructure.Activities;

internal static class FormSchemaCompositionMapper
{
    public static List<FormCompositionNode> MapToDomain(IReadOnlyList<FormCompositionNodeDto> nodes) =>
        nodes.Select(MapNodeToDomain).ToList();

    public static List<FormCompositionNodeDto> MapToDto(IReadOnlyList<FormCompositionNode> nodes) =>
        nodes.Select(MapNodeToDto).ToList();

    private static FormCompositionNode MapNodeToDomain(FormCompositionNodeDto node) =>
        new()
        {
            Id = node.Id.Trim(),
            Kind = node.Kind.Trim(),
            FieldId = TrimOptional(node.FieldId),
            ContentType = TrimOptional(node.ContentType),
            Content = node.Content is null
                ? null
                : new FormCompositionContentProps
                {
                    Text = TrimOptional(node.Content.Text),
                    Level = node.Content.Level,
                    ImageUrl = TrimOptional(node.Content.ImageUrl),
                    Alt = TrimOptional(node.Content.Alt),
                },
            Title = TrimOptional(node.Title),
            Description = TrimOptional(node.Description),
            Children = node.Children?.Select(MapNodeToDomain).ToList(),
            Columns = node.Columns?
                .Select(column => column.Select(MapNodeToDomain).ToList())
                .ToList(),
            Domain = TrimOptional(node.Domain),
        };

    private static FormCompositionNodeDto MapNodeToDto(FormCompositionNode node) =>
        new(
            node.Id,
            node.Kind,
            node.FieldId,
            node.ContentType,
            node.Content is null
                ? null
                : new FormCompositionContentPropsDto(
                    node.Content.Text,
                    node.Content.Level,
                    node.Content.ImageUrl,
                    node.Content.Alt),
            node.Title,
            node.Description,
            node.Children?.Select(MapNodeToDto).ToList(),
            node.Columns?
                .Select(column => (IReadOnlyList<FormCompositionNodeDto>)column.Select(MapNodeToDto).ToList())
                .ToList(),
            node.Domain);

    private static string? TrimOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
