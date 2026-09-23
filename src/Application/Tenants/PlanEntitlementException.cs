namespace Cohestra.Application.Tenants;

/// <summary>
/// Expected plan-capability denial. Mapped to HTTP 403 ProblemDetails with
/// <c>errorCode: plan_locked</c> by the API exception handler.
/// </summary>
public sealed class PlanEntitlementException : Exception
{
    public const string ErrorCodeValue = "plan_locked";

    public PlanEntitlementException(string feature, string requiredPlan, string message)
        : base(message)
    {
        Feature = feature;
        RequiredPlan = requiredPlan;
    }

    public string Feature { get; }

    public string RequiredPlan { get; }

    public string ErrorCode => ErrorCodeValue;
}
