using System.Text.Json;
using Cohestra.Contracts.Clients;
using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Registrations;

namespace Cohestra.Infrastructure.Clients;

internal static class ClientRegistrationAnswerFormatter
{
    public static IReadOnlyList<ClientRegistrationAnswerResponse> FormatAnswers(
        ActivityFormSchema? schema,
        IReadOnlyDictionary<string, object?> answers)
    {
        if (schema?.Fields is null || schema.Fields.Count == 0)
        {
            return answers
                .OrderBy(entry => entry.Key, StringComparer.Ordinal)
                .Select(entry => new ClientRegistrationAnswerResponse(
                    entry.Key,
                    entry.Key,
                    FormatRawValue(entry.Value)))
                .ToList();
        }

        return schema.Fields
            .Select(field =>
            {
                answers.TryGetValue(field.Id, out var rawValue);
                return new ClientRegistrationAnswerResponse(
                    field.Id,
                    field.Label,
                    FormatFieldValue(field, rawValue));
            })
            .Where(answer => !string.IsNullOrWhiteSpace(answer.Value))
            .ToList();
    }

    private static string? FormatFieldValue(FormFieldDefinition field, object? rawValue)
    {
        if (field.Type is FormFieldTypes.Checkbox or FormFieldTypes.Consent or FormFieldTypes.YesNo)
        {
            if (!RegistrationAnswerValidator.TryGetBooleanForExtraction(rawValue, out var boolValue))
            {
                return null;
            }

            return boolValue ? "Yes" : "No";
        }

        if (field.Type == FormFieldTypes.MultiChoice)
        {
            return FormatMultiChoice(field, rawValue);
        }

        if (field.Type == FormFieldTypes.Scale)
        {
            if (!RegistrationAnswerValidator.TryGetStringForExtraction(rawValue, out var scaleValue) ||
                string.IsNullOrWhiteSpace(scaleValue))
            {
                return null;
            }

            var trimmed = scaleValue.Trim();
            var label = ScaleFieldSupport.GetLabel(trimmed);
            return label is null ? trimmed : $"{trimmed} — {label}";
        }

        if (field.Type == FormFieldTypes.Emergency)
        {
            return FormatEmergency(field, rawValue);
        }

        if (!RegistrationAnswerValidator.TryGetStringForExtraction(rawValue, out var text) ||
            string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        if (field.Type is FormFieldTypes.Select or FormFieldTypes.ReferralSource or FormFieldTypes.Choice)
        {
            var optionLabel = field.Options?
                .FirstOrDefault(option =>
                    string.Equals(option.Value, text.Trim(), StringComparison.Ordinal))
                ?.Label;

            return optionLabel ?? text.Trim();
        }

        return text.Trim();
    }

    private static string? FormatMultiChoice(FormFieldDefinition field, object? rawValue)
    {
        IEnumerable<string>? values = rawValue switch
        {
            IEnumerable<string> strings => strings,
            JsonElement json when json.ValueKind == JsonValueKind.Array => json
                .EnumerateArray()
                .Where(item => item.ValueKind == JsonValueKind.String)
                .Select(item => item.GetString())
                .Where(item => !string.IsNullOrWhiteSpace(item))
                .Select(item => item!),
            _ => null,
        };

        if (values is null)
        {
            return null;
        }

        var labels = values
            .Select(value =>
            {
                var trimmed = value.Trim();
                return field.Options?
                    .FirstOrDefault(option =>
                        string.Equals(option.Value, trimmed, StringComparison.Ordinal))
                    ?.Label ?? trimmed;
            })
            .Where(label => !string.IsNullOrWhiteSpace(label))
            .ToList();

        return labels.Count == 0 ? null : string.Join(", ", labels);
    }

    private static string? FormatEmergency(FormFieldDefinition field, object? rawValue)
    {
        if (rawValue is not JsonElement json || json.ValueKind != JsonValueKind.Object)
        {
            if (rawValue is IReadOnlyDictionary<string, object?> dictionary)
            {
                dictionary.TryGetValue(EmergencyFieldSupport.NameKey, out var nameRaw);
                dictionary.TryGetValue(EmergencyFieldSupport.PhoneKey, out var phoneRaw);
                return FormatEmergencyParts(nameRaw, phoneRaw);
            }

            return null;
        }

        var name = json.TryGetProperty(EmergencyFieldSupport.NameKey, out var nameProperty) &&
                   nameProperty.ValueKind == JsonValueKind.String
            ? nameProperty.GetString()
            : null;
        var phone = json.TryGetProperty(EmergencyFieldSupport.PhoneKey, out var phoneProperty) &&
                    phoneProperty.ValueKind == JsonValueKind.String
            ? phoneProperty.GetString()
            : null;

        return FormatEmergencyParts(name, phone);
    }

    private static string? FormatEmergencyParts(object? nameRaw, object? phoneRaw)
    {
        RegistrationAnswerValidator.TryGetStringForExtraction(nameRaw, out var name);
        RegistrationAnswerValidator.TryGetStringForExtraction(phoneRaw, out var phone);
        var trimmedName = name.Trim();
        var trimmedPhone = phone.Trim();

        if (trimmedName.Length == 0 && trimmedPhone.Length == 0)
        {
            return null;
        }

        if (trimmedName.Length == 0)
        {
            return trimmedPhone;
        }

        if (trimmedPhone.Length == 0)
        {
            return trimmedName;
        }

        return $"{trimmedName} — {trimmedPhone}";
    }

    private static string? FormatRawValue(object? rawValue)
    {
        if (RegistrationAnswerValidator.TryGetBooleanForExtraction(rawValue, out var boolValue))
        {
            return boolValue ? "Yes" : "No";
        }

        if (RegistrationAnswerValidator.TryGetStringForExtraction(rawValue, out var text) &&
            !string.IsNullOrWhiteSpace(text))
        {
            return text.Trim();
        }

        return null;
    }
}
