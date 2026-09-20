using Cohestra.Domain.Activities;

namespace Cohestra.Infrastructure.Activities;

internal static class FormSchemaCompositionNormalizer
{
    public const int SupportedSchemaVersionV1 = 1;
    public const int SupportedSchemaVersionV2 = 2;

    /// <summary>
    /// Linear fieldRef node per field — legacy/default composition.
    /// </summary>
    public static List<FormCompositionNode> SynthesizeLinearComposition(
        IReadOnlyList<FormFieldDefinition> fields)
    {
        var nodes = new List<FormCompositionNode>(fields.Count);
        foreach (var field in fields)
        {
            nodes.Add(new FormCompositionNode
            {
                Id = $"field-ref-{field.Id}",
                Kind = FormCompositionKinds.FieldRef,
                FieldId = field.Id,
            });
        }

        return nodes;
    }

    public static bool HasStoredComposition(ActivityFormSchema schema) =>
        schema.Composition is { Count: > 0 };

    /// <summary>
    /// Composition used for rendering and Studio UI (stored or synthesized).
    /// </summary>
    public static IReadOnlyList<FormCompositionNode> GetEffectiveComposition(ActivityFormSchema schema) =>
        HasStoredComposition(schema)
            ? schema.Composition!
            : SynthesizeLinearComposition(schema.Fields);
}
