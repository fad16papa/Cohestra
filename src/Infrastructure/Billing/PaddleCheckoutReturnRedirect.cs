using Cohestra.Infrastructure.Tenancy;

namespace Cohestra.Infrastructure.Billing;

public static class PaddleCheckoutReturnRedirect
{
    public static string Build(
        string publicBaseUrl,
        string tenantSlug,
        string transactionId,
        bool paidPlanActivated)
    {
        var path = paidPlanActivated
            ? $"/dashboard?billing=success&session_id={Uri.EscapeDataString(transactionId)}"
            : $"/settings/billing?billing=incomplete&session_id={Uri.EscapeDataString(transactionId)}";
        return TenantPublicWebUrlBuilder.BuildTenantPath(publicBaseUrl, tenantSlug, path);
    }

    /// <summary>
    /// Paddle's Default payment link is also the dashboard Payment link for Incomplete
    /// transactions. Open Paddle.js there when the plan is still unpaid.
    /// </summary>
    public static bool ShouldOpenCheckout(bool paidPlanActivated, string? clientToken) =>
        !paidPlanActivated && !string.IsNullOrWhiteSpace(clientToken);
}
