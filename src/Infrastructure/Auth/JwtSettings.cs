namespace LeadGenerationCrm.Infrastructure.Auth;

public sealed class JwtSettings
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "lead-generation-crm";

    public string Audience { get; set; } = "lead-generation-crm-api";

    public string SigningKey { get; set; } = string.Empty;

    public int AccessTokenMinutes { get; set; } = 15;

    public int RefreshTokenHours { get; set; } = 24;
}
