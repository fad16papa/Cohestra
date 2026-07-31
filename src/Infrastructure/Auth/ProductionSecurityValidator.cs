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

        var postgres = configuration.GetConnectionString("DefaultConnection") ?? string.Empty;
        if (postgres.Contains("Password=crm", StringComparison.OrdinalIgnoreCase)
            || postgres.Contains("Username=crm", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "DefaultConnection uses development database credentials. Configure production secrets via environment.");
        }
    }
}
