using Cohestra.Domain.Activities;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Registrations;

namespace Cohestra.Infrastructure.Tests.Registrations;

public sealed class RegistrationAvailabilityEvaluatorTests
{
    private static Activity CreatePublishedActivity(DateTimeOffset? closesAt = null) =>
        new()
        {
            Status = ActivityStatus.Published,
            Schedule = "Sat, Sep 5, 2026, 10:00 AM",
            ScheduledStartsAt = new DateTimeOffset(2026, 9, 5, 10, 0, 0, TimeSpan.Zero),
            MaxRegistrants = 10,
            FormSchema = closesAt is null
                ? null
                : new ActivityFormSchema
                {
                    Meta = new FormSchemaMeta { RegistrationClosesAt = closesAt },
                },
        };

    [Fact]
    public void Evaluate_UsesCapacityFullBeforeClosedAt()
    {
        var activity = CreatePublishedActivity(
            closesAt: new DateTimeOffset(2026, 9, 1, 10, 0, 0, TimeSpan.Zero));
        var limits = TenantPlanLimits.For(TenantPlan.Pro);
        var now = new DateTimeOffset(2026, 9, 2, 0, 0, 0, TimeSpan.Zero);

        var state = RegistrationAvailabilityEvaluator.Evaluate(
            activity,
            registrationCount: 10,
            registrationsThisMonth: 0,
            limits,
            tenantTimeZoneId: "UTC",
            now);

        Assert.Equal(RegistrationAvailabilityState.ActivityFull, state);
    }

    [Fact]
    public void Evaluate_UsesPlanPausedBeforeClosedAt()
    {
        var activity = CreatePublishedActivity(
            closesAt: new DateTimeOffset(2026, 9, 1, 10, 0, 0, TimeSpan.Zero));
        var limits = TenantPlanLimits.For(TenantPlan.Basic);
        var now = new DateTimeOffset(2026, 9, 2, 0, 0, 0, TimeSpan.Zero);

        var state = RegistrationAvailabilityEvaluator.Evaluate(
            activity,
            registrationCount: 0,
            registrationsThisMonth: limits.RegistrationsPerMonth,
            limits,
            tenantTimeZoneId: "UTC",
            now);

        Assert.Equal(RegistrationAvailabilityState.PlanPaused, state);
    }

    [Fact]
    public void Evaluate_UsesClosedAtBeforeActivityEnded()
    {
        var activity = CreatePublishedActivity(
            closesAt: new DateTimeOffset(2026, 9, 1, 10, 0, 0, TimeSpan.Zero));
        var limits = TenantPlanLimits.For(TenantPlan.Pro);
        var now = new DateTimeOffset(2026, 9, 2, 0, 0, 0, TimeSpan.Zero);

        var state = RegistrationAvailabilityEvaluator.Evaluate(
            activity,
            registrationCount: 0,
            registrationsThisMonth: 0,
            limits,
            tenantTimeZoneId: "UTC",
            now);

        Assert.Equal(RegistrationAvailabilityState.ClosedAt, state);
    }

    [Fact]
    public void Evaluate_ReturnsAvailableWhenOpenAndBeforeCloseAt()
    {
        var activity = CreatePublishedActivity(
            closesAt: new DateTimeOffset(2026, 9, 10, 10, 0, 0, TimeSpan.Zero));
        var limits = TenantPlanLimits.For(TenantPlan.Pro);
        var now = new DateTimeOffset(2026, 9, 1, 0, 0, 0, TimeSpan.Zero);

        var state = RegistrationAvailabilityEvaluator.Evaluate(
            activity,
            registrationCount: 0,
            registrationsThisMonth: 0,
            limits,
            tenantTimeZoneId: "UTC",
            now);

        Assert.Equal(RegistrationAvailabilityState.Available, state);
    }
}
