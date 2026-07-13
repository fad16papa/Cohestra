using System.Text.Json;
using System.Text.Json.Serialization;
using LeadGenerationCrm.Domain.Activities;

namespace LeadGenerationCrm.Infrastructure.Activities;

internal static class ActivityFormSchemaJson
{
    internal static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };
}
