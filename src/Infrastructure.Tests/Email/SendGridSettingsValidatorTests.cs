using Cohestra.Infrastructure.Email;

namespace Cohestra.Infrastructure.Tests.Email;

public class SendGridSettingsValidatorTests
{
    [Fact]
    public void ValidateForEnvironment_AllowsEmptyApiKeyInCi()
    {
        var previous = Environment.GetEnvironmentVariable("CI");
        Environment.SetEnvironmentVariable("CI", "true");

        try
        {
            SendGridSettingsValidator.ValidateForEnvironment(new SendGridSettings
            {
                ApiKey = null,
                UseSandbox = false,
            });
        }
        finally
        {
            Environment.SetEnvironmentVariable("CI", previous);
        }
    }

    [Fact]
    public void ValidateForEnvironment_AllowsSandboxApiKeyInCi()
    {
        var previous = Environment.GetEnvironmentVariable("CI");
        Environment.SetEnvironmentVariable("CI", "true");

        try
        {
            SendGridSettingsValidator.ValidateForEnvironment(new SendGridSettings
            {
                ApiKey = "SG.test-key",
                UseSandbox = true,
            });
        }
        finally
        {
            Environment.SetEnvironmentVariable("CI", previous);
        }
    }

    [Fact]
    public void ValidateForEnvironment_BlocksProductionApiKeyInCi()
    {
        var previous = Environment.GetEnvironmentVariable("CI");
        Environment.SetEnvironmentVariable("CI", "true");

        try
        {
            Assert.Throws<InvalidOperationException>(() =>
                SendGridSettingsValidator.ValidateForEnvironment(new SendGridSettings
                {
                    ApiKey = "SG.production-key",
                    UseSandbox = false,
                }));
        }
        finally
        {
            Environment.SetEnvironmentVariable("CI", previous);
        }
    }

    [Fact]
    public void ValidateForProduction_RequiresApiKeyAndFromEmail()
    {
        Assert.Throws<InvalidOperationException>(() =>
            SendGridSettingsValidator.ValidateForProduction(new SendGridSettings
            {
                ApiKey = null,
                FromEmail = "tech@cohestra.app",
                UseSandbox = false,
            }));

        Assert.Throws<InvalidOperationException>(() =>
            SendGridSettingsValidator.ValidateForProduction(new SendGridSettings
            {
                ApiKey = "SG.live-key",
                FromEmail = "",
                UseSandbox = false,
            }));
    }

    [Fact]
    public void ValidateForProduction_BlocksSandboxMode()
    {
        Assert.Throws<InvalidOperationException>(() =>
            SendGridSettingsValidator.ValidateForProduction(new SendGridSettings
            {
                ApiKey = "SG.live-key",
                FromEmail = "tech@cohestra.app",
                UseSandbox = true,
            }));
    }

    [Fact]
    public void ValidateForProduction_AllowsLiveConfiguration()
    {
        SendGridSettingsValidator.ValidateForProduction(new SendGridSettings
        {
            ApiKey = "SG.live-key",
            FromEmail = "noreply@cohestra.app",
            FromName = "Cohestra",
            UseSandbox = false,
        });
    }
}
