using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Registrations;

namespace Cohestra.Infrastructure.Tests.Registrations;

public sealed class RegistrationCloseAtEvaluatorTests
{
    [Fact]
    public void IsPastCloseAt_ReturnsFalseWhenUnset()
    {
        var schema = new ActivityFormSchema
        {
            Meta = new FormSchemaMeta(),
        };

        Assert.False(
            RegistrationCloseAtEvaluator.IsPastCloseAt(schema, DateTimeOffset.UtcNow));
    }

    [Fact]
    public void IsPastCloseAt_ReturnsTrueWhenUtcNowIsOnOrAfterClosesAt()
    {
        var closesAt = new DateTimeOffset(2026, 9, 1, 10, 0, 0, TimeSpan.Zero);
        var schema = new ActivityFormSchema
        {
            Meta = new FormSchemaMeta { RegistrationClosesAt = closesAt },
        };

        Assert.False(
            RegistrationCloseAtEvaluator.IsPastCloseAt(
                schema,
                closesAt.AddSeconds(-1)));
        Assert.True(
            RegistrationCloseAtEvaluator.IsPastCloseAt(schema, closesAt));
        Assert.True(
            RegistrationCloseAtEvaluator.IsPastCloseAt(
                schema,
                closesAt.AddMinutes(1)));
    }

    [Fact]
    public void IsPastCloseAt_NormalizesNonUtcOffsetToUniversalTime()
    {
        var closesAt = new DateTimeOffset(2026, 9, 1, 18, 0, 0, TimeSpan.FromHours(8));
        var schema = new ActivityFormSchema
        {
            Meta = new FormSchemaMeta { RegistrationClosesAt = closesAt },
        };

        Assert.True(
            RegistrationCloseAtEvaluator.IsPastCloseAt(
                schema,
                new DateTimeOffset(2026, 9, 1, 10, 0, 1, TimeSpan.Zero)));
    }
}
