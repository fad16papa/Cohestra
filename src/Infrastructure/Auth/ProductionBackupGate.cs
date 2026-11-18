using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Cohestra.Infrastructure.Auth;

/// <summary>
/// Blocks dedicated Production EF migrations until a verified backup attestation exists.
/// Does not claim production recovery is proven.
/// </summary>
public static class ProductionBackupGate
{
    public const string AttestationPathKey = "Backup:AttestationPath";
    public const string BlockedLogCode = "BACKUP_GATE_BLOCKED";

    private static readonly string[] ForbiddenAttestationKeyMarkers =
    [
        "password",
        "secret",
        "api_key",
        "apikey",
        "private",
        "token",
        "connection",
        "credential",
    ];

    private static readonly HashSet<string> ProtectedDatabaseNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "cohestra",
        "cohestra_test",
        "cohestra_uat",
        "postgres",
        "template0",
        "template1",
    };

    public static void EnsureMigrationsAllowed(IConfiguration configuration, ILogger? logger = null)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        if (!DeploymentPlane.IsDedicatedProduction(configuration))
        {
            return;
        }

        var path = configuration[AttestationPathKey]?.Trim();
        if (string.IsNullOrWhiteSpace(path))
        {
            Block(logger, "Backup attestation path is not configured.");
        }

        if (!File.Exists(path))
        {
            Block(logger, "Backup attestation file is missing.");
        }

        JsonDocument document;
        try
        {
            document = JsonDocument.Parse(File.ReadAllText(path!));
        }
        catch (JsonException)
        {
            Block(logger, "Backup attestation is not valid JSON.");
            throw;
        }

        using (document)
        {
            if (document.RootElement.ValueKind != JsonValueKind.Object)
            {
                Block(logger, "Backup attestation must be a JSON object.");
            }

            foreach (var property in document.RootElement.EnumerateObject())
            {
                var nameLc = property.Name.ToLowerInvariant();
                foreach (var marker in ForbiddenAttestationKeyMarkers)
                {
                    if (nameLc.Contains(marker, StringComparison.Ordinal))
                    {
                        Block(logger, "Backup attestation contains a forbidden field name.");
                    }
                }
            }

            var status = GetRequiredString(document.RootElement, "status", logger);
            if (!string.Equals(status, "verified", StringComparison.Ordinal))
            {
                Block(logger, "Backup attestation status is not verified.");
            }

            var sha256 = GetRequiredString(document.RootElement, "sha256", logger);
            if (!IsSha256Hex(sha256))
            {
                Block(logger, "Backup attestation sha256 is invalid.");
            }

            var artifact = GetRequiredString(document.RootElement, "artifact", logger);
            if (artifact.Contains('/') || artifact.Contains('\\'))
            {
                Block(logger, "Backup attestation artifact must be a basename.");
            }

            if (LooksLikeSecretToken(artifact))
            {
                Block(logger, "Backup attestation artifact looks like a secret.");
            }

            var database = GetRequiredString(document.RootElement, "database", logger);
            if (!IsAllowedDisposableDatabaseName(database))
            {
                Block(logger, "Backup attestation database name is not allowed.");
            }

            if (document.RootElement.TryGetProperty("production_recovery_proven", out var recoveryProp)
                && recoveryProp.ValueKind == JsonValueKind.True)
            {
                Block(logger, "production_recovery_proven must not be true in this story.");
            }
        }
    }

    private static void Block(ILogger? logger, string reason)
    {
        logger?.LogWarning("{Code} {Reason}", BlockedLogCode, reason);
        throw new InvalidOperationException("Dedicated Production migrations are blocked until backup attestation is verified.");
    }

    private static string GetRequiredString(JsonElement root, string name, ILogger? logger)
    {
        if (!root.TryGetProperty(name, out var value) || value.ValueKind != JsonValueKind.String)
        {
            Block(logger, $"Backup attestation field '{name}' is missing.");
        }

        var text = value.GetString();
        if (string.IsNullOrWhiteSpace(text))
        {
            Block(logger, $"Backup attestation field '{name}' is empty.");
        }

        return text!.Trim();
    }

    private static bool IsSha256Hex(string value)
        => value.Length == 64 && value.All(static c => c is >= '0' and <= '9' or >= 'a' and <= 'f' or >= 'A' and <= 'F');

    private static bool LooksLikeSecretToken(string value)
    {
        var lc = value.ToLowerInvariant();
        foreach (var marker in ForbiddenAttestationKeyMarkers)
        {
            if (lc.Contains(marker, StringComparison.Ordinal))
            {
                return true;
            }
        }

        return false;
    }

    public static bool IsAllowedDisposableDatabaseName(string database)
    {
        if (string.IsNullOrWhiteSpace(database))
        {
            return false;
        }

        if (!System.Text.RegularExpressions.Regex.IsMatch(database, "^[A-Za-z_][A-Za-z0-9_]{0,62}$"))
        {
            return false;
        }

        var lc = database.ToLowerInvariant();
        if (!lc.EndsWith("_disposable", StringComparison.Ordinal))
        {
            return false;
        }

        if (lc.Contains("uat") || lc.Contains("prod") || lc.Contains("production") || lc.Contains("cohestra"))
        {
            return false;
        }

        if (ProtectedDatabaseNames.Contains(lc))
        {
            return false;
        }

        return true;
    }
}