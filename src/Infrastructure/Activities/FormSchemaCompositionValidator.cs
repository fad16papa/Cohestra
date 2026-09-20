using Cohestra.Domain.Activities;

namespace Cohestra.Infrastructure.Activities;

internal static class FormSchemaCompositionValidator
{
    private const int MaxCompositionNodes = 120;
    private const int MaxNestDepth = 3;
    private const int MaxSectionTitleLength = 200;
    private const int MaxSectionDescriptionLength = 2000;
    private const int MaxContentTextLength = 4000;

    public static string? Validate(ActivityFormSchema schema)
    {
        if (!FormSchemaCompositionNormalizer.HasStoredComposition(schema))
        {
            return null;
        }

        var fieldIds = new HashSet<string>(
            schema.Fields.Select(field => field.Id),
            StringComparer.Ordinal);
        var nodeIds = new HashSet<string>(StringComparer.Ordinal);
        var referencedFieldIds = new HashSet<string>(StringComparer.Ordinal);
        var nodeCount = 0;

        string? Walk(IReadOnlyList<FormCompositionNode> nodes, int depth)
        {
            if (depth > MaxNestDepth)
            {
                return "Form composition exceeds maximum nesting depth.";
            }

            foreach (var node in nodes)
            {
                nodeCount++;
                if (nodeCount > MaxCompositionNodes)
                {
                    return $"Form composition cannot contain more than {MaxCompositionNodes} nodes.";
                }

                if (string.IsNullOrWhiteSpace(node.Id))
                {
                    return "Composition node id is required.";
                }

                var id = node.Id.Trim();
                if (!nodeIds.Add(id))
                {
                    return $"Duplicate composition node id '{id}'.";
                }

                var kind = node.Kind?.Trim() ?? string.Empty;
                switch (kind)
                {
                    case FormCompositionKinds.FieldRef:
                    {
                        var fieldId = node.FieldId?.Trim();
                        if (string.IsNullOrEmpty(fieldId))
                        {
                            return $"Composition node '{id}' fieldRef requires fieldId.";
                        }

                        if (!fieldIds.Contains(fieldId))
                        {
                            return $"Composition node '{id}' references unknown field '{fieldId}'.";
                        }

                        referencedFieldIds.Add(fieldId);
                        break;
                    }
                    case FormCompositionKinds.Content:
                        if (ValidateContentNode(node, id) is { } contentError)
                        {
                            return contentError;
                        }

                        break;
                    case FormCompositionKinds.Section:
                        if (node.Title is { Length: > MaxSectionTitleLength })
                        {
                            return $"Section title cannot exceed {MaxSectionTitleLength} characters.";
                        }

                        if (node.Description is { Length: > MaxSectionDescriptionLength })
                        {
                            return $"Section description cannot exceed {MaxSectionDescriptionLength} characters.";
                        }

                        if (node.Children is not { Count: > 0 })
                        {
                            return $"Section node '{id}' requires at least one child.";
                        }

                        if (Walk(node.Children, depth + 1) is { } sectionError)
                        {
                            return sectionError;
                        }

                        break;
                    case FormCompositionKinds.Columns:
                        if (node.Columns is not { Count: 2 })
                        {
                            return $"Columns node '{id}' must define exactly two columns.";
                        }

                        foreach (var column in node.Columns)
                        {
                            if (column is null || column.Count == 0)
                            {
                                return $"Columns node '{id}' cannot contain an empty column.";
                            }

                            if (Walk(column, depth + 1) is { } columnError)
                            {
                                return columnError;
                            }
                        }

                        break;
                    case FormCompositionKinds.Domain:
                        if (ValidateDomainNode(node, id) is { } domainError)
                        {
                            return domainError;
                        }

                        break;
                    default:
                        return $"Unsupported composition kind '{kind}'.";
                }
            }

            return null;
        }

        var rootError = Walk(schema.Composition!, depth: 1);
        if (rootError is not null)
        {
            return rootError;
        }

        foreach (var field in schema.Fields)
        {
            if (IsNonInputPresentationField(field.Type))
            {
                continue;
            }

            if (!referencedFieldIds.Contains(field.Id))
            {
                return $"Field '{field.Id}' is not referenced in composition.";
            }
        }

        return null;
    }

    private static bool IsNonInputPresentationField(string type) =>
        type is FormFieldTypes.SectionHeader or FormFieldTypes.Info;

    private static string? ValidateContentNode(FormCompositionNode node, string id)
    {
        var contentType = node.ContentType?.Trim() ?? string.Empty;
        switch (contentType)
        {
            case FormCompositionContentTypes.Heading:
            case FormCompositionContentTypes.Paragraph:
                if (node.Content?.Text is not { } text || string.IsNullOrWhiteSpace(text))
                {
                    return $"Content node '{id}' requires text.";
                }

                if (text.Length > MaxContentTextLength)
                {
                    return $"Content text cannot exceed {MaxContentTextLength} characters.";
                }

                if (contentType == FormCompositionContentTypes.Heading)
                {
                    var level = node.Content?.Level ?? 2;
                    if (level is < 2 or > 4)
                    {
                        return $"Heading level must be between 2 and 4.";
                    }
                }

                return null;
            case FormCompositionContentTypes.Divider:
                return null;
            case FormCompositionContentTypes.Image:
                if (string.IsNullOrWhiteSpace(node.Content?.ImageUrl))
                {
                    return $"Image content node '{id}' requires imageUrl.";
                }

                return null;
            default:
                return $"Unsupported content type '{contentType}'.";
        }
    }

    private static string? ValidateDomainNode(FormCompositionNode node, string id)
    {
        var domain = node.Domain?.Trim() ?? string.Empty;
        return domain switch
        {
            FormCompositionDomainTypes.ActivityDetails => null,
            FormCompositionDomainTypes.CommunityIdentity => null,
            FormCompositionDomainTypes.CapacityStatus => null,
            _ => $"Unsupported domain block '{domain}' on node '{id}'.",
        };
    }
}
