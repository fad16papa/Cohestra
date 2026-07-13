using LeadGenerationCrm.Domain.Activities;
using LeadGenerationCrm.Domain.Campaigns;
using LeadGenerationCrm.Domain.Clients;
using LeadGenerationCrm.Domain.Registrations;
using LeadGenerationCrm.Domain.Site;
using LeadGenerationCrm.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace LeadGenerationCrm.Infrastructure.Persistence;

public class LeadGenerationCrmDbContext(DbContextOptions<LeadGenerationCrmDbContext> options)
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>(options)
{
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
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(LeadGenerationCrmDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
