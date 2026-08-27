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
}
