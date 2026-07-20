using Cohestra.Domain.Tenants;

namespace Cohestra.Infrastructure.Tests.Tenants;

public sealed class TenantSlugRulesTests
{
    [Theory]
    [InlineData("abc")]
    [InlineData("acme-corp")]
    [InlineData("a1b")]
    [InlineData("tenant123")]
    public void Valid_slugs_pass(string slug)
    {
        Assert.Null(TenantSlugRules.ValidateForProvision(slug));
    }

    [Theory]
    [InlineData("")]
    [InlineData("ab")]
    [InlineData("-abc")]
    [InlineData("abc-")]
    [InlineData("has_underscore")]
    public void Invalid_format_rejected(string slug)
    {
        Assert.NotNull(TenantSlugRules.ValidateForProvision(slug));
    }

    [Fact]
    public void Uppercase_input_is_normalized_then_accepted()
    {
        Assert.Null(TenantSlugRules.ValidateForProvision("AcmeCorp"));
        Assert.Equal("acmecorp", TenantSlugRules.Normalize("AcmeCorp"));
    }

    [Theory]
    [InlineData("www")]
    [InlineData("api")]
    [InlineData("platform")]
    [InlineData("cohestra")]
    [InlineData("default")]
    public void Reserved_slugs_rejected(string slug)
    {
        var error = TenantSlugRules.ValidateForProvision(slug);
        Assert.NotNull(error);
        Assert.Contains("reserved", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Normalize_lowercases()
    {
        Assert.Equal("acme", TenantSlugRules.Normalize(" Acme "));
    }
}
