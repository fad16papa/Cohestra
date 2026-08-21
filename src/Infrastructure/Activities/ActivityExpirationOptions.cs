namespace Cohestra.Infrastructure.Activities;

public sealed class ActivityExpirationOptions
{
    public const string SectionName = "ActivityExpiration";

    public bool Enabled { get; set; } = true;

    public bool NotifyAdminOnAutoArchive { get; set; } = true;

    public bool NotifyTeamOnAutoArchive { get; set; } = true;

    public bool NotifyAdminOnExpiringSoon { get; set; } = true;

    public bool NotifyTeamOnExpiringSoon { get; set; } = true;

    public bool NotifyOnExpiringSoon { get; set; } = true;

    public int ExpiringSoonHoursBeforeEnd { get; set; } = 24;

    public int ExpiringSoonCatchUpGraceHours { get; set; } = 1;
}
