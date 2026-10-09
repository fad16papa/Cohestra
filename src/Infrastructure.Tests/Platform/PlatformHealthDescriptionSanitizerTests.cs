using Cohestra.Infrastructure.Platform;

namespace Cohestra.Infrastructure.Tests.Platform;

public sealed class PlatformHealthDescriptionSanitizerTests
{
    [Fact]
    public void Strips_connection_string_and_redis_and_token_patterns()
    {
        var raw =
            "Failed Host=db.internal;Username=crm;Password=super-secret redis://:hunter2@cache:6379 Bearer abc.def.ghi ApiKey=SG.leak";
        var sanitized = PlatformHealthDescriptionSanitizer.Sanitize(raw);

        Assert.NotNull(sanitized);
        Assert.DoesNotContain("super-secret", sanitized, StringComparison.Ordinal);
        Assert.DoesNotContain("hunter2", sanitized, StringComparison.Ordinal);
        Assert.DoesNotContain("abc.def.ghi", sanitized, StringComparison.Ordinal);
        Assert.DoesNotContain("SG.leak", sanitized, StringComparison.Ordinal);
        Assert.DoesNotContain("db.internal", sanitized, StringComparison.Ordinal);
        Assert.Contains("=***", sanitized, StringComparison.Ordinal);
    }

    [Fact]
    public void Truncates_to_200_and_keeps_safe_copy()
    {
        Assert.Equal(
            "Default tenant (Platform 0) is present.",
            PlatformHealthDescriptionSanitizer.Sanitize("Default tenant (Platform 0) is present."));
        Assert.Null(PlatformHealthDescriptionSanitizer.Sanitize("  "));
        Assert.Equal(200, PlatformHealthDescriptionSanitizer.Sanitize(new string('x', 250))!.Length);
    }
}
