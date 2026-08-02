using Cohestra.Infrastructure.Activities;

namespace Cohestra.Infrastructure.Tests.Activities;

public sealed class ActivityCapacityValidatorTests
{
    [Theory]
    [InlineData(null, null)]
    [InlineData(1, null)]
    [InlineData(50, null)]
    public void ValidateMaxRegistrants_AcceptsNullOrPositive(int? maxRegistrants, string? expectedError)
    {
        Assert.Equal(expectedError, ActivityCapacityValidator.ValidateMaxRegistrants(maxRegistrants));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void ValidateMaxRegistrants_RejectsNonPositive(int maxRegistrants)
    {
        var error = ActivityCapacityValidator.ValidateMaxRegistrants(maxRegistrants);

        Assert.NotNull(error);
        Assert.Contains("at least 1", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ValidateMaxRegistrantsAgainstCount_RejectsCapBelowCurrentCount()
    {
        var error = ActivityCapacityValidator.ValidateMaxRegistrantsAgainstCount(2, registrationCount: 3);

        Assert.NotNull(error);
        Assert.Contains("cannot be lower", error, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("3", error);
    }

    [Fact]
    public void ValidateMaxRegistrantsAgainstCount_AllowsCapEqualToCurrentCount()
    {
        Assert.Null(ActivityCapacityValidator.ValidateMaxRegistrantsAgainstCount(3, registrationCount: 3));
    }

    [Theory]
    [InlineData(null, 10, false)]
    [InlineData(10, 9, false)]
    [InlineData(10, 10, true)]
    [InlineData(10, 11, true)]
    public void IsRegistrationFull_UsesGreaterThanOrEqual(
        int? maxRegistrants,
        int registrationCount,
        bool expected)
    {
        Assert.Equal(
            expected,
            ActivityCapacityValidator.IsRegistrationFull(maxRegistrants, registrationCount));
    }
}
