using Cohestra.Infrastructure.Billing;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class PaddleSettingsTests
{
    [Fact]
    public void IsConfigured_requires_api_key()
    {
        Assert.False(new PaddleSettings().IsConfigured);
        Assert.False(new PaddleSettings { ClientToken = "test_token" }.IsConfigured);
        Assert.True(new PaddleSettings { ApiKey = "pdl_sdbx_apikey" }.IsConfigured);
    }

    [Fact]
    public void IsSandbox_defaults_true_and_is_case_insensitive()
    {
        Assert.True(new PaddleSettings().IsSandbox);
        Assert.True(new PaddleSettings { Environment = "Sandbox" }.IsSandbox);
        Assert.False(new PaddleSettings { Environment = "production" }.IsSandbox);
    }

    [Fact]
    public void TrialPeriodDays_defaults_to_thirty()
    {
        Assert.Equal(30, new PaddleSettings().TrialPeriodDays);
        Assert.Equal("Paddle", PaddleSettings.SectionName);
    }
}
