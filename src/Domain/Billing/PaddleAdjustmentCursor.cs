namespace Cohestra.Domain.Billing;

/// <summary>
/// Latest observed Paddle adjustment per adjustment id (platform-scoped).
/// Stale/out-of-order notifications must not apply after a newer status.
/// </summary>
public sealed class PaddleAdjustmentCursor
{
    public string AdjustmentId { get; set; } = string.Empty;

    public DateTimeOffset OccurredAt { get; set; }

    public string Status { get; set; } = string.Empty;

    public string Action { get; set; } = string.Empty;
}
