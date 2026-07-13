using System.Text.Json;
using LeadGenerationCrm.Domain.Activities;

namespace LeadGenerationCrm.Infrastructure.Registrations;

internal static class RegistrationAnswerValidator
{
    public static string? Validate(
        ActivityFormSchema? schema,
        IReadOnlyDictionary<string, object?> answers)
    {
        if (schema?.Fields is null || schema.Fields.Count == 0)
        {
            return "This activity is not accepting registrations.";
        }

        foreach (var field in schema.Fields)
        {
            answers.TryGetValue(field.Id, out var rawValue);
            var fieldError = ValidateField(field, rawValue);
            if (fieldError is not null)
            {
                return fieldError;
            }
        }

        return null;
    }

    private static string? ValidateField(FormFieldDefinition field, object? rawValue)
    {
        if (field.Type is FormFieldTypes.Checkbox or FormFieldTypes.Consent)
        {
            if (!TryGetBoolean(rawValue, out var boolValue))
            {
                return field.Required
                    ? $"{field.Label} is required."
                    : null;
            }

            if (field.Required && !boolValue)
            {
                return field.Type == FormFieldTypes.Consent
                    ? "Consent is required."
                    : $"{field.Label} is required.";
            }

            return null;
        }

        if (!TryGetString(rawValue, out var text))
        {
            return field.Required ? $"{field.Label} is required." : null;
        }

        if (field.Required && string.IsNullOrWhiteSpace(text))
        {
            return $"{field.Label} is required.";
        }

        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        if (field.Type == FormFieldTypes.Email && !text.Contains('@', StringComparison.Ordinal))
        {
            return "Enter a valid email address.";
        }

        if (field.Type == FormFieldTypes.Phone)
        {
            var phoneError = PhoneCountrySupport.ValidateLocalMobileNumber(field.PhoneCountry, text);
            if (phoneError is not null)
            {
                return phoneError;
            }
        }

        if (field.Type is FormFieldTypes.Select or FormFieldTypes.ReferralSource)
        {
            var allowedValues = field.Options?
                .Select(option => option.Value)
                .ToHashSet(StringComparer.Ordinal) ?? [];

            if (!allowedValues.Contains(text))
            {
                return $"{field.Label} must be one of the allowed options.";
            }
        }

        return null;
    }

    internal static Dictionary<string, object?> NormalizeAnswers(
        ActivityFormSchema schema,
        IReadOnlyDictionary<string, object?> answers)
    {
        var normalized = new Dictionary<string, object?>(StringComparer.Ordinal);

        foreach (var field in schema.Fields)
        {
            if (!answers.TryGetValue(field.Id, out var rawValue))
            {
                continue;
            }

            if (field.Type is FormFieldTypes.Checkbox or FormFieldTypes.Consent)
            {
                normalized[field.Id] = TryGetBoolean(rawValue, out var boolValue) && boolValue;
                continue;
            }

            if (TryGetString(rawValue, out var text))
            {
                normalized[field.Id] = text.Trim();
            }
        }

        return normalized;
    }

    internal static bool TryGetStringForExtraction(object? rawValue, out string text) =>
        TryGetString(rawValue, out text);

    internal static bool TryGetBooleanForExtraction(object? rawValue, out bool value) =>
        TryGetBoolean(rawValue, out value);

    private static bool TryGetString(object? rawValue, out string text)
    {
        switch (rawValue)
        {
            case null:
                text = string.Empty;
                return false;
            case string stringValue:
                text = stringValue;
                return true;
            case JsonElement jsonElement when jsonElement.ValueKind == JsonValueKind.String:
                text = jsonElement.GetString() ?? string.Empty;
                return true;
            case JsonElement jsonElement when jsonElement.ValueKind == JsonValueKind.Number:
                text = jsonElement.GetRawText();
                return true;
            default:
                text = rawValue.ToString() ?? string.Empty;
                return !string.IsNullOrEmpty(text);
        }
    }

    private static bool TryGetBoolean(object? rawValue, out bool value)
    {
        switch (rawValue)
        {
            case bool boolValue:
                value = boolValue;
                return true;
            case JsonElement jsonElement when jsonElement.ValueKind == JsonValueKind.True:
                value = true;
                return true;
            case JsonElement jsonElement when jsonElement.ValueKind == JsonValueKind.False:
                value = false;
                return true;
            default:
                value = false;
                return false;
        }
    }
}
