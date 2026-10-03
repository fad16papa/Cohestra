namespace Cohestra.Application.Clients;

public static class FollowUpCategoryContract
{
    public const string DueNow = "due-now";
    public const string AtRisk = "at-risk";
    public const string Opportunity = "opportunity";
    public const string Healthy = "healthy";

    public const string InvalidCategoryMessage =
        "followUpCategory must be due-now, at-risk, opportunity, or healthy.";

    public static bool TryParse(string? value, out string normalized)
    {
        normalized = (value ?? string.Empty).Trim().ToLowerInvariant();
        return normalized is DueNow or AtRisk or Opportunity or Healthy;
    }
}
