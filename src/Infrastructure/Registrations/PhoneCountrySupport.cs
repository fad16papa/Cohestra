namespace Cohestra.Infrastructure.Registrations;

internal static class PhoneCountrySupport
{
    private static readonly HashSet<string> SupportedIsoCodes = new(StringComparer.OrdinalIgnoreCase)
    {
        "SG", "PH", "MY", "ID", "TH", "VN", "US", "GB", "AU", "HK", "JP", "KR", "CN", "IN",
    };

    /// <summary>When phoneCountry is omitted on phone fields, assume Singapore (+65).</summary>
    public const string DefaultPhoneCountryIsoCode = "SG";

    public static bool IsSupportedIsoCode(string? isoCode) =>
        !string.IsNullOrWhiteSpace(isoCode) &&
        SupportedIsoCodes.Contains(isoCode.Trim());

    public static string ResolveCallingCodeDigits(string? isoCode)
    {
        if (string.IsNullOrWhiteSpace(isoCode))
        {
            return "65";
        }

        return isoCode.Trim().ToUpperInvariant() switch
        {
            "SG" => "65",
            "PH" => "63",
            "MY" => "60",
            "ID" => "62",
            "TH" => "66",
            "VN" => "84",
            "US" => "1",
            "GB" => "44",
            "AU" => "61",
            "HK" => "852",
            "JP" => "81",
            "KR" => "82",
            "CN" => "86",
            "IN" => "91",
            _ => "65",
        };
    }

    public static string ResolveIsoCountryCode(string? isoCode) =>
        string.IsNullOrWhiteSpace(isoCode)
            ? DefaultPhoneCountryIsoCode
            : isoCode.Trim().ToUpperInvariant();

    public static string? ValidateLocalMobileNumber(string? isoCode, string text)
    {
        var digits = ExtractDigits(text);
        if (digits.Length == 0)
        {
            return null;
        }

        if (digits.StartsWith('0'))
        {
            digits = digits[1..];
        }

        var country = ResolveIsoCountryCode(isoCode);
        var callingCode = ResolveCallingCodeDigits(country);

        if (digits.StartsWith(callingCode, StringComparison.Ordinal))
        {
            digits = digits[callingCode.Length..];
        }

        return country switch
        {
            "SG" when digits.Length == 8 && (digits[0] is '8' or '9') => null,
            "SG" => "Enter a valid Singapore mobile number.",
            "PH" when digits.Length == 10 && digits[0] == '9' => null,
            "PH" => "Enter a valid Philippine mobile number.",
            _ when digits.Length is >= 6 and <= 14 => null,
            _ => "Enter a valid mobile number.",
        };
    }

    public static string? NormalizePhone(string? phone, string? isoCountryCode)
    {
        if (string.IsNullOrWhiteSpace(phone))
        {
            return null;
        }

        var trimmed = phone.Trim();
        var digitsOnly = ExtractDigits(trimmed);

        if (digitsOnly.Length == 0)
        {
            return null;
        }

        if (trimmed.StartsWith('+'))
        {
            return "+" + digitsOnly;
        }

        var callingCode = ResolveCallingCodeDigits(isoCountryCode);
        var country = ResolveIsoCountryCode(isoCountryCode);

        if (digitsOnly.StartsWith('0'))
        {
            digitsOnly = digitsOnly[1..];
        }

        if (digitsOnly.StartsWith(callingCode, StringComparison.Ordinal))
        {
            return "+" + digitsOnly;
        }

        if (country == "SG" && digitsOnly.Length == 8 && (digitsOnly[0] is '8' or '9'))
        {
            return "+" + callingCode + digitsOnly;
        }

        if (country == "PH" && digitsOnly.Length == 10 && digitsOnly[0] == '9')
        {
            return "+" + callingCode + digitsOnly;
        }

        if (digitsOnly.Length >= 6)
        {
            return "+" + callingCode + digitsOnly.TrimStart('0');
        }

        return null;
    }

    private static string GetCountryLabel(string country) =>
        country switch
        {
            "SG" => "Singapore",
            "PH" => "Philippine",
            _ => "mobile",
        };

    private static string ExtractDigits(string value)
    {
        var buffer = new char[value.Length];
        var length = 0;

        foreach (var character in value)
        {
            if (char.IsDigit(character))
            {
                buffer[length++] = character;
            }
        }

        return length == 0 ? string.Empty : new string(buffer, 0, length);
    }
}
