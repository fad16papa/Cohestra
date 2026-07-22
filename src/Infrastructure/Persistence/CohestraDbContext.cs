using System.Linq.Expressions;
using System.Reflection;
using Cohestra.Application.Tenants;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Campaigns;
using Cohestra.Domain.Clients;
using Cohestra.Domain.Registrations;
using Cohestra.Domain.Site;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Persistence;

public class CohestraDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
{
    private readonly ICurrentTenant? _currentTenant;

    /// <summary>
    /// Design-time / bare tests without DI: filter defaults to Platform 0.
    /// Production always injects <see cref="ICurrentTenant"/> (fail-closed when unresolved).
    /// </summary>
    public CohestraDbContext(DbContextOptions<CohestraDbContext> options)
        : this(options, currentTenant: null)
    {
    }

    public CohestraDbContext(
        DbContextOptions<CohestraDbContext> options,
        ICurrentTenant? currentTenant)
        : base(options)
    {
        _currentTenant = currentTenant;
    }

    /// <summary>
    /// Evaluated per query by EF global filters. Unresolved ambient tenant → <see cref="Guid.Empty"/> (no rows).
    /// Null injector (design-time/tests) → <see cref="TenantIds.Default"/>.
    /// </summary>
    public Guid TenantFilterTenantId
    {
        get
        {
            if (_currentTenant is null)
            {
                return TenantIds.Default;
            }

            if (_currentTenant.IsResolved
                && _currentTenant.TenantId is Guid id
                && id != Guid.Empty)
            {
                return id;
            }

            return Guid.Empty;
        }
    }

    public DbSet<Tenant> Tenants => Set<Tenant>();

    public DbSet<TenantMembership> TenantMemberships => Set<TenantMembership>();

    public DbSet<PlatformAuditLog> PlatformAuditLogs => Set<PlatformAuditLog>();

    public DbSet<Activity> Activities => Set<Activity>();

    public DbSet<Community> Communities => Set<Community>();

    public DbSet<Category> Categories => Set<Category>();

    public DbSet<Client> Clients => Set<Client>();

    public DbSet<Registration> Registrations => Set<Registration>();

    public DbSet<ClientTimelineEvent> ClientTimelineEvents => Set<ClientTimelineEvent>();

    public DbSet<EmailTemplate> EmailTemplates => Set<EmailTemplate>();

    public DbSet<Campaign> Campaigns => Set<Campaign>();

    public DbSet<CampaignRecipient> CampaignRecipients => Set<CampaignRecipient>();

    public DbSet<CampaignAsset> CampaignAssets => Set<CampaignAsset>();

    public DbSet<SitePage> SitePages => Set<SitePage>();

    public DbSet<SiteHomepageTemplate> SiteHomepageTemplates => Set<SiteHomepageTemplate>();

    public DbSet<StripeWebhookEvent> StripeWebhookEvents => Set<StripeWebhookEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("public");
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(CohestraDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
        ApplyTenantQueryFilters(modelBuilder);
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        ApplyTenantIdsOnInsert();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(
        bool acceptAllChangesOnSuccess,
        CancellationToken cancellationToken = default)
    {
        ApplyTenantIdsOnInsert();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    /// <summary>
    /// Platform Admin aggregate/audit paths over tenant-owned tables — only approved bypass (AD-1).
    /// Clears all EF global query filters on <typeparamref name="TEntity"/> (today: tenant filter only).
    /// </summary>
    public IQueryable<TEntity> IgnoreTenantFilters<TEntity>()
        where TEntity : class =>
        Set<TEntity>().IgnoreQueryFilters();

    private void ApplyTenantQueryFilters(ModelBuilder modelBuilder)
    {
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (!typeof(ITenantScoped).IsAssignableFrom(entityType.ClrType))
            {
                continue;
            }

            var method = typeof(CohestraDbContext)
                .GetMethod(nameof(SetTenantQueryFilter), BindingFlags.NonPublic | BindingFlags.Instance)!
                .MakeGenericMethod(entityType.ClrType);
            method.Invoke(this, [modelBuilder]);
        }
    }

    private void SetTenantQueryFilter<TEntity>(ModelBuilder modelBuilder)
        where TEntity : class, ITenantScoped
    {
        Expression<Func<TEntity, bool>> filter = e => e.TenantId == TenantFilterTenantId;
        modelBuilder.Entity<TEntity>().HasQueryFilter(filter);
    }

    /// <summary>
    /// Stamp empty TenantId from ambient context when resolved; else Platform 0 for seed/design-time.
    /// </summary>
    private void ApplyTenantIdsOnInsert()
    {
        Guid stamp;
        if (_currentTenant is { IsResolved: true, TenantId: { } id } && id != Guid.Empty)
        {
            stamp = id;
        }
        else
        {
            stamp = TenantIds.Default;
        }

        foreach (var entry in ChangeTracker.Entries<ITenantScoped>())
        {
            if (entry.State == EntityState.Added && entry.Entity.TenantId == Guid.Empty)
            {
                entry.Entity.TenantId = stamp;
            }
        }
    }
}
