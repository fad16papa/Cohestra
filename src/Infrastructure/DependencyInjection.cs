using Cohestra.Application.Compliance;
using Cohestra.Application.Activities;
using Cohestra.Application.Auth;
using Cohestra.Application.Campaigns;
using Cohestra.Application.Clients;
using Cohestra.Application.Dashboard;
using Cohestra.Application.Email;
using Cohestra.Application.Registrations;
using Cohestra.Application.Reports;
using Cohestra.Application.Site;
using Cohestra.Application.Tenants;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Platform;
using Cohestra.Infrastructure.Seed;
using Cohestra.Infrastructure.Compliance;
using Cohestra.Infrastructure.Campaigns;
using Cohestra.Infrastructure.Clients;
using Cohestra.Infrastructure.Dashboard;
using Cohestra.Infrastructure.Email;
using Cohestra.Infrastructure.Identity;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Registrations;
using Cohestra.Infrastructure.Reports;
using Cohestra.Infrastructure.Site;
using Cohestra.Infrastructure.Tenants;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StackExchange.Redis;

namespace Cohestra.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var postgresConnection = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");

        var redisConnection = configuration.GetConnectionString("Redis")
            ?? throw new InvalidOperationException("Connection string 'Redis' is not configured.");

        services.AddDbContext<CohestraDbContext>(options =>
            options.UseNpgsql(postgresConnection));

        services
            .AddIdentityCore<ApplicationUser>(options =>
            {
                options.User.RequireUniqueEmail = true;
                options.Password.RequireDigit = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireUppercase = true;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequiredLength = 8;
                options.Lockout.AllowedForNewUsers = true;
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
            })
            .AddRoles<IdentityRole<Guid>>()
            .AddSignInManager()
            .AddEntityFrameworkStores<CohestraDbContext>()
            .AddDefaultTokenProviders();

        services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(redisConnection));

        services.Configure<JwtSettings>(configuration.GetSection(JwtSettings.SectionName));
        services.Configure<OperatorSeedSettings>(configuration.GetSection(OperatorSeedSettings.SectionName));
        services.Configure<PlatformAdminSeedSettings>(configuration.GetSection(PlatformAdminSeedSettings.SectionName));
        services.Configure<AuthOtpSettings>(configuration.GetSection(AuthOtpSettings.SectionName));
        services.Configure<DemoDataSeedSettings>(configuration.GetSection(DemoDataSeedSettings.SectionName));
        services.Configure<PublicWebOptions>(configuration.GetSection(PublicWebOptions.SectionName));
        services.Configure<PublicRegistrationRateLimitOptions>(
            configuration.GetSection(PublicRegistrationRateLimitOptions.SectionName));
        services.Configure<RegistrationIdempotencyOptions>(
            configuration.GetSection(RegistrationIdempotencyOptions.SectionName));
        services.Configure<SendGridSettings>(configuration.GetSection(SendGridSettings.SectionName));
        services.Configure<EmailBrandingSettings>(configuration.GetSection(EmailBrandingSettings.SectionName));
        services.Configure<CampaignAssetOptions>(configuration.GetSection(CampaignAssetOptions.SectionName));
        services.Configure<SiteLandingSeedSettings>(configuration.GetSection(SiteLandingSeedSettings.SectionName));
        services.PostConfigure<SiteLandingSeedSettings>(settings => ApplyLandingEnvironmentFallback(settings, configuration));
        services.Configure<SitePreviewSettings>(configuration.GetSection(SitePreviewSettings.SectionName));
        services.Configure<LegalComplianceSettings>(configuration.GetSection(LegalComplianceSettings.SectionName));

        var sendGridSettings = configuration.GetSection(SendGridSettings.SectionName).Get<SendGridSettings>()
            ?? new SendGridSettings();
        SendGridSettingsValidator.ValidateForEnvironment(
            sendGridSettings,
            configuration["ASPNETCORE_ENVIRONMENT"]);

        if (string.IsNullOrWhiteSpace(sendGridSettings.ApiKey))
        {
            services.AddSingleton<IEmailSender, NullEmailSender>();
        }
        else
        {
            services.AddSingleton<IEmailSender, SendGridEmailSender>();
        }

        services.AddScoped<IEmailDeliveryStatusService, EmailDeliveryStatusService>();

        services.AddScoped<IRefreshTokenStore, RedisRefreshTokenStore>();
        services.AddScoped<IAuthOtpStore, RedisOtpStore>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ILegalComplianceService, LegalComplianceService>();
        services.AddScoped<ITenantMembershipService, TenantMembershipService>();
        services.AddScoped<ITenantHostResolver, TenantHostResolver>();
        services.AddScoped<CurrentTenant>();
        services.AddScoped<ICurrentTenant>(sp => sp.GetRequiredService<CurrentTenant>());
        services.AddScoped<ITenantPlanGate, TenantPlanGate>();
        services.AddScoped<RequireProPlanFilter>();
        services.AddScoped<IActivityService, ActivityService>();
        services.AddScoped<ICommunityService, CommunityService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<IClientService, ClientService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IReportService, ReportService>();
        services.AddScoped<IRegistrationService, RegistrationService>();
        services.AddScoped<IRegistrationNotificationService, RegistrationNotificationService>();
        services.AddScoped<IEmailTemplateService, EmailTemplateService>();
        services.AddScoped<IClientSegmentService, ClientSegmentService>();
        services.AddScoped<ICampaignService, CampaignService>();
        services.AddScoped<ICampaignAssetService, CampaignAssetService>();
        services.AddScoped<ISitePageService, SitePageService>();
        services.AddScoped<IPlatformTenantService, PlatformTenantService>();
        services.AddScoped<SitePublishGateValidator>();
        services.AddSingleton<SitePreviewTokenService>();
        services.AddScoped<ClientDeduplicationService>();
        services.AddScoped<RegistrationNumberGenerator>();
        services.AddSingleton<IPublicRegistrationRateLimiter, RedisPublicRegistrationRateLimiter>();
        services.AddSingleton<IRegistrationIdempotencyStore, RedisRegistrationIdempotencyStore>();
        services.AddSingleton<RedisPublicActivityCache>();
        services.AddSingleton<RedisPublishedSiteCache>();
        services.AddSingleton<IPublishedSiteCache>(sp => sp.GetRequiredService<RedisPublishedSiteCache>());
        services.AddSingleton<IDashboardMetricsCache, RedisDashboardMetricsCache>();

        return services;
    }

    private static void ApplyLandingEnvironmentFallback(
        SiteLandingSeedSettings settings,
        IConfiguration configuration)
    {
        ApplyIfSet(configuration["LANDING_SITE_NAME"], value => settings.SiteName = value);
        ApplyIfSet(configuration["LANDING_TAGLINE"], value => settings.Tagline = value);
        ApplyIfSet(configuration["LANDING_DESCRIPTION"], value => settings.Description = value);
        ApplyIfSet(configuration["LANDING_EYEBROW"], value => settings.Eyebrow = value);
        ApplyIfSet(configuration["LANDING_OPERATOR_CTA"], value => settings.OperatorCtaLabel = value);
    }

    private static void ApplyIfSet(string? value, Action<string> apply)
    {
        if (!string.IsNullOrWhiteSpace(value))
        {
            apply(value.Trim());
        }
    }
}
