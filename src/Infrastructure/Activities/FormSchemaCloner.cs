using System.Text.Json;
using Cohestra.Domain.Activities;

namespace Cohestra.Infrastructure.Activities;

internal static class FormSchemaCloner
{
    public static ActivityFormSchema Clone(ActivityFormSchema schema)
    {
        var json = JsonSerializer.Serialize(schema, ActivityFormSchemaJson.SerializerOptions);
        var cloned = JsonSerializer.Deserialize<ActivityFormSchema>(json, ActivityFormSchemaJson.SerializerOptions);
        if (cloned is null)
        {
            throw new InvalidOperationException("Form schema could not be cloned.");
        }

        return cloned;
    }
}
