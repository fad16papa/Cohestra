using Cohestra.Application.WebsiteInquiries;

namespace Cohestra.Infrastructure.WebsiteInquiries;

internal static class WebsiteInquiryValidator
{
    public const int MaxNameLength = 200;
    public const int MaxEmailLength = 320;
    public const int MaxPhoneLength = 40;
    public const int MaxMessageLength = 500;

    public static string? Validate(SubmitWebsiteInquiryCommand command)
    {
        var name = command.Name?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(name))
        {
            return "Name is required.";
        }

        if (name.Length > MaxNameLength)
        {
            return $"Name must be at most {MaxNameLength} characters.";
        }

        var email = command.Email?.Trim();
        var phone = command.Phone?.Trim();

        if (string.IsNullOrWhiteSpace(email) && string.IsNullOrWhiteSpace(phone))
        {
            return "Provide an email address or phone number.";
        }

        if (!string.IsNullOrWhiteSpace(email))
        {
            if (email.Length > MaxEmailLength)
            {
                return $"Email must be at most {MaxEmailLength} characters.";
            }

            if (!email.Contains('@', StringComparison.Ordinal))
            {
                return "Enter a valid email address.";
            }
        }

        if (!string.IsNullOrWhiteSpace(phone))
        {
            if (phone.Length > MaxPhoneLength)
            {
                return $"Phone must be at most {MaxPhoneLength} characters.";
            }

            var phoneError = Registrations.PhoneCountrySupport.ValidateLocalMobileNumber(
                Registrations.PhoneCountrySupport.DefaultPhoneCountryIsoCode,
                phone);

            if (phoneError is not null)
            {
                return phoneError;
            }
        }

        var message = command.Message?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(message))
        {
            return "Message is required.";
        }

        if (message.Length > MaxMessageLength)
        {
            return $"Message must be at most {MaxMessageLength} characters.";
        }

        return null;
    }
}
