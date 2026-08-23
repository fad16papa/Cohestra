using System.Text.Json;
using System.Text.Json.Serialization;

namespace Cohestra.Infrastructure.Billing;

internal static class PaddleJson
{
    internal static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    internal static Dictionary<string, string> ReadCustomData(JsonElement element)
    {
        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (element.ValueKind != JsonValueKind.Object)
        {
            return map;
        }

        foreach (var property in element.EnumerateObject())
        {
            map[property.Name] = property.Value.ValueKind switch
            {
                JsonValueKind.String => property.Value.GetString() ?? string.Empty,
                JsonValueKind.Number => property.Value.GetRawText(),
                JsonValueKind.True => "true",
                JsonValueKind.False => "false",
                JsonValueKind.Null => string.Empty,
                _ => property.Value.GetRawText(),
            };
        }

        return map;
    }

    internal static bool TryGetGuid(Dictionary<string, string> data, string key, out Guid value)
    {
        value = Guid.Empty;
        return data.TryGetValue(key, out var raw)
            && Guid.TryParse(raw, out value);
    }
}
