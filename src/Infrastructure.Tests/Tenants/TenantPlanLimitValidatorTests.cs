using Cohestra.Infrastructure.Tenants;

namespace Cohestra.Infrastructure.Tests.Tenants;

public sealed class TenantPlanLimitValidatorTests
{
    [Theory]
    [InlineData(9, 10, false)]
    [InlineData(10, 10, true)]
    [InlineData(11, 10, true)]
    public void IsAtOrOverCapacity_MatchesShellDialRules(int used, int limit, bool expected)
    {
        Assert.Equal(expected, TenantPlanLimitValidator.IsAtOrOverCapacity(used, limit));
    }

    [Fact]
    public void ValidateCanPublishActivity_ReturnsMessageAtCapacity()
    {
        var message = TenantPlanLimitValidator.ValidateCanPublishActivity(50, 50);

        Assert.NotNull(message);
        Assert.Contains("Published activities", message);
        Assert.Contains(TenantPlanLimitValidator.LimitReachedSuffix, message);
    }

    [Fact]
    public void ValidateCanAddCommunity_AllowsBelowCapacity()
    {
        Assert.Null(TenantPlanLimitValidator.ValidateCanAddCommunity(9, 10));
    }

    [Fact]
    public void ValidateCanAddFormTemplate_ReturnsMessageAtCapacity()
    {
        var message = TenantPlanLimitValidator.ValidateCanAddFormTemplate(1, 1);

        Assert.NotNull(message);
        Assert.Contains("Saved form templates", message);
        Assert.Contains(TenantPlanLimitValidator.LimitReachedSuffix, message);
    }

    [Fact]
    public void ValidateCanAddFormTemplate_AllowsBelowCapacity()
    {
        Assert.Null(TenantPlanLimitValidator.ValidateCanAddFormTemplate(0, 1));
    }

    [Fact]
    public void ValidateCanAcceptRegistration_ReturnsMessageAtCapacity()
    {
        var message = TenantPlanLimitValidator.ValidateCanAcceptRegistration(5000, 5000);

        Assert.NotNull(message);
        Assert.Contains("Monthly registration limit", message);
    }
}
