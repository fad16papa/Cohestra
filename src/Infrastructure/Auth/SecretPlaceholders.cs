namespace Cohestra.Infrastructure.Auth;

internal static class SecretPlaceholders
{
    internal static readonly string[] Fragments =
    [
        "DEV_ONLY_CHANGE_IN_PRODUCTION",
        "integration-test-jwt-signing-key",
        "integration-test",
        "change_me",
        "changeme",
        "ci-contract",
        "placeholder",
        "example.invalid",
        "changethis",
        "dummy-secret",
        "test-key",
        "SG.test",
    ];

    internal static bool LooksLikePlaceholder(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return true;
        }

        foreach (var fragment in Fragments)
        {
            if (value.Contains(fragment, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }
}
