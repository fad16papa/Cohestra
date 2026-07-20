namespace Cohestra.Domain.Tenants;

/// <summary>
/// Well-known tenant identifiers. Default backfills Platform 0 rows (Story 11.2).
/// </summary>
public static class TenantIds
{
    /// <summary>Slug <c>default</c> — seeded in AddTenantIdToBusinessEntities migration.</summary>
    public static readonly Guid Default = Guid.Parse("11111111-1111-1111-1111-111111111111");

    public const string DefaultSlug = "default";
}
