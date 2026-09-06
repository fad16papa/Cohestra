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

    public static void Validate(IConfiguration configuration, IHostEnvironment environment)
    {
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

        ValidateProductionPostgres(configuration.GetConnectionString("DefaultConnection"));
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
        foreach (var part in connectionString.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            var eq = part.IndexOf('=');
            if (eq <= 0)
            {
                continue;
            }

            if (part[..eq].Equals(key, StringComparison.OrdinalIgnoreCase))
            {
                return part[(eq + 1)..];
            }
        }

        return null;
    }
}
