using System.Text.Json;
using System.Text.Json.Serialization;

namespace Cohestra.Infrastructure.Activities;

internal static class RegistrationThemeJson
{
    internal static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };
}
