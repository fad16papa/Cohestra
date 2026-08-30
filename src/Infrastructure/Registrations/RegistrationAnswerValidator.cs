using System.Globalization;
using System.Text.Json;
using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Activities;

namespace Cohestra.Infrastructure.Registrations;

internal static class RegistrationAnswerValidator
{
    internal const int TextareaMaxLength = 2000;
    private const string DateFormat = "yyyy-MM-dd";
    private const string TimeFormat = "HH:mm";

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
            if (FormFieldTypes.NonInput.Contains(field.Type))
            {
                continue;
            }

            if (!VisibleWhenEvaluator.IsVisible(field, schema, answers))
            {
                continue;
            }

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
        if (FormFieldTypes.NonInput.Contains(field.Type))
        {
            return null;
        }

        if (field.Type == FormFieldTypes.Hidden)
        {
            if (!TryGetString(rawValue, out var hiddenText) || string.IsNullOrWhiteSpace(hiddenText))
            {
                return null;
            }

            var sanitized = HiddenValueSanitizer.Sanitize(hiddenText);
            if (sanitized.Length > HiddenValueSanitizer.MaxLength)
            {
                return $"{field.Label} cannot exceed {HiddenValueSanitizer.MaxLength} characters.";
            }

            return null;
        }

        if (field.Type is FormFieldTypes.Checkbox or FormFieldTypes.Consent or FormFieldTypes.YesNo)
        {
            if (!TryGetBoolean(rawValue, out var boolValue))
            {
                return field.Required
                    ? $"{field.Label} is required."
                    : null;
            }

            if (field.Type == FormFieldTypes.YesNo)
            {
                return null;
            }

            if (field.Required && !boolValue)
            {
                return field.Type == FormFieldTypes.Consent
                    ? "Consent is required."
                    : $"{field.Label} is required.";
            }

            return null;
        }

        if (field.Type == FormFieldTypes.MultiChoice)
        {
            return ValidateMultiChoice(field, rawValue);
        }

        if (field.Type == FormFieldTypes.Scale)
        {
            return ValidateScale(field, rawValue);
        }

        if (field.Type == FormFieldTypes.Emergency)
        {
            return ValidateEmergency(field, rawValue);
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

        if (field.Type is FormFieldTypes.Select or FormFieldTypes.ReferralSource or FormFieldTypes.Choice)
        {
            var allowedValues = field.Options?
                .Select(option => option.Value)
                .ToHashSet(StringComparer.Ordinal) ?? [];

            if (!allowedValues.Contains(text))
            {
                return $"{field.Label} must be one of the allowed options.";
            }
        }

        if (field.Type == FormFieldTypes.Textarea)
        {
            var sanitized = HiddenValueSanitizer.Sanitize(text);
            if (string.IsNullOrWhiteSpace(sanitized))
            {
                return field.Required ? $"{field.Label} is required." : null;
            }

            if (sanitized.Length > TextareaMaxLength)
            {
                return $"{field.Label} cannot exceed {TextareaMaxLength} characters.";
            }
        }

        if (field.Type == FormFieldTypes.Date && !TryParseIsoDate(text, out _))
        {
            return $"{field.Label} must be a valid date (YYYY-MM-DD).";
        }

        if (field.Type == FormFieldTypes.Number)
        {
            return ValidateNumber(field, text);
        }

        if (field.Type == FormFieldTypes.Url && !IsHttpUrl(text))
        {
            return $"{field.Label} must be an http or https URL.";
        }

        if (field.Type == FormFieldTypes.Time && !TryParseIsoTime(text, out _))
        {
            return $"{field.Label} must be a valid time (HH:mm).";
        }

        if (field.Type == FormFieldTypes.Country && !PhoneCountrySupport.IsSupportedIsoCode(text))
        {
            return $"{field.Label} must be a supported country.";
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
            if (FormFieldTypes.NonInput.Contains(field.Type))
            {
                continue;
            }

            if (!VisibleWhenEvaluator.IsVisible(field, schema, answers))
            {
                continue;
            }

            if (field.Type == FormFieldTypes.Hidden)
            {
                string? candidate = null;
                if (answers.TryGetValue(field.Id, out var hiddenRaw) &&
                    TryGetString(hiddenRaw, out var hiddenText) &&
                    !string.IsNullOrWhiteSpace(hiddenText))
                {
                    candidate = hiddenText;
                }

                var sanitized = HiddenValueSanitizer.Sanitize(candidate);
                if (string.IsNullOrEmpty(sanitized))
                {
                    sanitized = HiddenValueSanitizer.Sanitize(field.DefaultValue);
                }

                if (string.IsNullOrEmpty(sanitized))
                {
                    continue;
                }

                normalized[field.Id] = sanitized;
                continue;
            }

            if (!answers.TryGetValue(field.Id, out var rawValue))
            {
                continue;
            }

            if (field.Type is FormFieldTypes.Checkbox or FormFieldTypes.Consent or FormFieldTypes.YesNo)
            {
                if (field.Type == FormFieldTypes.YesNo)
                {
                    if (TryGetBoolean(rawValue, out var yesNo))
                    {
                        normalized[field.Id] = yesNo;
                    }

                    continue;
                }

                normalized[field.Id] = TryGetBoolean(rawValue, out var boolValue) && boolValue;
                continue;
            }

            if (field.Type == FormFieldTypes.MultiChoice)
            {
                if (!TryGetStringList(rawValue, out var selected) || selected.Count == 0)
                {
                    continue;
                }

                normalized[field.Id] = selected;
                continue;
            }

            if (field.Type == FormFieldTypes.Scale)
            {
                if (TryGetString(rawValue, out var scaleText) &&
                    ScaleFieldSupport.IsValidValue(scaleText))
                {
                    normalized[field.Id] = scaleText.Trim();
                }

                continue;
            }

            if (field.Type == FormFieldTypes.Emergency)
            {
                if (TryGetEmergencyAnswer(rawValue, out var emergency) &&
                    (!string.IsNullOrWhiteSpace(emergency.Name) ||
                     !string.IsNullOrWhiteSpace(emergency.Phone)))
                {
                    normalized[field.Id] = new Dictionary<string, string?>(StringComparer.Ordinal)
                    {
                        [EmergencyFieldSupport.NameKey] = string.IsNullOrWhiteSpace(emergency.Name)
                            ? null
                            : emergency.Name.Trim(),
                        [EmergencyFieldSupport.PhoneKey] = string.IsNullOrWhiteSpace(emergency.Phone)
                            ? null
                            : emergency.Phone.Trim(),
                    };
                }

                continue;
            }

            if (TryGetString(rawValue, out var text))
            {
                if (field.Type == FormFieldTypes.Textarea)
                {
                    var sanitized = HiddenValueSanitizer.Sanitize(text);
                    if (string.IsNullOrEmpty(sanitized))
                    {
                        continue;
                    }

                    normalized[field.Id] = sanitized;
                    continue;
                }

                if (field.Type == FormFieldTypes.Date)
                {
                    if (!TryParseIsoDate(text, out var date))
                    {
                        continue;
                    }

                    normalized[field.Id] = date.ToString(DateFormat, CultureInfo.InvariantCulture);
                    continue;
                }

                if (field.Type == FormFieldTypes.Number)
                {
                    if (!TryParseNumber(text, out var number))
                    {
                        continue;
                    }

                    normalized[field.Id] = number.ToString(CultureInfo.InvariantCulture);
                    continue;
                }

                if (field.Type == FormFieldTypes.Time)
                {
                    if (!TryParseIsoTime(text, out var time))
                    {
                        continue;
                    }

                    normalized[field.Id] = time.ToString(TimeFormat, CultureInfo.InvariantCulture);
                    continue;
                }

                if (field.Type == FormFieldTypes.Country)
                {
                    normalized[field.Id] = text.Trim().ToUpperInvariant();
                    continue;
                }

                if (field.Type == FormFieldTypes.Url)
                {
                    normalized[field.Id] = text.Trim();
                    continue;
                }

                normalized[field.Id] = text.Trim();
            }
        }

        return normalized;
    }

    private static string? ValidateNumber(FormFieldDefinition field, string text)
    {
        if (!TryParseNumber(text, out var number))
        {
            return $"{field.Label} must be a number.";
        }

        if (field.Min is { } min && number < min)
        {
            return $"{field.Label} must be at least {min.ToString(CultureInfo.InvariantCulture)}.";
        }

        if (field.Max is { } max && number > max)
        {
            return $"{field.Label} must be at most {max.ToString(CultureInfo.InvariantCulture)}.";
        }

        return null;
    }

    private static string? ValidateMultiChoice(FormFieldDefinition field, object? rawValue)
    {
        if (!TryGetStringList(rawValue, out var selected))
        {
            return field.Required ? $"{field.Label} is required." : null;
        }

        if (selected.Count == 0)
        {
            return field.Required ? $"{field.Label} is required." : null;
        }

        var allowedValues = field.Options?
            .Select(option => option.Value)
            .ToHashSet(StringComparer.Ordinal) ?? [];

        if (selected.Any(value => !allowedValues.Contains(value)))
        {
            return $"{field.Label} must be one of the allowed options.";
        }

        if (field.Min is { } min && selected.Count < min)
        {
            return $"{field.Label} requires at least {min.ToString(CultureInfo.InvariantCulture)} selections.";
        }

        if (field.Max is { } max && selected.Count > max)
        {
            return $"{field.Label} allows at most {max.ToString(CultureInfo.InvariantCulture)} selections.";
        }

        return null;
    }

    private static string? ValidateScale(FormFieldDefinition field, object? rawValue)
    {
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

        if (!ScaleFieldSupport.IsValidValue(text))
        {
            return $"{field.Label} must be a value from 1 to 5.";
        }

        return null;
    }

    private static string? ValidateEmergency(FormFieldDefinition field, object? rawValue)
    {
        if (!TryGetEmergencyAnswer(rawValue, out var emergency))
        {
            return field.Required ? $"{field.Label} is required." : null;
        }

        var name = emergency.Name.Trim();
        var phone = emergency.Phone.Trim();
        var hasName = name.Length > 0;
        var hasPhone = phone.Length > 0;

        if (field.Required && (!hasName || !hasPhone))
        {
            return $"{field.Label} is required.";
        }

        if (!hasName && !hasPhone)
        {
            return null;
        }

        if (hasName && name.Length > EmergencyFieldSupport.MaxNameLength)
        {
            return $"{field.Label} name cannot exceed {EmergencyFieldSupport.MaxNameLength} characters.";
        }

        if (hasPhone)
        {
            var phoneError = PhoneCountrySupport.ValidateLocalMobileNumber(field.PhoneCountry, phone);
            if (phoneError is not null)
            {
                return phoneError;
            }
        }

        return null;
    }

    private static bool TryParseNumber(string text, out decimal number) =>
        decimal.TryParse(
            text.Trim(),
            NumberStyles.Number,
            CultureInfo.InvariantCulture,
            out number);

    private static bool IsHttpUrl(string text)
    {
        return Uri.TryCreate(text.Trim(), UriKind.Absolute, out var uri) &&
               (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }

    private static bool TryParseIsoTime(string text, out TimeOnly time) =>
        TimeOnly.TryParseExact(
            text.Trim(),
            TimeFormat,
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out time);

    private sealed record EmergencyAnswer(string Name, string Phone);

    private static bool TryGetEmergencyAnswer(object? rawValue, out EmergencyAnswer answer)
    {
        answer = new EmergencyAnswer(string.Empty, string.Empty);

        switch (rawValue)
        {
            case null:
                return false;
            case EmergencyAnswer emergency:
                answer = emergency;
                return true;
            case IReadOnlyDictionary<string, object?> dictionary:
                dictionary.TryGetValue(EmergencyFieldSupport.NameKey, out var nameRaw);
                dictionary.TryGetValue(EmergencyFieldSupport.PhoneKey, out var phoneRaw);
                TryGetString(nameRaw, out var dictName);
                TryGetString(phoneRaw, out var dictPhone);
                answer = new EmergencyAnswer(dictName, dictPhone);
                return true;
            case JsonElement json when json.ValueKind == JsonValueKind.Object:
                var jsonName = ReadJsonProperty(json, EmergencyFieldSupport.NameKey);
                var jsonPhone = ReadJsonProperty(json, EmergencyFieldSupport.PhoneKey);
                answer = new EmergencyAnswer(jsonName, jsonPhone);
                return true;
            default:
                return false;
        }
    }

    private static string ReadJsonProperty(JsonElement json, string propertyName)
    {
        if (!json.TryGetProperty(propertyName, out var property))
        {
            return string.Empty;
        }

        return property.ValueKind switch
        {
            JsonValueKind.String => property.GetString() ?? string.Empty,
            JsonValueKind.Null => string.Empty,
            _ => property.GetRawText(),
        };
    }

    private static bool TryGetStringList(object? rawValue, out List<string> values)
    {
        values = [];
        switch (rawValue)
        {
            case null:
                return false;
            case IEnumerable<string> strings:
                values = strings
                    .Select(item => item.Trim())
                    .Where(item => item.Length > 0)
                    .Distinct(StringComparer.Ordinal)
                    .ToList();
                return true;
            case JsonElement json when json.ValueKind == JsonValueKind.Array:
                foreach (var item in json.EnumerateArray())
                {
                    if (item.ValueKind == JsonValueKind.String &&
                        item.GetString() is { Length: > 0 } text)
                    {
                        var trimmed = text.Trim();
                        if (trimmed.Length > 0 && !values.Contains(trimmed, StringComparer.Ordinal))
                        {
                            values.Add(trimmed);
                        }
                    }
                }

                return true;
            default:
                return false;
        }
    }

    private static bool TryParseIsoDate(string text, out DateOnly date) =>
        DateOnly.TryParseExact(
            text.Trim(),
            DateFormat,
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out date);

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
