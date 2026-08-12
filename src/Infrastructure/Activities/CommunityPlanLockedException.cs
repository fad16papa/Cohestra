namespace Cohestra.Infrastructure.Activities;

public sealed class CommunityPlanLockedException(string message) : Exception(message);
