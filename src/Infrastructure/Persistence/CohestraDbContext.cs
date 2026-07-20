using Cohestra.Domain.Activities;
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

public class CohestraDbContext(DbContextOptions<CohestraDbContext> options)
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>(options)
{
    public DbSet<Tenant> Tenants => Set<Tenant>();

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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("public");
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(CohestraDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
