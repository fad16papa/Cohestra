using System.Text.Json;
using System.Text.Json.Serialization;
using Cohestra.Domain.Registrations;

namespace Cohestra.Infrastructure.Registrations;

internal static class RegistrationAnswersJson
{
    public static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public static string Serialize(Dictionary<string, object?> answers) =>
        JsonSerializer.Serialize(answers, SerializerOptions);

    public static Dictionary<string, object?> Deserialize(string json) =>
        JsonSerializer.Deserialize<Dictionary<string, object?>>(json, SerializerOptions) ?? [];
}
