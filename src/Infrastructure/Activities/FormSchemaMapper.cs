using Cohestra.Contracts.Activities;
using Cohestra.Domain.Activities;

namespace Cohestra.Infrastructure.Activities;

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
                    field.PhoneCountry,
                    field.VisibleWhen is null
                        ? null
                        : new FormFieldVisibleWhenDto(
                            field.VisibleWhen.FieldId,
                            field.VisibleWhen.EqualsValue,
                            field.VisibleWhen.NotEqualsValue),
                    field.Step,
                    field.DefaultValue,
                    field.Min,
                    field.Max,
                    field.InfoText))
                .ToList(),
            schema.Meta is null
                ? null
                : new FormSchemaMetaDto(
                    schema.Meta.IntroMarkdown,
                    schema.Meta.SplitIntoSteps,
                    schema.Meta.SuccessCopyMarkdown,
                    schema.Meta.ConfirmationEmailSubject,
                    schema.Meta.ConfirmationEmailBodyMarkdown));
    }
}
