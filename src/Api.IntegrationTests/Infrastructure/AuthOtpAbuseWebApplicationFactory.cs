using Microsoft.AspNetCore.Hosting;

namespace Cohestra.Api.IntegrationTests.Infrastructure;

/// <summary>
/// Integration factory with low operator auth OTP verify rate limits for abuse-path tests.
/// </summary>
public sealed class AuthOtpAbuseWebApplicationFactory : IntegrationTestWebApplicationFactory
{
    protected override void ApplyDefaultSettings(IWebHostBuilder builder)
    {
        base.ApplyDefaultSettings(builder);

        builder.UseSetting("AuthOtpVerifyRateLimit:MaxFailedAttemptsPerWindow", "3");
        builder.UseSetting("AuthOtpVerifyRateLimit:WindowMinutes", "15");
    }
}
