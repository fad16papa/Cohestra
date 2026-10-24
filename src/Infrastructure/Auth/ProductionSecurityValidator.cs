using Cohestra.Infrastructure.Billing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace Cohestra.Infrastructure.Auth;

public static class ProductionSecurityValidator
{
    private static readonly string[] BlockedJwtSigningKeyFragments =
    [
        "DEV_ONLY_CHANGE_IN_PRODUCTION",
        "integration-test-jwt-signing-key",
        "change_me",
        "changeme",
    ];

    private static readonly string[] GoogleRecaptchaTestKeys =
    [
        "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI",
        "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe",
    ];

    public static void Validate(IConfiguration configuration, IHostEnvironment environment)
    {
        var paddle = configuration.GetSection(PaddleSettings.SectionName).Get<PaddleSettings>()
            ?? new PaddleSettings();
        var publicBaseUrl = configuration["PublicWeb:BaseUrl"];
        PaddleCredentialGuard.Validate(paddle, environment, publicBaseUrl);

        if (environment.IsDevelopment() || string.Equals(environment.EnvironmentName, "Testing", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var signingKey = configuration["Jwt:SigningKey"];
        if (string.IsNullOrWhiteSpace(signingKey))
        {
            throw new InvalidOperationException("Jwt:SigningKey must be configured in non-Development environments.");
        }

        foreach (var fragment in BlockedJwtSigningKeyFragments)
        {
            if (signingKey.Contains(fragment, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "Jwt:SigningKey appears to be a development placeholder. Set a unique production secret via environment configuration.");
            }
        }

        if (configuration.GetValue("OperatorSeed:Enabled", false))
        {
            throw new InvalidOperationException(
                "OperatorSeed:Enabled must be false in non-Development environments.");
        }

        if (configuration.GetValue("LoadTestSeed:Enabled", false))
        {
            throw new InvalidOperationException(
                "LoadTestSeed:Enabled must be false in non-Development environments.");
        }

        if (configuration.GetValue("DemoDataSeed:Enabled", false))
        {
            throw new InvalidOperationException(
                "DemoDataSeed:Enabled must be false in non-Development environments.");
        }

        if (configuration.GetValue("PlatformAdminSeed:Enabled", false))
        {
            throw new InvalidOperationException(
                "PlatformAdminSeed:Enabled must be false in non-Development environments.");
        }

        if (signingKey.Trim().Length < 32)
        {
            throw new InvalidOperationException("Jwt:SigningKey must be at least 32 characters.");
        }

        ValidateProductionCors(configuration);
        ValidateProductionRecaptcha(configuration, publicBaseUrl);
        ValidateProductionRedis(configuration.GetConnectionString("Redis"), publicBaseUrl);
        ValidateProductionPostgres(configuration.GetConnectionString("DefaultConnection"));
    }

    private static void ValidateProductionCors(IConfiguration configuration)
    {
        var origins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
        if (origins.Length == 0)
        {
            throw new InvalidOperationException(
                "Cors:AllowedOrigins must be configured in non-Development environments.");
        }

        foreach (var raw in origins)
        {
            if (string.IsNullOrWhiteSpace(raw)
                || !Uri.TryCreate(raw, UriKind.Absolute, out var uri)
                || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            {
                throw new InvalidOperationException(
                    "Cors:AllowedOrigins entries must be absolute http(s) origins in non-Development environments.");
            }

            var host = uri.IdnHost;
            if (IsLoopbackHost(host)
                || host.EndsWith(".localhost", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "Cors:AllowedOrigins must not include localhost or loopback hosts in non-Development environments.");
            }
        }
    }

    private static void ValidateProductionRecaptcha(IConfiguration configuration, string? publicBaseUrl)
    {
        var bypass = configuration["SelfServeSignup:Recaptcha:TestBypassToken"];
        if (!string.IsNullOrWhiteSpace(bypass))
        {
            throw new InvalidOperationException(
                "SelfServeSignup:Recaptcha:TestBypassToken must be empty in non-Development environments.");
        }

        var secret = configuration["SelfServeSignup:Recaptcha:SecretKey"];
        var siteKey = configuration["SelfServeSignup:Recaptcha:SiteKey"];
        if (IsGoogleRecaptchaTestKey(secret) || IsGoogleRecaptchaTestKey(siteKey))
        {
            throw new InvalidOperationException(
                "SelfServeSignup:Recaptcha must not use Google test keys in non-Development environments.");
        }

        var enabled = configuration.GetValue("SelfServeSignup:Recaptcha:Enabled", false);
        if (enabled && string.IsNullOrWhiteSpace(secret))
        {
            throw new InvalidOperationException(
                "SelfServeSignup:Recaptcha:SecretKey must be set when reCAPTCHA is enabled in non-Development environments.");
        }

        var registrationClosed = configuration.GetValue("SelfServeSignup:RegistrationClosed", false);
        if (!registrationClosed && IsProductionApexHost(publicBaseUrl) && !enabled)
        {
            throw new InvalidOperationException(
                "SelfServeSignup:Recaptcha:Enabled must be true when self-serve signup is open on the Production apex.");
        }
    }

    private static void ValidateProductionRedis(string? redis, string? publicBaseUrl)
    {
        if (string.IsNullOrWhiteSpace(redis) || PaddleCredentialGuard.IsUatPublicHost(publicBaseUrl))
        {
            return;
        }

        if (!HasRedisPassword(redis))
        {
            throw new InvalidOperationException(
                "ConnectionStrings:Redis must include a password in non-UAT Production environments.");
        }
    }

    private static bool HasRedisPassword(string redis)
    {
        foreach (var part in redis.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            var eq = part.IndexOf('=');
            if (eq <= 0)
            {
                continue;
            }

            if (part[..eq].Trim().Equals("password", StringComparison.OrdinalIgnoreCase)
                && !string.IsNullOrWhiteSpace(part[(eq + 1)..]))
            {
                return true;
            }
        }

        return false;
    }

    private static bool IsGoogleRecaptchaTestKey(string? value) =>
        !string.IsNullOrWhiteSpace(value)
        && GoogleRecaptchaTestKeys.Contains(value.Trim(), StringComparer.Ordinal);

    private static bool IsProductionApexHost(string? publicBaseUrl)
    {
        if (string.IsNullOrWhiteSpace(publicBaseUrl)
            || !Uri.TryCreate(publicBaseUrl, UriKind.Absolute, out var uri)
            || PaddleCredentialGuard.IsUatPublicHost(publicBaseUrl))
        {
            return false;
        }

        var host = uri.IdnHost;
        return host.Equals("cohestra.app", StringComparison.OrdinalIgnoreCase)
            || host.Equals("www.cohestra.app", StringComparison.OrdinalIgnoreCase);
    }

    private static void ValidateProductionPostgres(string? postgres)
    {
        if (string.IsNullOrWhiteSpace(postgres))
        {
            return;
        }

        var host = ReadPair(postgres, "Host");
        var username = ReadPair(postgres, "Username");
        var password = ReadPair(postgres, "Password");

        if (string.Equals(password, "crm", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "DefaultConnection password is the development placeholder. Set a unique UAT/production secret.");
        }

        if (IsLoopbackHost(host))
        {
            throw new InvalidOperationException(
                "DefaultConnection must not target localhost or 127.0.0.1 in Production.");
        }

        if (string.Equals(username, "crm", StringComparison.OrdinalIgnoreCase)
            && !IsIsolatedComposePostgresHost(host))
        {
            throw new InvalidOperationException(
                "DefaultConnection Username=crm is only allowed when Host is the isolated Compose service postgres.");
        }
    }

    private static bool IsLoopbackHost(string? host) =>
        string.Equals(host, "localhost", StringComparison.OrdinalIgnoreCase)
        || string.Equals(host, "127.0.0.1", StringComparison.OrdinalIgnoreCase)
        || string.Equals(host, "::1", StringComparison.OrdinalIgnoreCase);

    private static bool IsIsolatedComposePostgresHost(string? host) =>
        string.Equals(host, "postgres", StringComparison.OrdinalIgnoreCase);

    private static string? ReadPair(string connectionString, string key)
    {
        string? found = null;
        foreach (var part in connectionString.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            var eq = part.IndexOf('=');
            if (eq <= 0)
            {
                continue;
            }

            if (part[..eq].Trim().Equals(key, StringComparison.OrdinalIgnoreCase))
            {
                found = part[(eq + 1)..].Trim();
            }
        }

        return found;
    }
}
