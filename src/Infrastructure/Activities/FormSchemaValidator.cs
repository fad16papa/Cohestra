using System.Text.RegularExpressions;
using Cohestra.Contracts.Activities;
using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Registrations;

namespace Cohestra.Infrastructure.Activities;

internal static partial class FormSchemaValidator
{
    private const int MaxFields = 50;
    private const int MaxLabelLength = 200;
    private const int MaxPlaceholderLength = 200;
    private const int MaxConsentTextLength = 2000;
    private const int MaxOptionCount = 50;

    private const int MaxIntroMarkdownLength = 4000;
    private const int MaxClosedMessageLength = 2000;

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

        if (schema.Meta?.IntroMarkdown is { Length: > MaxIntroMarkdownLength } intro)
        {
            return $"Intro copy cannot exceed {MaxIntroMarkdownLength} characters.";
        }

        if (schema.Meta?.SuccessCopyMarkdown is { Length: > RegistrationPipingTokenSubstitutor.MaxSuccessCopyLength })
        {
            return $"Success copy cannot exceed {RegistrationPipingTokenSubstitutor.MaxSuccessCopyLength} characters.";
        }

        if (schema.Meta?.ConfirmationEmailSubject is { Length: > RegistrationPipingTokenSubstitutor.MaxConfirmationSubjectLength })
        {
            return $"Confirmation email subject cannot exceed {RegistrationPipingTokenSubstitutor.MaxConfirmationSubjectLength} characters.";
        }

        if (schema.Meta?.ConfirmationEmailSubject is { } confirmationSubject &&
            (confirmationSubject.Contains('\r')
             || confirmationSubject.Contains('\n')
             || confirmationSubject.Contains('\u2028')
             || confirmationSubject.Contains('\u2029')))
        {
            return "Confirmation email subject cannot contain line breaks.";
        }

        if (schema.Meta?.ConfirmationEmailBodyMarkdown is { Length: > RegistrationPipingTokenSubstitutor.MaxConfirmationBodyLength })
        {
            return $"Confirmation email body cannot exceed {RegistrationPipingTokenSubstitutor.MaxConfirmationBodyLength} characters.";
        }

        if (schema.Meta?.ClosedMessage is { Length: > MaxClosedMessageLength })
        {
            return $"Closed message cannot exceed {MaxClosedMessageLength} characters.";
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

        var recipeError = VisibleWhenEvaluator.ValidateGraph(schema);
        if (recipeError is not null)
        {
            return recipeError;
        }

        if (schema.Meta is { SplitIntoSteps: true })
        {
            foreach (var field in schema.Fields)
            {
                if (string.IsNullOrWhiteSpace(field.Step))
                {
                    continue;
                }

                if (!FormFieldSteps.All.Contains(field.Step))
                {
                    return $"Field '{field.Id}' step must be identity, details, or consent.";
                }
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
            Meta = schema.Meta is null
                ? null
                : new FormSchemaMeta
                {
                    IntroMarkdown = string.IsNullOrWhiteSpace(schema.Meta.IntroMarkdown)
                        ? null
                        : schema.Meta.IntroMarkdown.Trim(),
                    SplitIntoSteps = schema.Meta.SplitIntoSteps,
                    SuccessCopyMarkdown = TrimOptionalMeta(schema.Meta.SuccessCopyMarkdown),
                    ConfirmationEmailSubject = TrimOptionalMeta(schema.Meta.ConfirmationEmailSubject),
                    ConfirmationEmailBodyMarkdown = TrimOptionalMeta(schema.Meta.ConfirmationEmailBodyMarkdown),
                    ClosedMessage = TrimOptionalMeta(schema.Meta.ClosedMessage),
                },
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
                    PhoneCountry = field.Type is FormFieldTypes.Phone or FormFieldTypes.Emergency
                        ? string.IsNullOrWhiteSpace(field.PhoneCountry)
                            ? PhoneCountrySupport.DefaultPhoneCountryIsoCode
                            : field.PhoneCountry.Trim().ToUpperInvariant()
                        : string.IsNullOrWhiteSpace(field.PhoneCountry)
                            ? null
                            : field.PhoneCountry.Trim().ToUpperInvariant(),
                    VisibleWhen = MapVisibleWhen(field.VisibleWhen),
                    Step = string.IsNullOrWhiteSpace(field.Step)
                        ? null
                        : field.Step.Trim().ToLowerInvariant(),
                    DefaultValue = MapDefaultValue(field),
                    Min = field.Min,
                    Max = field.Max,
                    InfoText = MapInfoText(field),
                })
                .ToList(),
        };
    }

    private static string? MapInfoText(FormFieldDefinitionDto field)
    {
        if (string.IsNullOrWhiteSpace(field.InfoText))
        {
            return null;
        }

        if (field.Type.Trim() != FormFieldTypes.Info)
        {
            return field.InfoText.Trim();
        }

        return HiddenValueSanitizer.Sanitize(field.InfoText) is { Length: > 0 } sanitized
            ? sanitized
            : null;
    }

    private static string? MapDefaultValue(FormFieldDefinitionDto field)
    {
        if (string.IsNullOrWhiteSpace(field.DefaultValue))
        {
            return null;
        }

        if (field.Type.Trim() != FormFieldTypes.Hidden)
        {
            return field.DefaultValue.Trim();
        }

        return HiddenValueSanitizer.Sanitize(field.DefaultValue) is { Length: > 0 } sanitized
            ? sanitized
            : null;
    }

    private static FormFieldVisibleWhen? MapVisibleWhen(FormFieldVisibleWhenDto? rule)
    {
        if (rule is null || string.IsNullOrWhiteSpace(rule.FieldId))
        {
            return null;
        }

        return new FormFieldVisibleWhen
        {
            FieldId = rule.FieldId.Trim(),
            EqualsValue = string.IsNullOrWhiteSpace(rule.EqualsValue)
                ? null
                : rule.EqualsValue.Trim(),
            NotEqualsValue = string.IsNullOrWhiteSpace(rule.NotEqualsValue)
                ? null
                : rule.NotEqualsValue.Trim(),
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
            return $"{fieldPath}.type must be one of: text, phone, email, select, checkbox, consent, referral_source, section_header, hidden, textarea, date, number, url, time, choice, yes_no, multi_choice, info, country, scale, emergency.";
        }

        if (field.Type != FormFieldTypes.Hidden && field.DefaultValue is not null)
        {
            return $"{fieldPath}.defaultValue is only allowed for hidden fields.";
        }

        if (field.Type is FormFieldTypes.Number or FormFieldTypes.MultiChoice)
        {
            var boundError = ValidateMinMax(field, fieldPath);
            if (boundError is not null)
            {
                return boundError;
            }
        }
        else if (field.Min is not null || field.Max is not null)
        {
            return $"{fieldPath}.min/max is only allowed for number and multi_choice fields.";
        }

        if (field.Type != FormFieldTypes.Info && !string.IsNullOrWhiteSpace(field.InfoText))
        {
            return $"{fieldPath}.infoText is only allowed for info fields.";
        }

        if (field.Type == FormFieldTypes.Hidden)
        {
            return ValidateHiddenField(field, fieldPath);
        }

        if (field.Type == FormFieldTypes.Info)
        {
            return ValidateInfoField(field, fieldPath);
        }

        if (field.Type == FormFieldTypes.Scale)
        {
            return ValidateScaleField(field, fieldPath);
        }

        if (field.Type == FormFieldTypes.Emergency)
        {
            return ValidateEmergencyField(field, fieldPath);
        }

        if (field.Type == FormFieldTypes.SectionHeader)
        {
            if (string.IsNullOrWhiteSpace(field.Label))
            {
                return $"{fieldPath}.label is required for section_header fields.";
            }

            if (field.Label.Length > MaxLabelLength)
            {
                return $"{fieldPath}.label cannot exceed {MaxLabelLength} characters.";
            }

            if (field.Required)
            {
                return $"{fieldPath}.required must be false for section_header fields.";
            }

            if (field.Placeholder is not null)
            {
                return $"{fieldPath}.placeholder is not allowed for section_header fields.";
            }

            if (field.Options is { Count: > 0 })
            {
                return $"{fieldPath}.options is not allowed for section_header fields.";
            }

            if (!string.IsNullOrWhiteSpace(field.ConsentText))
            {
                return $"{fieldPath}.consentText is not allowed for section_header fields.";
            }

            if (!string.IsNullOrWhiteSpace(field.PhoneCountry))
            {
                return $"{fieldPath}.phoneCountry is not allowed for section_header fields.";
            }

            return null;
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

        if (field.Type is FormFieldTypes.Select or FormFieldTypes.ReferralSource
            or FormFieldTypes.Choice or FormFieldTypes.MultiChoice)
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
            return $"{fieldPath}.options is only allowed for select, referral_source, choice, and multi_choice fields.";
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

        if (field.Type is FormFieldTypes.Phone or FormFieldTypes.Emergency)
        {
            if (!string.IsNullOrWhiteSpace(field.PhoneCountry) &&
                !PhoneCountrySupport.IsSupportedIsoCode(field.PhoneCountry))
            {
                return $"{fieldPath}.phoneCountry must be a supported ISO country code (e.g. SG, PH).";
            }
        }
        else if (!string.IsNullOrWhiteSpace(field.PhoneCountry))
        {
            return $"{fieldPath}.phoneCountry is only allowed for phone and emergency fields.";
        }

        return null;
    }

    private static string? ValidateMinMax(FormFieldDefinition field, string fieldPath)
    {
        if (field.Min is { } min && field.Max is { } max && min > max)
        {
            return $"{fieldPath}.min cannot be greater than max.";
        }

        if (field.Type == FormFieldTypes.MultiChoice)
        {
            if (field.Min is { } minCount && (minCount < 0 || minCount != decimal.Truncate(minCount)))
            {
                return $"{fieldPath}.min must be a whole number of 0 or more for multi_choice fields.";
            }

            if (field.Max is { } maxCount && (maxCount < 0 || maxCount != decimal.Truncate(maxCount)))
            {
                return $"{fieldPath}.max must be a whole number of 0 or more for multi_choice fields.";
            }

            if (field.Min is { } minSelections &&
                field.Options is { Count: var optionCount } &&
                minSelections > optionCount)
            {
                return $"{fieldPath}.min cannot exceed the number of options.";
            }
        }

        return null;
    }

    private static string? ValidateInfoField(FormFieldDefinition field, string fieldPath)
    {
        if (string.IsNullOrWhiteSpace(field.Label))
        {
            return $"{fieldPath}.label is required for info fields.";
        }

        if (field.Label.Length > MaxLabelLength)
        {
            return $"{fieldPath}.label cannot exceed {MaxLabelLength} characters.";
        }

        if (field.Required)
        {
            return $"{fieldPath}.required must be false for info fields.";
        }

        if (field.Placeholder is not null)
        {
            return $"{fieldPath}.placeholder is not allowed for info fields.";
        }

        if (field.Options is { Count: > 0 })
        {
            return $"{fieldPath}.options is not allowed for info fields.";
        }

        if (!string.IsNullOrWhiteSpace(field.ConsentText))
        {
            return $"{fieldPath}.consentText is not allowed for info fields.";
        }

        if (!string.IsNullOrWhiteSpace(field.PhoneCountry))
        {
            return $"{fieldPath}.phoneCountry is not allowed for info fields.";
        }

        if (field.DefaultValue is not null)
        {
            return $"{fieldPath}.defaultValue is only allowed for hidden fields.";
        }

        var infoText = field.InfoText ?? string.Empty;
        if (infoText.Length > RegistrationAnswerValidator.TextareaMaxLength)
        {
            return $"{fieldPath}.infoText cannot exceed {RegistrationAnswerValidator.TextareaMaxLength} characters.";
        }

        return null;
    }

    private static string? ValidateHiddenField(FormFieldDefinition field, string fieldPath)
    {
        if (string.IsNullOrWhiteSpace(field.Label))
        {
            return $"{fieldPath}.label is required.";
        }

        if (field.Label.Length > MaxLabelLength)
        {
            return $"{fieldPath}.label cannot exceed {MaxLabelLength} characters.";
        }

        if (field.Placeholder is not null)
        {
            return $"{fieldPath}.placeholder is not allowed for hidden fields.";
        }

        if (field.Options is { Count: > 0 })
        {
            return $"{fieldPath}.options is not allowed for hidden fields.";
        }

        if (!string.IsNullOrWhiteSpace(field.ConsentText))
        {
            return $"{fieldPath}.consentText is not allowed for hidden fields.";
        }

        if (!string.IsNullOrWhiteSpace(field.PhoneCountry))
        {
            return $"{fieldPath}.phoneCountry is not allowed for hidden fields.";
        }

        if (field.DefaultValue is not null &&
            HiddenValueSanitizer.Sanitize(field.DefaultValue).Length > HiddenValueSanitizer.MaxLength)
        {
            return $"{fieldPath}.defaultValue cannot exceed {HiddenValueSanitizer.MaxLength} characters.";
        }

        return null;
    }

    private static string? ValidateScaleField(FormFieldDefinition field, string fieldPath)
    {
        if (string.IsNullOrWhiteSpace(field.Label))
        {
            return $"{fieldPath}.label is required for scale fields.";
        }

        if (field.Label.Length > MaxLabelLength)
        {
            return $"{fieldPath}.label cannot exceed {MaxLabelLength} characters.";
        }

        if (field.Placeholder is not null)
        {
            return $"{fieldPath}.placeholder is not allowed for scale fields.";
        }

        if (field.Options is { Count: > 0 })
        {
            return $"{fieldPath}.options is not allowed for scale fields.";
        }

        if (!string.IsNullOrWhiteSpace(field.ConsentText))
        {
            return $"{fieldPath}.consentText is not allowed for scale fields.";
        }

        if (!string.IsNullOrWhiteSpace(field.PhoneCountry))
        {
            return $"{fieldPath}.phoneCountry is not allowed for scale fields.";
        }

        if (field.DefaultValue is not null)
        {
            return $"{fieldPath}.defaultValue is only allowed for hidden fields.";
        }

        if (field.Min is not null || field.Max is not null)
        {
            return $"{fieldPath}.min/max is only allowed for number and multi_choice fields.";
        }

        if (!string.IsNullOrWhiteSpace(field.InfoText))
        {
            return $"{fieldPath}.infoText is only allowed for info fields.";
        }

        return null;
    }

    private static string? ValidateEmergencyField(FormFieldDefinition field, string fieldPath)
    {
        if (string.IsNullOrWhiteSpace(field.Label))
        {
            return $"{fieldPath}.label is required for emergency fields.";
        }

        if (field.Label.Length > MaxLabelLength)
        {
            return $"{fieldPath}.label cannot exceed {MaxLabelLength} characters.";
        }

        if (field.Placeholder is not null)
        {
            return $"{fieldPath}.placeholder is not allowed for emergency fields.";
        }

        if (field.Options is { Count: > 0 })
        {
            return $"{fieldPath}.options is not allowed for emergency fields.";
        }

        if (!string.IsNullOrWhiteSpace(field.ConsentText))
        {
            return $"{fieldPath}.consentText is not allowed for emergency fields.";
        }

        if (field.DefaultValue is not null)
        {
            return $"{fieldPath}.defaultValue is only allowed for hidden fields.";
        }

        if (field.Min is not null || field.Max is not null)
        {
            return $"{fieldPath}.min/max is only allowed for number and multi_choice fields.";
        }

        if (!string.IsNullOrWhiteSpace(field.InfoText))
        {
            return $"{fieldPath}.infoText is only allowed for info fields.";
        }

        if (!string.IsNullOrWhiteSpace(field.PhoneCountry) &&
            !PhoneCountrySupport.IsSupportedIsoCode(field.PhoneCountry))
        {
            return $"{fieldPath}.phoneCountry must be a supported ISO country code (e.g. SG, PH).";
        }

        return null;
    }

    [GeneratedRegex("^[a-z0-9][a-z0-9_-]{0,63}$")]
    private static partial Regex FieldIdRegex();

    private static string? TrimOptionalMeta(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
