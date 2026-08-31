using Cohestra.Infrastructure.Tenants;

namespace Cohestra.Infrastructure.Tests.Tenants;

public sealed class EmbedOriginSupportTests
{
    [Theory]
    [InlineData("https://club.example.com")]
    [InlineData("http://localhost:3000")]
    [InlineData("https://www.notion.so")]
    [InlineData("https://example.com:8443")]
    public void ValidateOrigin_accepts_valid_http_https_origins(string origin)
    {
        Assert.Null(EmbedOriginSupport.ValidateOrigin(origin));
    }

    [Theory]
    [InlineData("*")]
    [InlineData("https://*")]
    [InlineData("https://club.example.com/path")]
    [InlineData("https://club.example.com?x=1")]
    [InlineData("https://club.example.com#frag")]
    [InlineData("ftp://club.example.com")]
    [InlineData("")]
    [InlineData("   ")]
    public void ValidateOrigin_rejects_invalid_origins(string origin)
    {
        Assert.NotNull(EmbedOriginSupport.ValidateOrigin(origin));
    }

    [Fact]
    public void NormalizeList_deduplicates_case_insensitive_hosts()
    {
        var (ok, origins, error) = EmbedOriginSupport.NormalizeList([
            "https://Club.Example.com",
            "HTTPS://club.example.com",
            "https://www.notion.so",
        ]);

        Assert.True(ok);
        Assert.Null(error);
        Assert.Equal(2, origins.Count);
        Assert.Contains("https://club.example.com", origins);
        Assert.Contains("https://www.notion.so", origins);
    }

    [Fact]
    public void NormalizeList_rejects_wildcard()
    {
        var (ok, _, error) = EmbedOriginSupport.NormalizeList(["https://*.example.com"]);

        Assert.False(ok);
        Assert.Contains("Wildcards", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void NormalizeList_rejects_more_than_max_unique_origins()
    {
        var origins = Enumerable.Range(0, EmbedOriginSupport.MaxOrigins + 1)
            .Select(i => $"https://host{i}.example.com")
            .ToList();

        var (ok, _, error) = EmbedOriginSupport.NormalizeList(origins);

        Assert.False(ok);
        Assert.Contains("20", error);
    }

    [Fact]
    public void NormalizeList_dedupes_before_enforcing_max()
    {
        var origins = Enumerable.Range(0, EmbedOriginSupport.MaxOrigins)
            .SelectMany(i => new[] { $"https://host{i}.example.com", $"HTTPS://host{i}.example.com" })
            .ToList();

        var (ok, normalized, error) = EmbedOriginSupport.NormalizeList(origins);

        Assert.True(ok);
        Assert.Null(error);
        Assert.Equal(EmbedOriginSupport.MaxOrigins, normalized.Count);
    }

    [Fact]
    public void SanitizeStoredOrigins_drops_invalid_entries()
    {
        var sanitized = EmbedOriginSupport.SanitizeStoredOrigins([
            "https://club.example.com",
            "not-a-url",
            "https://*.example.com",
        ]);

        Assert.Single(sanitized);
        Assert.Equal("https://club.example.com", sanitized[0]);
    }

    [Fact]
    public void SanitizeStoredOrigins_caps_at_max_origins()
    {
        var stored = Enumerable.Range(0, EmbedOriginSupport.MaxOrigins + 5)
            .Select(i => $"https://host{i}.example.com")
            .ToList();

        var sanitized = EmbedOriginSupport.SanitizeStoredOrigins(stored);

        Assert.Equal(EmbedOriginSupport.MaxOrigins, sanitized.Count);
    }
}
