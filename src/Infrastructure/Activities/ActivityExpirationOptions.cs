namespace Cohestra.Infrastructure.Activities;

public sealed class ActivityExpirationOptions
{
    public const string SectionName = "ActivityExpiration";

    public bool Enabled { get; set; } = true;

    public bool NotifyAdminOnAutoArchive { get; set; } = true;
}
