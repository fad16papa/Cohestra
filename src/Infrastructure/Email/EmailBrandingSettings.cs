namespace Cohestra.Infrastructure.Email;

public sealed class EmailBrandingSettings
{
    public const string SectionName = "EmailBranding";

    public string? LogoUrl { get; set; }

    public string WebsiteUrl { get; set; } = "https://cohestra.app";

    public string FooterLegalName { get; set; } = "Creativorare";

    public const string DefaultLogoPath = "/brand/cohestra-logo.svg";

    /// <summary>PNG raster of the official mark — required for HTML email clients.</summary>
    public const string DefaultLogoEmailPath = "/brand/cohestra-logo-email.png";
}
