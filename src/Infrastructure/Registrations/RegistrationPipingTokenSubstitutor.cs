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

        var substituted = ParticipantTokenRegex().Replace(
            template,
            match => ResolveToken(match, schema, profile, answers, participantVisible: true));

        return UnknownTokenRegex().Replace(substituted, MissingTokenReplacement);
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
            string.Equals(item.Id, fieldId, StringComparison.OrdinalIgnoreCase));

        if (field is null)
        {
            return MissingTokenReplacement;
        }

        if (participantVisible && IsBlockedParticipantField(field.Type))
        {
            return MissingTokenReplacement;
        }

        var answerKey = field.Id;
        answers.TryGetValue(answerKey, out var rawValue);

        return ClientRegistrationAnswerFormatter.FormatSingleFieldValue(field, rawValue)
            ?? MissingTokenReplacement;
    }

    private static bool IsBlockedParticipantField(string fieldType) =>
        string.Equals(fieldType, FormFieldTypes.Hidden, StringComparison.Ordinal)
        || FormFieldTypes.NonInput.Contains(fieldType);

    [GeneratedRegex(
        @"\{\{(full_name|email|phone)\}\}|\{\{field:([a-z0-9][a-z0-9_-]{0,63})\}\}",
        RegexOptions.CultureInvariant | RegexOptions.IgnoreCase)]
    private static partial Regex ParticipantTokenRegex();

    [GeneratedRegex(@"\{\{[^}]+\}\}", RegexOptions.CultureInvariant)]
    private static partial Regex UnknownTokenRegex();

    private static string ResolveFullName(ExtractedClientProfile profile) =>
        string.IsNullOrWhiteSpace(profile.NameFromForm)
            ? MissingTokenReplacement
            : profile.NameFromForm.Trim();
}
