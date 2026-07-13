using LeadGenerationCrm.Domain.Activities;

namespace LeadGenerationCrm.Infrastructure.Activities;

internal static class PublishGateValidator
{
    public static string? ValidateForPublish(ActivityFormSchema? schema)
    {
        if (schema?.Fields is null || schema.Fields.Count == 0)
        {
            return "Configure the registration form before publishing. Add at least one required phone or email field.";
        }

        var schemaError = FormSchemaValidator.ValidateModel(schema);
        if (schemaError is not null)
        {
            return $"Fix the form schema before publishing: {schemaError}";
        }

        var hasRequiredContactField = schema.Fields.Any(field =>
            field.Required &&
            (field.Type == FormFieldTypes.Phone || field.Type == FormFieldTypes.Email));

        if (!hasRequiredContactField)
        {
            return "Add at least one required phone or email field before publishing.";
        }

        if (schema.Fields.Any(field =>
                field.Type == FormFieldTypes.Consent && !field.Required))
        {
            return "Consent fields must be marked required before publishing.";
        }

        return null;
    }
}
