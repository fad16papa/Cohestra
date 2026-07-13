using LeadGenerationCrm.Contracts.Activities;
using LeadGenerationCrm.Domain.Activities;

namespace LeadGenerationCrm.Infrastructure.Activities;

internal static class FormSchemaMapper
{
    public static ActivityFormSchemaDto? ToDto(ActivityFormSchema? schema)
    {
        if (schema is null)
        {
            return null;
        }

        return new ActivityFormSchemaDto(
            schema.Version,
            schema.Fields
                .Select(field => new FormFieldDefinitionDto(
                    field.Id,
                    field.Type,
                    field.Label,
                    field.Required,
                    field.Placeholder,
                    field.Options?
                        .Select(option => new FormFieldOptionDto(option.Value, option.Label))
                        .ToList(),
                    field.ConsentText,
                    field.PhoneCountry))
                .ToList());
    }
}
