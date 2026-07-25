using Cohestra.Infrastructure.Auth;

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
        Assert.DoesNotContain("Activity Lead", content.PlainTextBody);
        Assert.Contains("Cohestra", content.HtmlBody);
        Assert.DoesNotContain("Activity Lead", content.HtmlBody);
        Assert.Contains("123456", content.PlainTextBody);
    }

    [Fact]
    public void BuildPasswordReset_uses_Cohestra_branding()
    {
        var content = AuthOtpEmailBuilder.BuildPasswordReset("654321", 15);

        Assert.Contains("Reset your Cohestra password", content.Subject);
        Assert.DoesNotContain("Activity Lead", content.Subject);
        Assert.Contains("Cohestra", content.PlainTextBody);
        Assert.DoesNotContain("Activity Lead", content.PlainTextBody);
        Assert.Contains("Cohestra", content.HtmlBody);
        Assert.DoesNotContain("Activity Lead", content.HtmlBody);
        Assert.Contains("654321", content.PlainTextBody);
    }
}
