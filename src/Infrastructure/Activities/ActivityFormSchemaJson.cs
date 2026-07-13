using System.Text.Json;
using System.Text.Json.Serialization;
using Cohestra.Domain.Activities;

namespace Cohestra.Infrastructure.Activities;

internal static class ActivityFormSchemaJson
{
    internal static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };
}
