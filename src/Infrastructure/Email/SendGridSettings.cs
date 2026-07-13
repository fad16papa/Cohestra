namespace Cohestra.Infrastructure.Email;

public sealed class SendGridSettings
{
    public const string SectionName = "SendGrid";

    public string? ApiKey { get; set; }

    public string FromEmail { get; set; } = string.Empty;

    public string FromName { get; set; } = "Cohestra";

    public string? RegistrationFromEmail { get; set; }

    public string? RegistrationFromName { get; set; }

    public bool UseSandbox { get; set; }
}

internal static class SendGridSettingsValidator
{
    public static void ValidateForEnvironment(SendGridSettings settings, string? environmentName = null)
    {
        var environment = environmentName
            ?? Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
            ?? "Production";

        if (IsCi())
        {
            ValidateForCi(settings);
            return;
        }

        if (IsProduction(environment))
        {
            ValidateForProduction(settings);
        }
    }

    internal static void ValidateForProduction(SendGridSettings settings)
    {
        if (string.IsNullOrWhiteSpace(settings.ApiKey))
        {
            throw new InvalidOperationException(
                "SendGrid:ApiKey is required in Production. Set it in server environment secrets.");
        }

        if (string.IsNullOrWhiteSpace(settings.FromEmail))
        {
            throw new InvalidOperationException(
                "SendGrid:FromEmail is required in Production. It must match a verified SendGrid sender.");
        }

        if (!IsPlausibleEmail(settings.FromEmail))
        {
            throw new InvalidOperationException(
                "SendGrid:FromEmail is not a valid email address.");
        }

        if (settings.UseSandbox)
        {
            throw new InvalidOperationException(
                "SendGrid:UseSandbox must be false in Production. Sandbox mode prevents real inbox delivery.");
        }
    }

    private static void ValidateForCi(SendGridSettings settings)
    {
        if (string.IsNullOrWhiteSpace(settings.ApiKey))
        {
            return;
        }

        if (settings.UseSandbox)
        {
            return;
        }

        throw new InvalidOperationException(
            "Production SendGrid API keys are blocked in CI. Set SendGrid:UseSandbox=true or leave SendGrid:ApiKey empty.");
    }

    private static bool IsCi() =>
        string.Equals(Environment.GetEnvironmentVariable("CI"), "true", StringComparison.OrdinalIgnoreCase);

    private static bool IsProduction(string environmentName) =>
        string.Equals(environmentName, "Production", StringComparison.OrdinalIgnoreCase);

    private static bool IsPlausibleEmail(string email)
    {
        var atIndex = email.IndexOf('@');
        return atIndex > 0 && atIndex < email.Length - 1;
    }
}
