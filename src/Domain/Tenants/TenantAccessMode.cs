namespace Cohestra.Domain.Tenants;

/// <summary>
/// Admin write/read capability from Status ∩ BillingStatus (FR-3).
/// ReadOnly_OverLimit (FR-24) is a separate overlay — not encoded here.
/// </summary>
public enum TenantAccessMode
{
    Full = 0,
    ReadOnly = 1,
    Blocked = 2,
}
