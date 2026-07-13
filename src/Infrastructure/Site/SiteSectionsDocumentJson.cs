using System.Text.Json;
using System.Text.Json.Serialization;
using Cohestra.Domain.Site;

namespace Cohestra.Infrastructure.Site;

internal static class SiteSectionsDocumentJson
{
    internal static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    internal static string Serialize(SiteSectionsDocument document) =>
        JsonSerializer.Serialize(document, SerializerOptions);

    internal static bool DocumentsEqual(SiteSectionsDocument? left, SiteSectionsDocument? right)
    {
        if (left is null && right is null)
        {
            return true;
        }

        if (left is null || right is null)
        {
            return false;
        }

        return Serialize(left) == Serialize(right);
    }
}
