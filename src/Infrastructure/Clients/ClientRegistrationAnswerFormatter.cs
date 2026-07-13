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
        if (field.Type is FormFieldTypes.Checkbox or FormFieldTypes.Consent)
        {
            if (!RegistrationAnswerValidator.TryGetBooleanForExtraction(rawValue, out var boolValue))
            {
                return null;
            }

            return boolValue ? "Yes" : "No";
        }

        if (!RegistrationAnswerValidator.TryGetStringForExtraction(rawValue, out var text) ||
            string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        if (field.Type is FormFieldTypes.Select or FormFieldTypes.ReferralSource)
        {
            var optionLabel = field.Options?
                .FirstOrDefault(option =>
                    string.Equals(option.Value, text.Trim(), StringComparison.Ordinal))
                ?.Label;

            return optionLabel ?? text.Trim();
        }

        return text.Trim();
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
