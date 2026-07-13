using Cohestra.Infrastructure.Email;

namespace Cohestra.Infrastructure.Tests.Email;

public sealed class EmailDeliveryStatusServiceTests
{
    [Fact]
    public void BuildApiKeyItem_MarksMissingKeyAsActionRequired()
    {
        var item = EmailDeliveryStatusService.BuildApiKeyItem(apiKeyConfigured: false);

        Assert.Equal("action_required", item.Status);
        Assert.Contains("API key", item.Title, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void BuildSandboxItem_WarnsWhenSandboxEnabled()
    {
        var item = EmailDeliveryStatusService.BuildSandboxItem(useSandbox: true);

        Assert.Equal("warning", item.Status);
        Assert.Contains("sandbox", item.Detail, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("operator@gmail.com", true)]
    [InlineData("tech@creativorare.com", false)]
    public void BuildDomainAuthenticationItem_TreatsFreemailAsInformational(
        string fromEmail,
        bool expectInfo)
    {
        var item = EmailDeliveryStatusService.BuildDomainAuthenticationItem(
            SendGridLookupResult.Verified(),
            fromEmail);

        Assert.Equal(expectInfo ? "info" : "complete", item.Status);
    }

    [Fact]
    public void BuildUnavailableHint_MentionsApiKeyScopeFor403()
    {
        var item = EmailDeliveryStatusService.BuildDomainAuthenticationItem(
            SendGridLookupResult.Unavailable(403),
            "noreply@creativorare.com");

        Assert.Equal("info", item.Status);
        Assert.Contains("Optional", item.ActionHint, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void BuildUnavailableHint_Treats401OnVerificationReadsAsInformational()
    {
        var item = EmailDeliveryStatusService.BuildSenderVerificationItem(
            SendGridLookupResult.Unavailable(401),
            "noreply@creativorare.com");

        Assert.Equal("info", item.Status);
        Assert.Contains("HTTP 401", item.Detail, StringComparison.Ordinal);
    }

    [Fact]
    public void SendGridDeliveryStatusParser_DetectsVerifiedSender()
    {
        const string body =
            """
            {"results":[{"from_email":"tech@creativorare.com","verified":true}]}
            """;

        Assert.True(SendGridDeliveryStatusParser.IsSenderVerified(body, "tech@creativorare.com"));
        Assert.False(SendGridDeliveryStatusParser.IsSenderVerified(body, "other@creativorare.com"));
    }

    [Fact]
    public void SendGridDeliveryStatusParser_DetectsAuthenticatedDomainFromRootArray()
    {
        const string body =
            """
            [{"domain":"creativorare.com","valid":true}]
            """;

        Assert.True(
            SendGridDeliveryStatusParser.TryGetDomainAuthenticationState(
                body,
                "creativorare.com",
                out var result));
        Assert.Equal(SendGridLookupState.Verified, result.State);
    }

    [Fact]
    public void SendGridDeliveryStatusParser_DetectsAuthenticatedDomainFromWrappedArray()
    {
        const string body =
            """
            {"domains":[{"domain":"creativorare.com","valid":true}]}
            """;

        Assert.True(
            SendGridDeliveryStatusParser.TryGetDomainAuthenticationState(
                body,
                "creativorare.com",
                out var result));
        Assert.Equal(SendGridLookupState.Verified, result.State);
    }

    [Fact]
    public void SendGridDeliveryStatusParser_DetectsDefaultDomainObject()
    {
        const string body =
            """
            {"domain":"creativorare.com","valid":true,"default":true}
            """;

        Assert.True(
            SendGridDeliveryStatusParser.TryGetDomainAuthenticationState(
                body,
                "creativorare.com",
                out var result));
        Assert.Equal(SendGridLookupState.Verified, result.State);
    }
}
