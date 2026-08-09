using Cohestra.Application.Tenants;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Clients;
using Cohestra.Domain.Registrations;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Identity;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Registrations;
using Cohestra.Infrastructure.Site;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Seed;

/// <summary>
/// Seeds five load-test tenants (2 Core, 2 Pro, 1 Basic) with realistic volumes.
/// </summary>
public static class LoadTestDataSeeder
{
    public const string EmailDomain = "cohestra.local";
    public const string SlugPrefix = LoadTestTenantRules.SlugPrefix;
    public const string DefaultPassword = "LoadTest123!";
    internal const string LoadCoreAlphaSlug = "load-core-alpha";

    internal static readonly string[] LoadCoreAlphaCalendarConflictSampleSlugs =
    [
        "load-core-alpha-001",
        "load-core-alpha-002",
        "load-core-alpha-003",
    ];

    /// <summary>Days from seed anchor for calendar conflict sample activities.</summary>
    internal const int CalendarConflictDayOffsetDays = 10;

    public static bool IsLoadTestAdminEmail(string? email) =>
        !string.IsNullOrWhiteSpace(email)
        && email.EndsWith($"@{EmailDomain}", StringComparison.OrdinalIgnoreCase)
        && email.StartsWith("load.", StringComparison.OrdinalIgnoreCase);

    private static readonly string[] CategoryNames = ["Sports", "Social", "Wellness"];

    private static readonly string[] ActivityThemes =
    [
        "Open Session",
        "Skills Clinic",
        "Community Meetup",
        "Weekend Workshop",
        "Intro Class",
        "Member Social",
        "Training Block",
        "Season Opener",
        "Evening Session",
        "Monthly Gathering",
    ];

    private static readonly string[] FirstNames =
    [
        "Ava", "Noah", "Mia", "Ethan", "Liam", "Sophia", "Lucas", "Emma", "Olivia", "James",
        "Isabella", "Benjamin", "Charlotte", "Henry", "Amelia", "Daniel", "Harper", "Michael", "Ella", "Alexander",
    ];

    private static readonly string[] LastNames =
    [
        "Tan", "Lim", "Ng", "Wong", "Chen", "Patel", "Garcia", "Kim", "Singh", "Martinez",
        "Lee", "Brown", "Santos", "Rivera", "Nguyen", "Ali", "Khan", "Reyes", "Chua", "Diaz",
    ];

    private static readonly string[] Professions =
    [
        "Software Engineer", "Teacher", "Nurse", "Graphic Designer", "Accountant",
        "Marketing Manager", "Physiotherapist", "Product Manager", "Chef", "Architect",
    ];

    private static readonly string[] Nationalities =
    [
        "Singaporean", "Filipino", "Malaysian", "Indonesian", "British",
        "American", "Australian", "Indian", "Japanese", "Thai",
    ];

    private static readonly LeadStatus[] LeadStatuses =
    [
        LeadStatus.New,
        LeadStatus.Contacted,
        LeadStatus.Active,
        LeadStatus.Inactive,
    ];

    internal static readonly LoadTestTenantSpec[] TenantSpecs =
    [
        new(
            "load-core-alpha",
            "Load Test Core Alpha",
            TenantPlan.Core,
            "load.core.alpha@cohestra.local",
            Communities: 3,
            PublishedActivities: 12,
            DraftActivities: 10,
            ArchivedActivities: 15,
            RegistrationsThisMonth: 1_000),
        new(
            "load-core-beta",
            "Load Test Core Beta",
            TenantPlan.Core,
            "load.core.beta@cohestra.local",
            Communities: 3,
            PublishedActivities: 12,
            DraftActivities: 10,
            ArchivedActivities: 15,
            RegistrationsThisMonth: 1_000),
        new(
            "load-pro-alpha",
            "Load Test Pro Alpha",
            TenantPlan.Pro,
            "load.pro.alpha@cohestra.local",
            Communities: 10,
            PublishedActivities: 50,
            DraftActivities: 20,
            ArchivedActivities: 30,
            RegistrationsThisMonth: 5_000),
        new(
            "load-pro-beta",
            "Load Test Pro Beta",
            TenantPlan.Pro,
            "load.pro.beta@cohestra.local",
            Communities: 10,
            PublishedActivities: 50,
            DraftActivities: 20,
            ArchivedActivities: 30,
            RegistrationsThisMonth: 5_000),
        new(
            "load-basic-alpha",
            "Load Test Basic Alpha",
            TenantPlan.Basic,
            "load.basic.alpha@cohestra.local",
            Communities: 1,
            PublishedActivities: 4,
            DraftActivities: 10,
            ArchivedActivities: 10,
            RegistrationsThisMonth: 250),
    ];

    public static async Task BootstrapLoginsAsync(
        IServiceProvider services,
        CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        var settings = scope.ServiceProvider.GetRequiredService<IOptions<LoadTestDataSeedSettings>>().Value;
        if (!settings.Enabled)
        {
            return;
        }

        var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("LoadTestDataSeeder");
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var membershipService = scope.ServiceProvider.GetRequiredService<ITenantMembershipService>();

        await OperatorSeeder.EnsureTenantAdminRoleAsync(roleManager, logger, cancellationToken);

        await EnsureLoadTestTenantsNotComplimentaryAsync(dbContext, logger, cancellationToken);

        var password = string.IsNullOrWhiteSpace(settings.Password) ? DefaultPassword : settings.Password;
        var now = DateTimeOffset.UtcNow;

        foreach (var spec in TenantSpecs)
        {
            var tenant = await dbContext.Tenants
                .FirstOrDefaultAsync(t => t.Slug == spec.Slug, cancellationToken);

            if (tenant is null)
            {
                tenant = new Tenant
                {
                    Id = Guid.CreateVersion7(),
                    Slug = spec.Slug,
                    Name = spec.DisplayName,
                    AdminContactEmail = spec.AdminEmail,
                    Plan = spec.Plan,
                    Status = TenantStatus.Active,
                    BillingStatus = BillingStatus.Free,
                    IsComplimentary = false,
                    LegalAcceptedAt = now,
                    TermsVersion = "2026-load-test",
                    PrivacyVersion = "2026-load-test",
                    CreatedAt = now,
                    UpdatedAt = now,
                };
                dbContext.Tenants.Add(tenant);
                await dbContext.SaveChangesAsync(cancellationToken);
                logger.LogInformation("Created load-test tenant {Slug} (login bootstrap).", spec.Slug);
            }

            await EnsureAdminUserAsync(
                userManager,
                membershipService,
                tenant.Id,
                spec.AdminEmail,
                password,
                logger,
                cancellationToken);
        }

        logger.LogInformation(
            "Load-test logins are ready (example: {Email}). Full volume seed continues in background.",
            TenantSpecs[0].AdminEmail);
    }

    public static async Task SeedAsync(
        IServiceProvider services,
        CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        var settings = scope.ServiceProvider.GetRequiredService<IOptions<LoadTestDataSeedSettings>>().Value;
        if (!settings.Enabled)
        {
            return;
        }

        var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("LoadTestDataSeeder");

        logger.LogInformation(
            "Load test seed starting (5 tenants — may take several minutes on first run). ForceReseed={ForceReseed}.",
            settings.ForceReseed);

        var existingSlugs = await dbContext.Tenants
            .AsNoTracking()
            .Where(t => TenantSpecs.Select(s => s.Slug).Contains(t.Slug))
            .Select(t => t.Slug)
            .ToListAsync(cancellationToken);

        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var membershipService = scope.ServiceProvider.GetRequiredService<ITenantMembershipService>();

        await OperatorSeeder.EnsureTenantAdminRoleAsync(roleManager, logger, cancellationToken);

        await EnsureLoadTestTenantsNotComplimentaryAsync(dbContext, logger, cancellationToken);

        var password = string.IsNullOrWhiteSpace(settings.Password) ? DefaultPassword : settings.Password;

        var shouldReseed = settings.ForceReseed;
        if (existingSlugs.Count > 0 && !shouldReseed)
        {
            if (await IsLoadTestSeedCompleteAsync(dbContext, cancellationToken))
            {
                await EnsureLoadTestAdminUsersAsync(
                    dbContext,
                    userManager,
                    membershipService,
                    password,
                    logger,
                    cancellationToken);

                await EnsureLoadTestSitePagesAsync(
                    scope.ServiceProvider,
                    dbContext,
                    logger,
                    cancellationToken);

                await BackfillAllLoadTestActivitySchedulesAsync(
                    dbContext,
                    DateTimeOffset.UtcNow,
                    logger,
                    cancellationToken);

                await EnsureLoadCoreAlphaCalendarConflictSchedulesAsync(
                    dbContext,
                    DateTimeOffset.UtcNow,
                    logger,
                    cancellationToken);

                logger.LogInformation(
                    "Load test data already present ({Count} tenant(s)). Ensured admin users, memberships, and calendar schedules. Set LoadTestSeed:ForceReseed=true to replace data.",
                    existingSlugs.Count);
                return;
            }

            logger.LogWarning(
                "Load test seed is incomplete (a previous run may have failed). Continuing data seed without wipe.");
        }

        if (shouldReseed && existingSlugs.Count > 0)
        {
            await WipeLoadTestTenantsAsync(scope.ServiceProvider, dbContext, logger, cancellationToken);
        }

        var monthStart = new DateTimeOffset(
            DateTime.UtcNow.Year,
            DateTime.UtcNow.Month,
            1,
            0,
            0,
            0,
            TimeSpan.Zero);
        var now = DateTimeOffset.UtcNow;
        var formSchema = CreateMinimalFormSchema();
        var registrationSequence = await GetNextRegistrationSequenceAsync(dbContext, now, cancellationToken);

        foreach (var spec in TenantSpecs)
        {
            var tenant = await dbContext.Tenants
                .FirstOrDefaultAsync(t => t.Slug == spec.Slug, cancellationToken);

            Guid tenantId;
            if (tenant is null)
            {
                tenantId = Guid.CreateVersion7();
                dbContext.Tenants.Add(new Tenant
                {
                    Id = tenantId,
                    Slug = spec.Slug,
                    Name = spec.DisplayName,
                    AdminContactEmail = spec.AdminEmail,
                    Plan = spec.Plan,
                    Status = TenantStatus.Active,
                    BillingStatus = BillingStatus.Free,
                    IsComplimentary = false,
                    LegalAcceptedAt = now,
                    TermsVersion = "2026-load-test",
                    PrivacyVersion = "2026-load-test",
                    CreatedAt = now,
                    UpdatedAt = now,
                });

                await dbContext.SaveChangesAsync(cancellationToken);
            }
            else
            {
                tenantId = tenant.Id;
            }

            await EnsureAdminUserAsync(
                userManager,
                membershipService,
                tenantId,
                spec.AdminEmail,
                password,
                logger,
                cancellationToken);

            var expectedActivities =
                spec.PublishedActivities + spec.DraftActivities + spec.ArchivedActivities;
            var existingActivities = await dbContext.Activities
                .CountAsync(a => a.TenantId == tenantId, cancellationToken);
            if (existingActivities >= expectedActivities)
            {
                await BackfillLoadTestActivitySchedulesAsync(
                    dbContext,
                    tenantId,
                    now,
                    logger,
                    cancellationToken);

                logger.LogInformation(
                    "Skipping load test data seed for {Slug} — activities already present (schedules backfilled for calendar).",
                    spec.Slug);
                continue;
            }

            SeedTenantContext.BindTenant(scope.ServiceProvider, tenantId, spec.Slug);

            for (var categoryIndex = 0; categoryIndex < CategoryNames.Length; categoryIndex++)
            {
                dbContext.Categories.Add(new Category
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    Name = CategoryNames[categoryIndex],
                    CreatedAt = now,
                    UpdatedAt = now,
                });
            }

            for (var communityIndex = 0; communityIndex < spec.Communities; communityIndex++)
            {
                var communityName = $"{spec.DisplayName} Community {communityIndex + 1}";
                dbContext.Communities.Add(new Community
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    Name = communityName,
                    CreatedAt = now,
                    UpdatedAt = now,
                });
            }

            var activityStatuses = BuildActivityStatusList(
                spec.PublishedActivities,
                spec.DraftActivities,
                spec.ArchivedActivities);

            var publishedActivityIds = new List<Guid>(spec.PublishedActivities);
            var activityOrdinal = 0;
            foreach (var status in activityStatuses)
            {
                activityOrdinal++;
                var communityIndex = (activityOrdinal - 1) % spec.Communities;
                var communityName = $"{spec.DisplayName} Community {communityIndex + 1}";
                var theme = ActivityThemes[(activityOrdinal - 1) % ActivityThemes.Length];
                var activityName = $"{communityName} {theme} {activityOrdinal:D3}";
                var activitySlug = ActivitySlugGenerator.Slugify($"{spec.Slug}-{activityOrdinal:D3}");

                var activityId = Guid.NewGuid();
                var activity = new Activity
                {
                    Id = activityId,
                    TenantId = tenantId,
                    Name = activityName,
                    Slug = activitySlug,
                    Category = CategoryNames[communityIndex % CategoryNames.Length],
                    Schedule = SeedActivityScheduleFormatter.FormatSpreadSchedule(
                        now,
                        activityOrdinal,
                        expectedActivities),
                    Location = $"{communityName} Venue",
                    CommunityLabel = communityName,
                    Status = status,
                    FormSchema = formSchema,
                    CreatedAt = now.AddDays(-30 - activityOrdinal),
                    UpdatedAt = now,
                };

                dbContext.Activities.Add(activity);
                if (status == ActivityStatus.Published)
                {
                    publishedActivityIds.Add(activityId);
                }
            }

            var publishedCount = publishedActivityIds.Count;
            var minClientsForUniqueRegistrations = (int)Math.Ceiling(
                spec.RegistrationsThisMonth / (double)publishedCount);
            var clientCount = Math.Clamp(minClientsForUniqueRegistrations, 50, 2_000);
            if (clientCount < minClientsForUniqueRegistrations)
            {
                throw new InvalidOperationException(
                    $"Load test spec {spec.Slug} needs at least {minClientsForUniqueRegistrations} clients " +
                    $"for {spec.RegistrationsThisMonth} unique registrations across {publishedCount} published activities.");
            }

            var clients = new List<Client>(clientCount);
            for (var clientIndex = 1; clientIndex <= clientCount; clientIndex++)
            {
                var firstName = FirstNames[(clientIndex - 1) % FirstNames.Length];
                var lastName = LastNames[(clientIndex + spec.Slug.Length) % LastNames.Length];
                var email = $"load.{spec.Slug.Replace('-', '.')}.client{clientIndex:D4}@{EmailDomain}";
                var phoneRaw = $"+6592{clientIndex:D7}";
                var normalizedPhone = ClientContactNormalizer.NormalizePhone(phoneRaw, "SG");
                var normalizedEmail = ClientContactNormalizer.NormalizeEmail(email);

                var client = new Client
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    FullName = $"{firstName} {lastName}",
                    Email = email,
                    NormalizedEmail = normalizedEmail,
                    Phone = phoneRaw,
                    NormalizedPhone = normalizedPhone,
                    Profession = Professions[(clientIndex - 1) % Professions.Length],
                    Nationality = Nationalities[(clientIndex + 2) % Nationalities.Length],
                    ConsentGiven = true,
                    ReferralSource = "Load test seed",
                    LeadStatus = LeadStatuses[(clientIndex - 1) % LeadStatuses.Length],
                    CreatedAt = now.AddDays(-clientIndex % 28),
                    UpdatedAt = now,
                };

                clients.Add(client);
                dbContext.Clients.Add(client);
            }

            if (publishedActivityIds.Count == 0)
            {
                throw new InvalidOperationException(
                    $"Load test spec {spec.Slug} has no published activities for registrations.");
            }

            var registrationSpanMinutes = Math.Max(1, (int)(now - monthStart).TotalMinutes);
            for (var registrationIndex = 0; registrationIndex < spec.RegistrationsThisMonth; registrationIndex++)
            {
                var (activityIndex, clientIndex) = ResolveRegistrationAssignment(
                    registrationIndex,
                    publishedCount,
                    clientCount);
                var activityId = publishedActivityIds[activityIndex];
                var client = clients[clientIndex];
                registrationSequence++;

                var createdAt = monthStart.AddMinutes(
                    registrationIndex * registrationSpanMinutes / Math.Max(1, spec.RegistrationsThisMonth));

                dbContext.Registrations.Add(new Registration
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    RegistrationNumber = RegistrationNumberGenerator.Format(now, registrationSequence),
                    ActivityId = activityId,
                    ClientId = client.Id,
                    Answers = new Dictionary<string, object?>
                    {
                        ["full_name"] = client.FullName,
                        ["email"] = client.Email,
                        ["phone"] = client.Phone,
                        ["consent"] = client.ConsentGiven,
                    },
                    CreatedAt = createdAt,
                });
            }

            logger.LogInformation(
                "Seeded load test tenant {Slug} ({Plan}): {Communities} communities, {Published} published, {Drafts} drafts, {Archived} archived, {Registrations} registrations this month.",
                spec.Slug,
                spec.Plan,
                spec.Communities,
                spec.PublishedActivities,
                spec.DraftActivities,
                spec.ArchivedActivities,
                spec.RegistrationsThisMonth);

            await dbContext.SaveChangesAsync(cancellationToken);

            if (spec.Slug == LoadCoreAlphaSlug)
            {
                await EnsureLoadCoreAlphaCalendarConflictSchedulesAsync(
                    dbContext,
                    now,
                    logger,
                    cancellationToken);
            }

            if (spec.Plan is TenantPlan.Core or TenantPlan.Pro)
            {
                await EnsureLoadTestSitePageAsync(
                    scope.ServiceProvider,
                    dbContext,
                    tenantId,
                    spec.DisplayName,
                    logger,
                    cancellationToken);
            }
        }

        logger.LogInformation(
            "Load test seed complete for {Count} tenants. Login at http://{{slug}}.localhost:8088/login (tenant subdomain required).",
            TenantSpecs.Length);
    }

    internal static List<ActivityStatus> BuildActivityStatusList(
        int published,
        int drafts,
        int archived)
    {
        var statuses = new List<ActivityStatus>(published + drafts + archived);
        statuses.AddRange(Enumerable.Repeat(ActivityStatus.Published, published));
        statuses.AddRange(Enumerable.Repeat(ActivityStatus.Draft, drafts));
        statuses.AddRange(Enumerable.Repeat(ActivityStatus.Archived, archived));
        return statuses;
    }

    /// <summary>
    /// Maps a registration index to a unique (activity, client) pair before pairs repeat.
    /// </summary>
    internal static (int ActivityIndex, int ClientIndex) ResolveRegistrationAssignment(
        int registrationIndex,
        int publishedActivityCount,
        int clientCount)
    {
        if (publishedActivityCount < 1)
        {
            throw new ArgumentOutOfRangeException(nameof(publishedActivityCount));
        }

        if (clientCount < 1)
        {
            throw new ArgumentOutOfRangeException(nameof(clientCount));
        }

        var activityIndex = registrationIndex % publishedActivityCount;
        var clientIndex = registrationIndex / publishedActivityCount;
        if (clientIndex >= clientCount)
        {
            throw new InvalidOperationException(
                $"Registration index {registrationIndex} requires client slot {clientIndex + 1}, " +
                $"but only {clientCount} clients are available for {publishedActivityCount} published activities.");
        }

        return (activityIndex, clientIndex);
    }

    /// <summary>
    /// Load-test workspaces are paid-plan QA fixtures — not platform-sponsored tenants.
    /// Clears legacy complimentary flags so billing UI and Stripe portal behave like real customers.
    /// </summary>
    private static async Task EnsureLoadTestTenantsNotComplimentaryAsync(
        CohestraDbContext dbContext,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var loadTestSlugs = TenantSpecs.Select(spec => spec.Slug).ToArray();
        var complimentary = await dbContext.Tenants
            .Where(t => loadTestSlugs.Contains(t.Slug) && t.IsComplimentary)
            .ToListAsync(cancellationToken);

        if (complimentary.Count == 0)
        {
            return;
        }

        var now = DateTimeOffset.UtcNow;
        foreach (var tenant in complimentary)
        {
            tenant.IsComplimentary = false;
            tenant.UpdatedAt = now;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        logger.LogInformation(
            "Cleared complimentary flag on {Count} load-test tenant(s) for billing QA.",
            complimentary.Count);
    }

    private static async Task<bool> IsLoadTestSeedCompleteAsync(
        CohestraDbContext dbContext,
        CancellationToken cancellationToken)
    {
        foreach (var spec in TenantSpecs)
        {
            var tenant = await dbContext.Tenants
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Slug == spec.Slug, cancellationToken);
            if (tenant is null)
            {
                return false;
            }

            var expectedActivities =
                spec.PublishedActivities + spec.DraftActivities + spec.ArchivedActivities;
            var activityCount = await dbContext.Activities
                .AsNoTracking()
                .CountAsync(a => a.TenantId == tenant.Id, cancellationToken);
            if (activityCount != expectedActivities)
            {
                return false;
            }

            var registrationCount = await dbContext.Registrations
                .AsNoTracking()
                .CountAsync(r => r.TenantId == tenant.Id, cancellationToken);
            if (registrationCount != spec.RegistrationsThisMonth)
            {
                return false;
            }

            if (spec.Plan is TenantPlan.Core or TenantPlan.Pro)
            {
                var hasPublishedSite = await dbContext.SitePages
                    .AsNoTracking()
                    .AnyAsync(
                        p => p.TenantId == tenant.Id
                            && p.PublishedSections != null
                            && p.PublishedAt != null,
                        cancellationToken);
                if (!hasPublishedSite)
                {
                    return false;
                }
            }
        }

        return true;
    }

    private static async Task EnsureLoadTestSitePagesAsync(
        IServiceProvider scopedServices,
        CohestraDbContext dbContext,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var tenants = await dbContext.Tenants
            .AsNoTracking()
            .Where(t => TenantSpecs.Select(s => s.Slug).Contains(t.Slug))
            .ToListAsync(cancellationToken);

        foreach (var spec in TenantSpecs.Where(spec => spec.Plan is TenantPlan.Core or TenantPlan.Pro))
        {
            var tenant = tenants.FirstOrDefault(t => t.Slug == spec.Slug);
            if (tenant is null)
            {
                continue;
            }

            await EnsureLoadTestSitePageAsync(
                scopedServices,
                dbContext,
                tenant.Id,
                spec.DisplayName,
                logger,
                cancellationToken);
        }
    }

    private static async Task EnsureLoadTestSitePageAsync(
        IServiceProvider scopedServices,
        CohestraDbContext dbContext,
        Guid tenantId,
        string tenantDisplayName,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var publishedSiteCache = scopedServices.GetRequiredService<IPublishedSiteCache>();
        var landingSettings = scopedServices.GetRequiredService<IOptions<SiteLandingSeedSettings>>();

        await SitePageCoreSeedHelper.EnsureCoreSitePageAsync(
            dbContext,
            publishedSiteCache,
            landingSettings,
            logger,
            tenantId,
            tenantDisplayName,
            cancellationToken);
    }

    private static async Task BackfillAllLoadTestActivitySchedulesAsync(
        CohestraDbContext dbContext,
        DateTimeOffset now,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        foreach (var spec in TenantSpecs)
        {
            var tenant = await dbContext.Tenants
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Slug == spec.Slug, cancellationToken);

            if (tenant is null)
            {
                continue;
            }

            await BackfillLoadTestActivitySchedulesAsync(
                dbContext,
                tenant.Id,
                now,
                logger,
                cancellationToken);
        }

        await EnsureLoadCoreAlphaCalendarConflictSchedulesAsync(
            dbContext,
            now,
            logger,
            cancellationToken);
    }

    internal static async Task EnsureLoadCoreAlphaCalendarConflictSchedulesAsync(
        CohestraDbContext dbContext,
        DateTimeOffset now,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var tenantId = await dbContext.Tenants
            .AsNoTracking()
            .Where(t => t.Slug == LoadCoreAlphaSlug)
            .Select(t => t.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (tenantId == Guid.Empty)
        {
            return;
        }

        var sampleActivities = await dbContext.Activities
            .Where(a =>
                a.TenantId == tenantId
                && a.Status == ActivityStatus.Published
                && LoadCoreAlphaCalendarConflictSampleSlugs.Contains(a.Slug))
            .ToListAsync(cancellationToken);

        var publishedActivities = LoadCoreAlphaCalendarConflictSampleSlugs
            .Select(slug => sampleActivities.FirstOrDefault(activity => activity.Slug == slug))
            .Where(activity => activity is not null)
            .Cast<Activity>()
            .ToList();

        if (publishedActivities.Count < 2)
        {
            logger.LogWarning(
                "Skipping calendar conflict samples for {Slug}: need at least 2 published sample activities ({Slugs}).",
                LoadCoreAlphaSlug,
                string.Join(", ", LoadCoreAlphaCalendarConflictSampleSlugs));
            return;
        }

        var conflictDay = now.UtcDateTime.Date.AddDays(CalendarConflictDayOffsetDays);
        var samples = new (int Hour, int Minute)[]
        {
            (13, 0),
            (13, 30),
            (15, 0),
        };

        var updated = 0;
        for (var index = 0; index < publishedActivities.Count && index < samples.Length; index++)
        {
            var sample = samples[index];
            var desired = SeedActivityScheduleFormatter.FormatExplicitSchedule(
                conflictDay,
                sample.Hour,
                sample.Minute);

            if (publishedActivities[index].Schedule == desired)
            {
                continue;
            }

            publishedActivities[index].Schedule = desired;
            publishedActivities[index].UpdatedAt = now;
            updated++;
        }

        if (updated == 0)
        {
            return;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Applied calendar conflict sample schedules for {Slug}: {Updated} activities on {ConflictDay:yyyy-MM-dd} (1:00 pm / 1:30 pm overlap, 3:00 pm same day).",
            LoadCoreAlphaSlug,
            updated,
            conflictDay);
    }

    private static async Task BackfillLoadTestActivitySchedulesAsync(
        CohestraDbContext dbContext,
        Guid tenantId,
        DateTimeOffset now,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var activities = await dbContext.Activities
            .Where(a => a.TenantId == tenantId)
            .OrderBy(a => a.CreatedAt)
            .ThenBy(a => a.Name)
            .ToListAsync(cancellationToken);

        if (activities.Count == 0)
        {
            return;
        }

        var total = activities.Count;
        var updated = 0;

        for (var index = 0; index < activities.Count; index++)
        {
            var desired = SeedActivityScheduleFormatter.FormatSpreadSchedule(
                now,
                index + 1,
                total,
                minuteOffset: index % 4 * 15);

            if (activities[index].Schedule == desired)
            {
                continue;
            }

            activities[index].Schedule = desired;
            activities[index].UpdatedAt = now;
            updated++;
        }

        if (updated == 0)
        {
            return;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        var slug = await dbContext.Tenants
            .AsNoTracking()
            .Where(t => t.Id == tenantId)
            .Select(t => t.Slug)
            .FirstOrDefaultAsync(cancellationToken);

        logger.LogInformation(
            "Backfilled calendar schedules for {Updated}/{Total} activities on {Slug}.",
            updated,
            total,
            slug ?? tenantId.ToString());
    }

    private static async Task EnsureLoadTestAdminUsersAsync(
        CohestraDbContext dbContext,
        UserManager<ApplicationUser> userManager,
        ITenantMembershipService membershipService,
        string password,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var tenants = await dbContext.Tenants
            .AsNoTracking()
            .Where(t => TenantSpecs.Select(s => s.Slug).Contains(t.Slug))
            .ToListAsync(cancellationToken);

        foreach (var spec in TenantSpecs)
        {
            var tenant = tenants.FirstOrDefault(t => t.Slug == spec.Slug);
            if (tenant is null)
            {
                continue;
            }

            await EnsureAdminUserAsync(
                userManager,
                membershipService,
                tenant.Id,
                spec.AdminEmail,
                password,
                logger,
                cancellationToken);
        }
    }

    private static async Task EnsureAdminUserAsync(
        UserManager<ApplicationUser> userManager,
        ITenantMembershipService membershipService,
        Guid tenantId,
        string email,
        string password,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var user = await userManager.FindByEmailAsync(email);
        if (user is null)
        {
            user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                EmailConfirmed = true,
            };

            var createResult = await userManager.CreateAsync(user, password);
            if (!createResult.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Failed to create load test admin {email}: " +
                    string.Join(", ", createResult.Errors.Select(e => e.Description)));
            }

            if (!await RoleExclusivity.CanAssignTenantAdminAsync(userManager, user, logger))
            {
                await userManager.DeleteAsync(user);
                throw new InvalidOperationException(
                    $"Failed to assign TenantAdmin to {email}: role exclusivity conflict.");
            }

            var roleResult = await userManager.AddToRoleAsync(user, OperatorSeeder.TenantAdminRole);
            if (!roleResult.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Failed to assign TenantAdmin role to {email}: " +
                    string.Join(", ", roleResult.Errors.Select(e => e.Description)));
            }
        }
        else
        {
            if (!user.EmailConfirmed)
            {
                user.EmailConfirmed = true;
                var confirmResult = await userManager.UpdateAsync(user);
                if (!confirmResult.Succeeded)
                {
                    throw new InvalidOperationException(
                        $"Failed to confirm email for load test admin {email}: " +
                        string.Join(", ", confirmResult.Errors.Select(e => e.Description)));
                }
            }

            if (!await userManager.CheckPasswordAsync(user, password))
            {
                var resetToken = await userManager.GeneratePasswordResetTokenAsync(user);
                var resetResult = await userManager.ResetPasswordAsync(user, resetToken, password);
                if (!resetResult.Succeeded)
                {
                    throw new InvalidOperationException(
                        $"Failed to reset password for load test admin {email}: " +
                        string.Join(", ", resetResult.Errors.Select(e => e.Description)));
                }
            }

            if (!await userManager.IsInRoleAsync(user, OperatorSeeder.TenantAdminRole))
            {
                if (!await RoleExclusivity.CanAssignTenantAdminAsync(userManager, user, logger))
                {
                    throw new InvalidOperationException(
                        $"Cannot assign TenantAdmin to existing user {email}: role exclusivity conflict.");
                }

                var roleResult = await userManager.AddToRoleAsync(user, OperatorSeeder.TenantAdminRole);
                if (!roleResult.Succeeded)
                {
                    throw new InvalidOperationException(
                        $"Failed to assign TenantAdmin role to {email}: " +
                        string.Join(", ", roleResult.Errors.Select(e => e.Description)));
                }
            }
        }

        var membershipResult = await membershipService.EnsureMembershipAsync(
            user.Id,
            tenantId,
            TenantMembershipRole.TenantAdmin,
            cancellationToken);
        if (!membershipResult.Succeeded)
        {
            throw new InvalidOperationException(
                $"Failed to ensure TenantAdmin membership for {email}: {membershipResult.Detail}");
        }
    }

    private static async Task<int> GetNextRegistrationSequenceAsync(
        CohestraDbContext dbContext,
        DateTimeOffset timestamp,
        CancellationToken cancellationToken)
    {
        var datePart = timestamp.UtcDateTime.ToString("yyyyMMdd");
        var prefix = $"REG{datePart}";

        var latestNumber = await dbContext.Registrations
            .Where(r => r.RegistrationNumber.StartsWith(prefix))
            .OrderByDescending(r => r.RegistrationNumber)
            .Select(r => r.RegistrationNumber)
            .FirstOrDefaultAsync(cancellationToken);

        if (latestNumber is null
            || latestNumber.Length != prefix.Length + RegistrationNumberGenerator.SequenceDigits
            || !int.TryParse(latestNumber.AsSpan(prefix.Length), out var parsed))
        {
            return 0;
        }

        return parsed;
    }

    private static async Task WipeLoadTestTenantsAsync(
        IServiceProvider scopedServices,
        CohestraDbContext dbContext,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var slugs = TenantSpecs.Select(s => s.Slug).ToList();
        var tenantIds = await dbContext.Tenants
            .Where(t => slugs.Contains(t.Slug))
            .Select(t => t.Id)
            .ToListAsync(cancellationToken);

        if (tenantIds.Count == 0)
        {
            return;
        }

        logger.LogWarning(
            "Force reseed: removing {Count} load test tenant(s) and their business data.",
            tenantIds.Count);

        foreach (var tenantId in tenantIds)
        {
            SeedTenantContext.BindTenant(scopedServices, tenantId, "load-wipe");
            await WipeTenantBusinessDataAsync(dbContext, tenantId, cancellationToken);
        }

        var adminEmails = TenantSpecs.Select(s => s.AdminEmail).ToList();
        var memberships = await dbContext.TenantMemberships
            .Where(m => tenantIds.Contains(m.TenantId))
            .ToListAsync(cancellationToken);
        dbContext.TenantMemberships.RemoveRange(memberships);

        var tenants = await dbContext.Tenants.Where(t => tenantIds.Contains(t.Id)).ToListAsync(cancellationToken);
        dbContext.Tenants.RemoveRange(tenants);

        await dbContext.SaveChangesAsync(cancellationToken);

        var userManager = scopedServices.GetRequiredService<UserManager<ApplicationUser>>();
        foreach (var email in adminEmails)
        {
            var user = await userManager.FindByEmailAsync(email);
            if (user is null)
            {
                continue;
            }

            var hasOtherMemberships = await dbContext.TenantMemberships
                .AnyAsync(m => m.UserId == user.Id, cancellationToken);
            if (!hasOtherMemberships)
            {
                await userManager.DeleteAsync(user);
            }
        }
    }

    private static async Task WipeTenantBusinessDataAsync(
        CohestraDbContext dbContext,
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        dbContext.CampaignRecipients.RemoveRange(
            await dbContext.CampaignRecipients.Where(r => r.TenantId == tenantId).ToListAsync(cancellationToken));
        dbContext.CampaignAssets.RemoveRange(
            await dbContext.CampaignAssets.Where(a => a.TenantId == tenantId).ToListAsync(cancellationToken));
        dbContext.Campaigns.RemoveRange(
            await dbContext.Campaigns.Where(c => c.TenantId == tenantId).ToListAsync(cancellationToken));
        dbContext.ClientTimelineEvents.RemoveRange(
            await dbContext.ClientTimelineEvents.Where(e => e.TenantId == tenantId).ToListAsync(cancellationToken));
        dbContext.Registrations.RemoveRange(
            await dbContext.Registrations.Where(r => r.TenantId == tenantId).ToListAsync(cancellationToken));
        dbContext.Clients.RemoveRange(
            await dbContext.Clients.Where(c => c.TenantId == tenantId).ToListAsync(cancellationToken));
        dbContext.Activities.RemoveRange(
            await dbContext.Activities.Where(a => a.TenantId == tenantId).ToListAsync(cancellationToken));
        dbContext.Communities.RemoveRange(
            await dbContext.Communities.Where(c => c.TenantId == tenantId).ToListAsync(cancellationToken));
        dbContext.Categories.RemoveRange(
            await dbContext.Categories.Where(c => c.TenantId == tenantId).ToListAsync(cancellationToken));
        dbContext.EmailTemplates.RemoveRange(
            await dbContext.EmailTemplates.Where(t => t.TenantId == tenantId).ToListAsync(cancellationToken));
        dbContext.SitePages.RemoveRange(
            await dbContext.SitePages.Where(p => p.TenantId == tenantId).ToListAsync(cancellationToken));

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static ActivityFormSchema CreateMinimalFormSchema()
    {
        return new ActivityFormSchema
        {
            Version = 1,
            Fields =
            [
                new FormFieldDefinition
                {
                    Id = "full_name",
                    Type = "text",
                    Label = "Full name",
                    Required = true,
                },
                new FormFieldDefinition
                {
                    Id = "phone",
                    Type = "phone",
                    Label = "Phone",
                    Required = true,
                    PhoneCountry = "SG",
                },
                new FormFieldDefinition
                {
                    Id = "email",
                    Type = "email",
                    Label = "Email",
                    Required = false,
                },
                new FormFieldDefinition
                {
                    Id = "consent",
                    Type = "consent",
                    Label = "Consent",
                    Required = true,
                    ConsentText = "I agree to be contacted about community activities.",
                },
            ],
        };
    }

    internal sealed record LoadTestTenantSpec(
        string Slug,
        string DisplayName,
        TenantPlan Plan,
        string AdminEmail,
        int Communities,
        int PublishedActivities,
        int DraftActivities,
        int ArchivedActivities,
        int RegistrationsThisMonth);
}
