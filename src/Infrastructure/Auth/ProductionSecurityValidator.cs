using Cohestra.Infrastructure.Billing;
using Cohestra.Infrastructure.Email;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace Cohestra.Infrastructure.Auth;

public static class ProductionSecurityValidator
{
    public static void Validate(IConfiguration configuration, IHostEnvironment environment)
    {
        ArgumentNullException.ThrowIfNull(configuration);
        ArgumentNullException.ThrowIfNull(environment);

        var dedicatedProduction = DeploymentPlane.IsDedicatedProduction(configuration);
        if (dedicatedProduction && !environment.IsProduction())
        {
            throw new InvalidOperationException(
                "Cohestra:DeploymentPlane=Production requires ASPNETCORE_ENVIRONMENT=Production.");
        }

        if (dedicatedProduction)
        {
            ValidateDedicatedProductionPublicUrl(configuration);
        }

        var paddle = configuration.GetSection(PaddleSettings.SectionName).Get<PaddleSettings>()
            ?? new PaddleSettings();
        var publicBaseUrl = configuration["PublicWeb:BaseUrl"];
        PaddleCredentialGuard.Validate(paddle, environment, publicBaseUrl);

        if (environment.IsDevelopment() || string.Equals(environment.EnvironmentName, "Testing", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        ValidateJwtSigningKey(configuration["Jwt:SigningKey"]);
        RejectEnabledSeed(configuration, "OperatorSeed:Enabled");
        RejectEnabledSeed(configuration, "LoadTestSeed:Enabled");
        RejectEnabledSeed(configuration, "DemoDataSeed:Enabled");
        RejectEnabledSeed(configuration, "PlatformAdminSeed:Enabled");
        ValidateProductionPostgres(configuration.GetConnectionString("DefaultConnection"));

        if (dedicatedProduction)
        {
            ValidateDedicatedProductionPlane(configuration);
        }
    }

    private static void ValidateDedicatedProductionPlane(IConfiguration configuration)
    {
        if (IsTruthy(configuration["COHESTRA_SHARED_HOST_UAT"]))
        {
            throw new InvalidOperationException(
                "COHESTRA_SHARED_HOST_UAT must not be true on the dedicated Production plane.");
        }

        RejectConfiguredValue(configuration, TenantHostResolver.DevTenantSlugConfigKey, "DEV_TENANT_SLUG");
        RejectConfiguredValue(configuration, "Tenancy:DevTenantSlug", "Tenancy:DevTenantSlug");

        ValidateDedicatedProductionRedis(configuration.GetConnectionString("Redis"));
        ValidateDedicatedProductionCors(configuration);
        ValidateDedicatedProductionSendGrid(configuration);
        RejectConfiguredValue(
            configuration,
            "SelfServeSignup:Recaptcha:TestBypassToken",
            "SelfServeSignup:Recaptcha:TestBypassToken");
    }

    private static void ValidateDedicatedProductionPublicUrl(IConfiguration configuration)
    {
        var publicBaseUrl = configuration["PublicWeb:BaseUrl"];
        if (string.IsNullOrWhiteSpace(publicBaseUrl))
        {
            throw new InvalidOperationException(
                "PublicWeb:BaseUrl must be configured on the dedicated Production plane.");
        }

        if (PaddleCredentialGuard.IsUatPublicHost(publicBaseUrl)
            || !ProductionCorsOrigins.IsProductionPublicBaseUrl(publicBaseUrl))
        {
            throw new InvalidOperationException(
                "PublicWeb:BaseUrl on the dedicated Production plane must be https://cohestra.app or https://{tenant}.cohestra.app, not a UAT, localhost, or http origin.");
        }
    }

    private static void ValidateJwtSigningKey(string? signingKey)
    {
        if (string.IsNullOrWhiteSpace(signingKey))
        {
            throw new InvalidOperationException("Jwt:SigningKey must be configured in non-Development environments.");
        }

        if (signingKey.Trim().Length < 32)
        {
            throw new InvalidOperationException("Jwt:SigningKey must be at least 32 characters in non-Development environments.");
        }

        if (SecretPlaceholders.LooksLikePlaceholder(signingKey))
        {
            throw new InvalidOperationException(
                "Jwt:SigningKey appears to be a development placeholder. Set a unique production secret via environment configuration.");
        }
    }

    private static void RejectEnabledSeed(IConfiguration configuration, string key)
    {
        if (configuration.GetValue(key, false))
        {
            throw new InvalidOperationException($"{key} must be false in non-Development environments.");
        }
    }

    private static void RejectConfiguredValue(IConfiguration configuration, string key, string displayName)
    {
        if (!string.IsNullOrWhiteSpace(configuration[key]))
        {
            throw new InvalidOperationException($"{displayName} must be unset on the dedicated Production plane.");
        }
    }

    private static void ValidateDedicatedProductionRedis(string? redis)
    {
        if (string.IsNullOrWhiteSpace(redis))
        {
            throw new InvalidOperationException(
                "ConnectionStrings:Redis must be configured on the dedicated Production plane.");
        }

        var password = ReadRedisOption(redis, "password");
        if (string.IsNullOrWhiteSpace(password))
        {
            throw new InvalidOperationException(
                "ConnectionStrings:Redis must include a password on the dedicated Production plane.");
        }

        if (string.Equals(password, "crm", StringComparison.OrdinalIgnoreCase)
            || SecretPlaceholders.LooksLikePlaceholder(password))
        {
            throw new InvalidOperationException(
                "ConnectionStrings:Redis password appears to be a development placeholder.");
        }

        var endpoint = redis.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)[0];
        var host = endpoint.Split(':', StringSplitOptions.TrimEntries)[0];
        if (IsLoopbackHost(host))
        {
            throw new InvalidOperationException(
                "ConnectionStrings:Redis must not target localhost or 127.0.0.1 on the dedicated Production plane.");
        }
    }

    private static void ValidateDedicatedProductionCors(IConfiguration configuration)
    {
        var origins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
        foreach (var origin in origins)
        {
            if (string.IsNullOrWhiteSpace(origin))
            {
                continue;
            }

            if (!ProductionCorsOrigins.IsAllowed(origin))
            {
                throw new InvalidOperationException(
                    "Cors:AllowedOrigins on the dedicated Production plane must be https://cohestra.app or https://{tenant}.cohestra.app.");
            }
        }
    }

    private static void ValidateDedicatedProductionSendGrid(IConfiguration configuration)
    {
        var settings = configuration.GetSection(SendGridSettings.SectionName).Get<SendGridSettings>()
            ?? new SendGridSettings();
        SendGridSettingsValidator.ValidateForDedicatedProduction(settings);
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

        if (string.Equals(password, "crm", StringComparison.OrdinalIgnoreCase)
            || SecretPlaceholders.LooksLikePlaceholder(password))
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

    private static bool IsTruthy(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        return value.Equals("true", StringComparison.OrdinalIgnoreCase)
            || value.Equals("1", StringComparison.OrdinalIgnoreCase)
            || value.Equals("yes", StringComparison.OrdinalIgnoreCase);
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

    private static string? ReadRedisOption(string connectionString, string key)
    {
        string? found = null;
        foreach (var part in connectionString.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
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
