namespace Cohestra.Infrastructure.Signup;

public sealed class SelfServeSignupSettings
{
    public const string SectionName = "SelfServeSignup";

    public bool RegistrationClosed { get; set; }

    public RecaptchaSettings Recaptcha { get; set; } = new();
}

public sealed class RecaptchaSettings
{
    public bool Enabled { get; set; } = true;

    public string SiteKey { get; set; } = string.Empty;

    public string SecretKey { get; set; } = string.Empty;

    /// <summary>Local/test only. Must stay empty in UAT and Production.</summary>
    public string TestBypassToken { get; set; } = string.Empty;
}
