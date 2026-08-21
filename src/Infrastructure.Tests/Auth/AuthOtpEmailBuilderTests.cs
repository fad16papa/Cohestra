using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Email;

namespace Cohestra.Infrastructure.Tests.Auth;

public sealed class AuthOtpEmailBuilderTests
{
    [Fact]
    public void BuildEmailVerification_uses_Cohestra_branding()
    {
        var content = AuthOtpEmailBuilder.BuildEmailVerification("Priya", "123456", 10);

        Assert.Contains("Verify your Cohestra account", content.Subject);
        Assert.DoesNotContain("Activity Lead", content.Subject);
        Assert.Contains("Cohestra", content.PlainTextBody);
        Assert.Contains("Community Platform", content.PlainTextBody);
        Assert.Contains("Email Verification", content.PlainTextBody);
        Assert.Contains("Cohestra by Creativorare", content.PlainTextBody);
        Assert.DoesNotContain("Activity Lead", content.PlainTextBody);
        Assert.Contains("Cohestra", content.HtmlBody);
        Assert.Contains("Community Platform", content.HtmlBody);
        Assert.Contains("Email Verification", content.HtmlBody);
        Assert.Contains("cid:cohestra-brand-logo", content.HtmlBody);
        Assert.Contains("alt=\"Cohestra logo\"", content.HtmlBody);
        Assert.DoesNotContain("Activity Lead", content.HtmlBody);
        Assert.Contains("123456", content.PlainTextBody);
        Assert.NotNull(content.InlineAttachments);
        Assert.Equal(PlatformBrandAssets.LogoInlineContentId, content.InlineAttachments![0].ContentId);
    }

    [Fact]
    public void BuildPasswordReset_uses_Cohestra_branding()
    {
        var content = AuthOtpEmailBuilder.BuildPasswordReset("654321", 15);

        Assert.Contains("Reset your Cohestra password", content.Subject);
        Assert.DoesNotContain("Activity Lead", content.Subject);
        Assert.Contains("Cohestra", content.PlainTextBody);
        Assert.Contains("Community Platform", content.PlainTextBody);
        Assert.Contains("Password Reset", content.PlainTextBody);
        Assert.Contains("Cohestra by Creativorare", content.PlainTextBody);
        Assert.DoesNotContain("Activity Lead", content.PlainTextBody);
        Assert.Contains("Cohestra", content.HtmlBody);
        Assert.Contains("Community Platform", content.HtmlBody);
        Assert.Contains("Password Reset", content.HtmlBody);
        Assert.Contains("cid:cohestra-brand-logo", content.HtmlBody);
        Assert.DoesNotContain("Activity Lead", content.HtmlBody);
        Assert.Contains("654321", content.PlainTextBody);
        Assert.NotNull(content.InlineAttachments);
    }
}
