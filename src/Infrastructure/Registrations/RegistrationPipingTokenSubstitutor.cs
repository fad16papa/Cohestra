using System.Text.RegularExpressions;
using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Clients;

namespace Cohestra.Infrastructure.Registrations;

internal static partial class RegistrationPipingTokenSubstitutor
{
    internal const string MissingTokenReplacement = "";

    internal const int MaxSuccessCopyLength = 2000;
    internal const int MaxConfirmationSubjectLength = 200;
    internal const int MaxConfirmationBodyLength = 2000;

    public static string SubstituteParticipantVisible(
        string? template,
        ActivityFormSchema schema,
        ExtractedClientProfile profile,
        IReadOnlyDictionary<string, object?> answers)
    {
        if (string.IsNullOrEmpty(template))
        {
            return string.Empty;
        }

        return ParticipantTokenRegex().Replace(
            template,
            match => ResolveToken(match, schema, profile, answers, participantVisible: true));
    }

    private static string ResolveToken(
        Match match,
        ActivityFormSchema schema,
        ExtractedClientProfile profile,
        IReadOnlyDictionary<string, object?> answers,
        bool participantVisible)
    {
        if (match.Groups[1].Success)
        {
            var token = match.Groups[1].Value.ToLowerInvariant();
            return token switch
            {
                "full_name" => ResolveFullName(profile),
                "email" => profile.Email?.Trim() ?? MissingTokenReplacement,
                "phone" => profile.Phone?.Trim() ?? MissingTokenReplacement,
                _ => MissingTokenReplacement,
            };
        }

        if (!match.Groups[2].Success)
        {
            return MissingTokenReplacement;
        }

        var fieldId = match.Groups[2].Value;
        var field = schema.Fields.FirstOrDefault(item =>
            string.Equals(item.Id, fieldId, StringComparison.Ordinal));

        if (field is null)
        {
            return MissingTokenReplacement;
        }

        if (participantVisible &&
            (FormFieldTypes.Hidden.Contains(field.Type) || FormFieldTypes.NonInput.Contains(field.Type)))
        {
            return MissingTokenReplacement;
        }

        answers.TryGetValue(fieldId, out var rawValue);
        return ClientRegistrationAnswerFormatter.FormatSingleFieldValue(field, rawValue)
            ?? MissingTokenReplacement;
    }

    [GeneratedRegex(
        @"\{\{(full_name|email|phone)\}\}|\{\{field:([a-z0-9][a-z0-9_-]{0,63})\}\}",
        RegexOptions.CultureInvariant | RegexOptions.IgnoreCase)]
    private static partial Regex ParticipantTokenRegex();

    private static string ResolveFullName(ExtractedClientProfile profile)
    {
        if (!string.IsNullOrWhiteSpace(profile.NameFromForm))
        {
            return profile.NameFromForm.Trim();
        }

        return string.IsNullOrWhiteSpace(profile.DisplayName)
            ? MissingTokenReplacement
            : profile.DisplayName.Trim();
    }
}
