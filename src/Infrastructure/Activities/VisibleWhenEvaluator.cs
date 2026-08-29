using System.Text.Json;
using Cohestra.Domain.Activities;

namespace Cohestra.Infrastructure.Activities;

internal static class VisibleWhenEvaluator
{
    public static bool IsVisible(
        FormFieldDefinition field,
        ActivityFormSchema schema,
        IReadOnlyDictionary<string, object?> answers)
    {
        if (field.VisibleWhen is null)
        {
            return true;
        }

        if (string.IsNullOrWhiteSpace(field.VisibleWhen.FieldId))
        {
            return false;
        }

        answers.TryGetValue(field.VisibleWhen.FieldId, out var raw);
        var actual = NormalizeComparable(raw);
        var equals = NormalizeComparable(field.VisibleWhen.EqualsValue);
        var notEquals = NormalizeComparable(field.VisibleWhen.NotEqualsValue);

        if (!string.IsNullOrEmpty(equals))
        {
            return string.Equals(actual, equals, StringComparison.Ordinal);
        }

        if (!string.IsNullOrEmpty(notEquals))
        {
            return !string.Equals(actual, notEquals, StringComparison.Ordinal);
        }

        return false;
    }

    public static string? ValidateGraph(ActivityFormSchema schema)
    {
        var ids = schema.Fields
            .Select(field => field.Id)
            .ToHashSet(StringComparer.Ordinal);

        var edges = new Dictionary<string, string>(StringComparer.Ordinal);

        foreach (var field in schema.Fields)
        {
            var rule = field.VisibleWhen;
            if (rule is null)
            {
                continue;
            }

            if (string.IsNullOrWhiteSpace(rule.FieldId))
            {
                return $"fields[{field.Id}].visibleWhen.fieldId is required.";
            }

            if (!ids.Contains(rule.FieldId))
            {
                return $"fields[{field.Id}].visibleWhen.fieldId '{rule.FieldId}' does not match a Field on this Form.";
            }

            if (string.Equals(rule.FieldId, field.Id, StringComparison.Ordinal))
            {
                return $"fields[{field.Id}].visibleWhen cannot reference itself.";
            }

            var hasEquals = !string.IsNullOrWhiteSpace(rule.EqualsValue);
            var hasNotEquals = !string.IsNullOrWhiteSpace(rule.NotEqualsValue);
            if (hasEquals == hasNotEquals)
            {
                return $"fields[{field.Id}].visibleWhen must set exactly one of equals or notEquals.";
            }

            edges[field.Id] = rule.FieldId;
        }

        if (HasCycle(edges))
        {
            return "visibleWhen Recipes cannot form a cycle.";
        }

        return null;
    }

    public static string NormalizeComparable(object? rawValue)
    {
        switch (rawValue)
        {
            case null:
                return string.Empty;
            case bool flag:
                return flag ? "yes" : "no";
            case JsonElement json when json.ValueKind == JsonValueKind.True:
                return "yes";
            case JsonElement json when json.ValueKind == JsonValueKind.False:
                return "no";
            case JsonElement json when json.ValueKind == JsonValueKind.String:
                return NormalizeToken(json.GetString());
            case JsonElement json when json.ValueKind == JsonValueKind.Number:
                return json.GetRawText();
            default:
                return NormalizeToken(rawValue.ToString());
        }
    }

    private static string NormalizeToken(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return string.Empty;
        }

        var trimmed = text.Trim();
        if (trimmed.Equals("true", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Equals("yes", StringComparison.OrdinalIgnoreCase))
        {
            return "yes";
        }

        if (trimmed.Equals("false", StringComparison.OrdinalIgnoreCase) ||
            trimmed.Equals("no", StringComparison.OrdinalIgnoreCase))
        {
            return "no";
        }

        return trimmed;
    }

    private static bool HasCycle(Dictionary<string, string> edges)
    {
        var visiting = new HashSet<string>(StringComparer.Ordinal);
        var visited = new HashSet<string>(StringComparer.Ordinal);

        bool Dfs(string node)
        {
            if (visiting.Contains(node))
            {
                return true;
            }

            if (!visited.Add(node))
            {
                return false;
            }

            visiting.Add(node);
            if (edges.TryGetValue(node, out var next) && Dfs(next))
            {
                return true;
            }

            visiting.Remove(node);
            return false;
        }

        return edges.Keys.Any(Dfs);
    }
}
