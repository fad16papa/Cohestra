namespace Cohestra.Domain.Tenants;

/// <summary>Immutable platform lifecycle audit entry (FR-18 / Story 11.3).</summary>
public sealed class PlatformAuditLog
{
    public Guid Id { get; set; }

    public Guid ActorUserId { get; set; }

    public Guid TenantId { get; set; }

    public PlatformAuditAction Action { get; set; }

    public string? Reason { get; set; }

    public string? DetailsJson { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
