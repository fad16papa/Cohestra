using Cohestra.Domain.Activities;
using Cohestra.Domain.Clients;

namespace Cohestra.Infrastructure.Registrations;

public sealed record ExtractedClientProfile(
    string? NameFromForm,
    string DisplayName,
    string? Phone,
    string? NormalizedPhone,
    string? Email,
    string? NormalizedEmail,
    string? Profession,
    string? Nationality,
    string? Residency,
    bool ConsentGiven,
    string? ReferralSource);

internal static class ClientProfileExtractor
{
    public static ExtractedClientProfile Extract(
        ActivityFormSchema schema,
        IReadOnlyDictionary<string, object?> answers)
    {
        string? fullName = null;
        string? phone = null;
        string? phoneCountry = null;
        string? email = null;
        string? profession = null;
        string? nationality = null;
        string? residency = null;
        var consentGiven = false;
        string? referralSource = null;

        foreach (var field in schema.Fields)
        {
            if (!answers.TryGetValue(field.Id, out var rawValue))
            {
                continue;
            }

            switch (field.Type)
            {
                case FormFieldTypes.Text:
                    if (IsNameField(field.Id) && fullName is null &&
                        RegistrationAnswerValidator.TryGetStringForExtraction(rawValue, out var name))
                    {
                        fullName = name.Trim();
                    }
                    else if (field.Id.Contains("profession", StringComparison.OrdinalIgnoreCase) &&
                             RegistrationAnswerValidator.TryGetStringForExtraction(rawValue, out var prof))
                    {
                        profession = prof.Trim();
                    }
                    else if (field.Id.Contains("nationality", StringComparison.OrdinalIgnoreCase) &&
                             RegistrationAnswerValidator.TryGetStringForExtraction(rawValue, out var nat))
                    {
                        nationality = nat.Trim();
                    }
                    else if (field.Id.Contains("residency", StringComparison.OrdinalIgnoreCase) &&
                             RegistrationAnswerValidator.TryGetStringForExtraction(rawValue, out var res))
                    {
                        residency = res.Trim();
                    }
                    else if (fullName is null &&
                             field.Required &&
                             RegistrationAnswerValidator.TryGetStringForExtraction(rawValue, out var requiredText))
                    {
                        fullName = requiredText.Trim();
                    }

                    break;

                case FormFieldTypes.Phone:
                    if (RegistrationAnswerValidator.TryGetStringForExtraction(rawValue, out var phoneValue))
                    {
                        phone = phoneValue.Trim();
                        phoneCountry = field.PhoneCountry;
                    }

                    break;

                case FormFieldTypes.Email:
                    if (RegistrationAnswerValidator.TryGetStringForExtraction(rawValue, out var emailValue))
                    {
                        email = emailValue.Trim();
                    }

                    break;

                case FormFieldTypes.Consent:
                    if (RegistrationAnswerValidator.TryGetBooleanForExtraction(rawValue, out var consent) &&
                        consent)
                    {
                        consentGiven = true;
                    }

                    break;

                case FormFieldTypes.ReferralSource:
                    if (RegistrationAnswerValidator.TryGetStringForExtraction(rawValue, out var referral))
                    {
                        referralSource = referral.Trim();
                    }

                    break;
            }
        }

        return new ExtractedClientProfile(
            NameFromForm: fullName,
            DisplayName: ResolveDisplayName(fullName, email, phone),
            Phone: phone,
            NormalizedPhone: ClientContactNormalizer.NormalizePhone(phone, phoneCountry),
            Email: email,
            NormalizedEmail: ClientContactNormalizer.NormalizeEmail(email),
            Profession: profession,
            Nationality: nationality,
            Residency: residency,
            ConsentGiven: consentGiven,
            ReferralSource: referralSource);
    }

    private static string ResolveDisplayName(string? fullName, string? email, string? phone)
    {
        if (!string.IsNullOrWhiteSpace(fullName))
        {
            return fullName.Trim();
        }

        if (!string.IsNullOrWhiteSpace(email))
        {
            return email.Trim();
        }

        if (!string.IsNullOrWhiteSpace(phone))
        {
            return phone.Trim();
        }

        return string.Empty;
    }

    private static bool IsNameField(string fieldId) =>
        fieldId.Equals("full_name", StringComparison.OrdinalIgnoreCase) ||
        fieldId.Equals("name", StringComparison.OrdinalIgnoreCase) ||
        fieldId.Contains("full_name", StringComparison.OrdinalIgnoreCase);
}
