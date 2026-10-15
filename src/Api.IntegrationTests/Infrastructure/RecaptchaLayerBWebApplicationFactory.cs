using Microsoft.AspNetCore.Hosting;

namespace Cohestra.Api.IntegrationTests.Infrastructure;

/// <summary>
/// Isolated Layer B factory: official Google reCAPTCHA v2 test keys only.
/// Never used by docker-compose.uat.yml or live UAT.
/// </summary>
public sealed class RecaptchaLayerBWebApplicationFactory : IntegrationTestWebApplicationFactory
{
    // Public Google v2 checkbox test keys. Not UAT/production secrets.
    public const string OfficialTestSiteKey = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";
    public const string OfficialTestSecretKey = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe";

    protected override void ApplyDefaultSettings(IWebHostBuilder builder)
    {
        base.ApplyDefaultSettings(builder);
        builder.UseSetting("SelfServeSignup:Recaptcha:Enabled", "true");
        builder.UseSetting("SelfServeSignup:Recaptcha:SecretKey", OfficialTestSecretKey);
        builder.UseSetting("SelfServeSignup:Recaptcha:TestBypassToken", "");
        builder.UseSetting("PublicSignupRateLimit:MaxSuccessfulPerHour", "1000");
        builder.UseSetting("PublicSignupRateLimit:MaxSuccessfulPerDay", "1000");
    }
}
