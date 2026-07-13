using System.Text.RegularExpressions;
using LeadGenerationCrm.Contracts.Activities;
using LeadGenerationCrm.Domain.Activities;
using LeadGenerationCrm.Infrastructure.Registrations;

namespace LeadGenerationCrm.Infrastructure.Activities;

internal static partial class FormSchemaValidator
{
    private const int MaxFields = 50;
    private const int MaxLabelLength = 200;
    private const int MaxPlaceholderLength = 200;
    private const int MaxConsentTextLength = 2000;
    private const int MaxOptionCount = 50;

    public static string? ValidateDto(ActivityFormSchemaDto? schema)
    {
        if (schema is null)
        {
            return "Form schema is required.";
        }

        if (schema.Fields is null)
        {
            return "fields is required.";
        }

        return ValidateModel(MapToDomain(schema));
    }

    public static string? ValidateModel(ActivityFormSchema schema)
    {
        if (schema.Version != 1)
        {
            return "Form schema version must be 1.";
        }

        if (schema.Fields is null)
        {
            return "fields is required.";
        }

        if (schema.Fields.Count > MaxFields)
        {
            return $"Form schema cannot contain more than {MaxFields} fields.";
        }

        var seenIds = new HashSet<string>(StringComparer.Ordinal);

        for (var index = 0; index < schema.Fields.Count; index++)
        {
            var field = schema.Fields[index];
            var fieldPath = $"fields[{index}]";
            var fieldError = ValidateField(field, fieldPath, seenIds);
            if (fieldError is not null)
            {
                return fieldError;
            }
        }

        return null;
    }

    public static ActivityFormSchema MapToDomain(ActivityFormSchemaDto schema)
    {
        if (schema.Fields is null)
        {
            throw new ArgumentException("fields is required.");
        }

        return new ActivityFormSchema
        {
            Version = schema.Version,
            Fields = schema.Fields
                .Select(field => new FormFieldDefinition
                {
                    Id = field.Id.Trim(),
                    Type = field.Type.Trim(),
                    Label = field.Label.Trim(),
                    Required = field.Required,
                    Placeholder = string.IsNullOrWhiteSpace(field.Placeholder)
                        ? null
                        : field.Placeholder.Trim(),
                    Options = field.Options?
                        .Select(option => new FormFieldOption
                        {
                            Value = option.Value.Trim(),
                            Label = option.Label.Trim(),
                        })
                        .ToList(),
                    ConsentText = string.IsNullOrWhiteSpace(field.ConsentText)
                        ? null
                        : field.ConsentText.Trim(),
                    PhoneCountry = field.Type == FormFieldTypes.Phone
                        ? string.IsNullOrWhiteSpace(field.PhoneCountry)
                            ? PhoneCountrySupport.DefaultPhoneCountryIsoCode
                            : field.PhoneCountry.Trim().ToUpperInvariant()
                        : string.IsNullOrWhiteSpace(field.PhoneCountry)
                            ? null
                            : field.PhoneCountry.Trim().ToUpperInvariant(),
                })
                .ToList(),
        };
    }

    private static string? ValidateField(
        FormFieldDefinition field,
        string fieldPath,
        HashSet<string> seenIds)
    {
        if (string.IsNullOrWhiteSpace(field.Id))
        {
            return $"{fieldPath}.id is required.";
        }

        if (!FieldIdRegex().IsMatch(field.Id))
        {
            return $"{fieldPath}.id must use lowercase letters, numbers, underscores, or hyphens.";
        }

        if (!seenIds.Add(field.Id))
        {
            return $"{fieldPath}.id must be unique within the schema.";
        }

        if (string.IsNullOrWhiteSpace(field.Type) || !FormFieldTypes.All.Contains(field.Type))
        {
            return $"{fieldPath}.type must be one of: text, phone, email, select, checkbox, consent, referral_source.";
        }

        if (string.IsNullOrWhiteSpace(field.Label))
        {
            return $"{fieldPath}.label is required.";
        }

        if (field.Label.Length > MaxLabelLength)
        {
            return $"{fieldPath}.label cannot exceed {MaxLabelLength} characters.";
        }

        if (field.Placeholder is not null && field.Placeholder.Length > MaxPlaceholderLength)
        {
            return $"{fieldPath}.placeholder cannot exceed {MaxPlaceholderLength} characters.";
        }

        if (field.Type is FormFieldTypes.Select or FormFieldTypes.ReferralSource)
        {
            if (field.Options is null || field.Options.Count == 0)
            {
                return $"{fieldPath}.options is required for type '{field.Type}'.";
            }

            if (field.Options.Count > MaxOptionCount)
            {
                return $"{fieldPath}.options cannot contain more than {MaxOptionCount} entries.";
            }

            var seenValues = new HashSet<string>(StringComparer.Ordinal);
            for (var index = 0; index < field.Options.Count; index++)
            {
                var option = field.Options[index];
                var optionPath = $"{fieldPath}.options[{index}]";

                if (string.IsNullOrWhiteSpace(option.Value) ||
                    string.IsNullOrWhiteSpace(option.Label))
                {
                    return $"{optionPath} value and label are required.";
                }

                if (!seenValues.Add(option.Value))
                {
                    return $"{optionPath}.value must be unique within the field.";
                }
            }
        }
        else if (field.Options is { Count: > 0 })
        {
            return $"{fieldPath}.options is only allowed for select and referral_source fields.";
        }

        if (field.Type == FormFieldTypes.Consent)
        {
            if (string.IsNullOrWhiteSpace(field.ConsentText))
            {
                return $"{fieldPath}.consentText is required for consent fields.";
            }

            if (field.ConsentText.Length > MaxConsentTextLength)
            {
                return $"{fieldPath}.consentText cannot exceed {MaxConsentTextLength} characters.";
            }
        }
        else if (!string.IsNullOrWhiteSpace(field.ConsentText))
        {
            return $"{fieldPath}.consentText is only allowed for consent fields.";
        }

        if (field.Type == FormFieldTypes.Phone)
        {
            if (!string.IsNullOrWhiteSpace(field.PhoneCountry) &&
                !PhoneCountrySupport.IsSupportedIsoCode(field.PhoneCountry))
            {
                return $"{fieldPath}.phoneCountry must be a supported ISO country code (e.g. SG, PH).";
            }
        }
        else if (!string.IsNullOrWhiteSpace(field.PhoneCountry))
        {
            return $"{fieldPath}.phoneCountry is only allowed for phone fields.";
        }

        return null;
    }

    [GeneratedRegex("^[a-z0-9][a-z0-9_-]{0,63}$")]
    private static partial Regex FieldIdRegex();
}
