using System.Net;
using System.Text;
using Cohestra.Infrastructure.Signup;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests.Infrastructure;

/// <summary>
/// Isolated Layer B factory. Recaptcha is enabled with a non-Google placeholder
/// secret and a stub siteverify handler that mimics official v2 test-key
/// behavior (any non-empty token succeeds). Official Google test keys are not
/// stored in the repo. Never used by docker-compose.uat.yml or live UAT.
/// </summary>
public sealed class RecaptchaLayerBWebApplicationFactory : IntegrationTestWebApplicationFactory
{
    public const string IsolatedPlaceholderSecret = "layer-b-isolated-placeholder";

    protected override void ApplyDefaultSettings(IWebHostBuilder builder)
    {
        base.ApplyDefaultSettings(builder);
        builder.UseSetting("SelfServeSignup:Recaptcha:Enabled", "true");
        builder.UseSetting("SelfServeSignup:Recaptcha:SecretKey", IsolatedPlaceholderSecret);
        builder.UseSetting("SelfServeSignup:Recaptcha:TestBypassToken", "");
        builder.UseSetting("PublicSignupRateLimit:MaxSuccessfulPerHour", "1000");
        builder.UseSetting("PublicSignupRateLimit:MaxSuccessfulPerDay", "1000");
    }

    protected override void ConfigureTestServices(IWebHostBuilder builder)
    {
        base.ConfigureTestServices(builder);
        builder.ConfigureTestServices(services =>
        {
            services.AddHttpClient(nameof(GoogleRecaptchaVerifier))
                .ConfigurePrimaryHttpMessageHandler(() => new IsolatedOfficialBehaviorHandler());
        });
    }

    private sealed class IsolatedOfficialBehaviorHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            var json = "{\"success\":true}";
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json"),
            });
        }
    }
}
