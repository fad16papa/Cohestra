using Cohestra.Domain.Activities;

namespace Cohestra.Infrastructure.Activities;

internal static class FormFieldStepAssigner
{
    public static string AutoBucket(FormFieldDefinition field)
    {
        if (field.Type == FormFieldTypes.Consent)
        {
            return FormFieldSteps.Consent;
        }

        if (field.Type is FormFieldTypes.Phone or FormFieldTypes.Email)
        {
            return FormFieldSteps.Identity;
        }

        if (field.Type == FormFieldTypes.Text && LooksLikeName(field.Id))
        {
            return FormFieldSteps.Identity;
        }

        return FormFieldSteps.Details;
    }

    public static void ApplyMissingBuckets(ActivityFormSchema schema)
    {
        if (schema.Meta is not { SplitIntoSteps: true })
        {
            return;
        }

        foreach (var field in schema.Fields)
        {
            if (string.IsNullOrWhiteSpace(field.Step) ||
                !FormFieldSteps.All.Contains(field.Step))
            {
                field.Step = AutoBucket(field);
            }
        }
    }

    private static bool LooksLikeName(string fieldId) =>
        fieldId.Equals("full_name", StringComparison.OrdinalIgnoreCase) ||
        fieldId.Equals("name", StringComparison.OrdinalIgnoreCase) ||
        fieldId.Contains("full_name", StringComparison.OrdinalIgnoreCase);
}
