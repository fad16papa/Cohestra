using Microsoft.AspNetCore.Hosting;

namespace Cohestra.Api.IntegrationTests.Infrastructure;

/// <summary>
/// Integration factory with low signup/verify rate limits for abuse-path tests.
/// </summary>
public sealed class PublicSignupAbuseWebApplicationFactory : IntegrationTestWebApplicationFactory
{
    private readonly Action<IWebHostBuilder>? _extraConfigure;

    public PublicSignupAbuseWebApplicationFactory(Action<IWebHostBuilder>? extraConfigure = null)
    {
        _extraConfigure = extraConfigure;
    }

    protected override void ApplyDefaultSettings(IWebHostBuilder builder)
    {
        base.ApplyDefaultSettings(builder);

        builder.UseSetting("PublicSignupRateLimit:MaxSuccessfulPerHour", "2");
        builder.UseSetting("PublicSignupRateLimit:MaxSuccessfulPerDay", "100");
        builder.UseSetting("PublicSignupVerifyRateLimit:MaxFailedAttemptsPerWindow", "3");
        builder.UseSetting("PublicSignupVerifyRateLimit:WindowMinutes", "15");

        _extraConfigure?.Invoke(builder);
    }
}
