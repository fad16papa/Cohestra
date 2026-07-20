using Cohestra.Application.Email;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Cohestra.Api.IntegrationTests.Infrastructure;

public sealed class IntegrationTestWebApplicationFactory : WebApplicationFactory<Program>
{
    public bool IsAvailable { get; private set; }

    public string? SkipReason { get; private set; }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        var postgresConnection = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? "Host=localhost;Port=5432;Database=cohestra_test;Username=crm;Password=crm";
        var redisConnection = Environment.GetEnvironmentVariable("ConnectionStrings__Redis")
            ?? "localhost:6379";

        builder.UseSetting("ConnectionStrings:DefaultConnection", postgresConnection);
        builder.UseSetting("ConnectionStrings:Redis", redisConnection);
        builder.UseSetting("Jwt:SigningKey", "integration-test-jwt-signing-key-min-32-chars!");
        builder.UseSetting("OperatorSeed:Email", "operator@cohestra.local");
        builder.UseSetting("OperatorSeed:Password", "ChangeMe123!");
        builder.UseSetting("OperatorSeed:Enabled", "true");
        builder.UseSetting("PlatformAdminSeed:Enabled", "true");
        builder.UseSetting("PlatformAdminSeed:Email", "platform-admin@cohestra.local");
        builder.UseSetting("PlatformAdminSeed:Password", "ChangeMe123!");
        builder.UseSetting("DemoDataSeed:Enabled", "false");
        builder.UseSetting("SendGrid:ApiKey", "SG.integration-test-key");
        builder.UseSetting("SendGrid:FromEmail", "operator@cohestra.local");
        builder.UseSetting("SendGrid:FromName", "Integration Tests");
        builder.UseSetting("SendGrid:UseSandbox", "true");
        builder.UseSetting("PublicRegistrationRateLimit:MaxRequests", "1000");

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IEmailSender>();
            services.AddSingleton<IEmailSender, FakeEmailSender>();
        });
    }

    protected override void ConfigureClient(HttpClient client)
    {
        client.BaseAddress = new Uri("http://localhost");
    }

    public async Task InitializeAsync()
    {
        try
        {
            var client = CreateClient();
            using var response = await client.GetAsync("/ready");
            IsAvailable = response.IsSuccessStatusCode;

            if (!IsAvailable)
            {
                SkipReason = $"Dependencies are not ready (GET /ready returned {(int)response.StatusCode}).";
            }
        }
        catch (Exception ex)
        {
            IsAvailable = false;
            SkipReason = $"Integration dependencies unavailable: {ex.Message}";
        }
    }
}
