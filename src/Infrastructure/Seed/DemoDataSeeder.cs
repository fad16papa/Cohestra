using Cohestra.Domain.Activities;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Campaigns;
using Cohestra.Domain.Clients;
using Cohestra.Domain.Registrations;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Registrations;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Seed;

public static class DemoDataSeeder
{
    public const string DemoEmailDomain = "demo.cohestra.local";

    private static readonly string[] CommunityNames =
    [
        "Riverside Runners",
        "Marina Pickleball Club",
        "Sunset Board Gamers",
        "Eastside Tennis Collective",
        "Downtown Creatives Network",
        "Harbor Wellness Circle",
    ];

    private static readonly string[] ActivityThemes =
    [
        "Open Session",
        "Skills Clinic",
        "Community Meetup",
        "Weekend Workshop",
        "Intro Class",
        "Member Social",
    ];

    private static readonly string[] CategoryNames = ["Sports", "Social", "Wellness"];

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

    public static async Task SeedAsync(
        IServiceProvider services,
        CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        SeedTenantContext.BindPlatformZero(scope.ServiceProvider);
        var settings = scope.ServiceProvider.GetRequiredService<IOptions<DemoDataSeedSettings>>().Value;
        var dbContext = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var logger = scope.ServiceProvider
            .GetRequiredService<ILoggerFactory>()
            .CreateLogger("DemoDataSeeder");

        await SeedDatabaseAsync(dbContext, settings, logger, cancellationToken);
    }

    internal static async Task SeedDatabaseAsync(
        CohestraDbContext dbContext,
        DemoDataSeedSettings settings,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        if (!settings.Enabled)
        {
            logger.LogInformation("Demo data seed skipped (DemoDataSeed:Enabled=false).");
            return;
        }

        logger.LogInformation("Demo data seed starting — wipes business data and reseeds default tenant.");

        var communityCount = Math.Clamp(settings.CommunityCount, 1, CommunityNames.Length);
        var activitiesPerCommunity = Math.Max(1, settings.ActivitiesPerCommunity);
        var clientCount = Math.Max(DemoDataSeedCatalog.Personas.Count, settings.ClientCount);
        var fillRate = Math.Clamp(settings.RegistrationFillRate, 0d, 1d);

        await WipeBusinessDataAsync(dbContext, cancellationToken);

        if (settings.PromoteDefaultTenantToPro)
        {
            await PromoteDefaultTenantToProAsync(dbContext, cancellationToken);
        }

        var now = DateTimeOffset.UtcNow;
        var formSchema = CreateMinimalFormSchema();
        var registrationSequence = 0;

        foreach (var categoryName in CategoryNames)
        {
            dbContext.Categories.Add(new Category
            {
                Id = Guid.NewGuid(),
                TenantId = TenantIds.Default,
                Name = categoryName,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }

        var personaClients = new Dictionary<string, Client>(StringComparer.Ordinal);
        foreach (var persona in DemoDataSeedCatalog.Personas)
        {
            var client = CreateClientFromPersona(persona, now);
            personaClients[persona.Key] = client;
            dbContext.Clients.Add(client);

            if (settings.IncludeOutreachTimeline)
            {
                SeedPersonaTimeline(dbContext, client, persona, now);
            }
        }

        var syntheticClients = new List<Client>();
        for (var clientIndex = DemoDataSeedCatalog.Personas.Count + 1; clientIndex <= clientCount; clientIndex++)
        {
            var client = CreateSyntheticClient(clientIndex, now);
            syntheticClients.Add(client);
            dbContext.Clients.Add(client);
        }

        var seededCommunities = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var label in DemoDataSeedCatalog.ScenarioActivities
                     .Select(spec => spec.CommunityLabel)
                     .Distinct(StringComparer.Ordinal))
        {
            dbContext.Communities.Add(new Community
            {
                Id = Guid.NewGuid(),
                TenantId = TenantIds.Default,
                Name = label,
                CreatedAt = now,
                UpdatedAt = now,
            });
            seededCommunities.Add(label);
        }

        var allClients = personaClients.Values.Concat(syntheticClients).ToList();
        var activitiesBySlug = new Dictionary<string, Activity>(StringComparer.Ordinal);
        var scheduleOrdinal = 0;
        var expectedActivityCount =
            DemoDataSeedCatalog.ScenarioActivities.Count
            + (communityCount * activitiesPerCommunity);

        foreach (var spec in DemoDataSeedCatalog.ScenarioActivities)
        {
            scheduleOrdinal++;
            var activity = CreateActivityFromSpec(
                spec,
                formSchema,
                now,
                scheduleOrdinal,
                expectedActivityCount);
            activitiesBySlug[spec.Slug] = activity;
            dbContext.Activities.Add(activity);
        }

        for (var communityIndex = 0; communityIndex < communityCount; communityIndex++)
        {
            var communityName = CommunityNames[communityIndex];
            if (seededCommunities.Contains(communityName))
            {
                continue;
            }

            dbContext.Communities.Add(new Community
            {
                Id = Guid.NewGuid(),
                TenantId = TenantIds.Default,
                Name = communityName,
                CreatedAt = now,
                UpdatedAt = now,
            });

            var communitySlug = ActivitySlugGenerator.Slugify(communityName);
            for (var activityIndex = 1; activityIndex <= activitiesPerCommunity; activityIndex++)
            {
                scheduleOrdinal++;
                var theme = ActivityThemes[(activityIndex - 1) % ActivityThemes.Length];
                var activityName = $"{communityName} {theme}";
                var activitySlug = $"demo-{communitySlug}-{activityIndex:D2}";

                var activity = new Activity
                {
                    Id = Guid.NewGuid(),
                    TenantId = TenantIds.Default,
                    Name = activityName,
                    Slug = activitySlug,
                    Category = CategoryNames[communityIndex % CategoryNames.Length],
                    Schedule = SeedActivityScheduleFormatter.FormatSpreadSchedule(
                        now,
                        scheduleOrdinal,
                        expectedActivityCount),
                    Location = $"{communityName} Demo Venue",
                    CommunityLabel = communityName,
                    Status = ActivityStatus.Published,
                    FormSchema = formSchema,
                    ShowOnHomepage = activityIndex % 2 == 1,
                    CreatedAt = now.AddDays(-14 - activityIndex),
                    UpdatedAt = now,
                };

                activitiesBySlug[activitySlug] = activity;
                dbContext.Activities.Add(activity);
            }

            seededCommunities.Add(communityName);
        }

        var registrationPairs = new HashSet<(Guid ClientId, Guid ActivityId)>();
        var totalRegistrations = 0;

        foreach (var spec in DemoDataSeedCatalog.ScenarioActivities)
        {
            if (!activitiesBySlug.TryGetValue(spec.Slug, out var activity))
            {
                continue;
            }

            if (spec.RegisterPersonaKeys is not null)
            {
                foreach (var personaKey in spec.RegisterPersonaKeys)
                {
                    if (!personaClients.TryGetValue(personaKey, out var client))
                    {
                        continue;
                    }

                    totalRegistrations += AddRegistration(
                        dbContext,
                        activity,
                        client,
                        formSchema,
                        now,
                        ref registrationSequence,
                        registrationPairs);
                }
            }

            var syntheticTarget = spec.SyntheticRegistrationCount ?? 0;
            foreach (var client in PickSyntheticRegistrationClients(allClients, activity, syntheticTarget, fillRate))
            {
                totalRegistrations += AddRegistration(
                    dbContext,
                    activity,
                    client,
                    formSchema,
                    now,
                    ref registrationSequence,
                    registrationPairs);
            }
        }

        foreach (var persona in DemoDataSeedCatalog.Personas)
        {
            if (!personaClients.TryGetValue(persona.Key, out var client))
            {
                continue;
            }

            foreach (var slug in persona.RegisterOnActivitySlugs)
            {
                if (!activitiesBySlug.TryGetValue(slug, out var activity))
                {
                    continue;
                }

                totalRegistrations += AddRegistration(
                    dbContext,
                    activity,
                    client,
                    formSchema,
                    now,
                    ref registrationSequence,
                    registrationPairs);
            }
        }

        foreach (var activity in activitiesBySlug.Values.Where(item => item.Status == ActivityStatus.Published))
        {
            if (DemoDataSeedCatalog.ScenarioActivities.Any(spec => spec.Slug == activity.Slug))
            {
                continue;
            }

            foreach (var client in allClients)
            {
                if (!ShouldRegisterSynthetic(client, activity, fillRate))
                {
                    continue;
                }

                totalRegistrations += AddRegistration(
                    dbContext,
                    activity,
                    client,
                    formSchema,
                    now,
                    ref registrationSequence,
                    registrationPairs);
            }
        }

        Campaign? demoCampaign = null;
        if (settings.IncludeCampaigns)
        {
            demoCampaign = SeedCampaignAsync(
                dbContext,
                personaClients,
                settings.IncludeOutreachTimeline,
                now);
        }

        ValidateUniqueDefaultTenantContacts(dbContext);

        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Seeded demo data (production-like): {CommunityCount} communities, {ActivityCount} activities, {ClientCount} clients ({PersonaCount} personas), {RegistrationCount} registrations, timeline={Timeline}, campaign={Campaign}.",
            communityCount,
            scheduleOrdinal,
            allClients.Count,
            DemoDataSeedCatalog.Personas.Count,
            totalRegistrations,
            settings.IncludeOutreachTimeline,
            demoCampaign is not null);
    }

    private static async Task PromoteDefaultTenantToProAsync(
        CohestraDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var tenant = await dbContext.Tenants
            .FirstOrDefaultAsync(item => item.Id == TenantIds.Default, cancellationToken);

        if (tenant is null)
        {
            return;
        }

        tenant.Plan = TenantPlan.Pro;
        tenant.BillingStatus = BillingStatus.Trialing;
        tenant.TrialEndsAt ??= DateTimeOffset.UtcNow.AddDays(14);
        tenant.AdminContactEmail ??= "operator@cohestra.local";
        tenant.UpdatedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static Client CreateClientFromPersona(DemoDataSeedCatalog.Persona persona, DateTimeOffset now)
    {
        var normalizedEmail = ClientContactNormalizer.NormalizeEmail(persona.Email);
        var normalizedPhone = ClientContactNormalizer.NormalizePhone(persona.Phone, persona.PhoneCountry);

        return new Client
        {
            Id = Guid.NewGuid(),
            TenantId = TenantIds.Default,
            FullName = persona.FullName,
            Email = persona.Email,
            NormalizedEmail = normalizedEmail,
            Phone = persona.Phone,
            NormalizedPhone = normalizedPhone,
            Profession = persona.Profession,
            Nationality = persona.Nationality,
            Residency = persona.Residency,
            ConsentGiven = persona.ConsentGiven,
            ReferralSource = persona.ReferralSource,
            Notes = persona.Notes,
            LeadStatus = persona.LeadStatus,
            IsMergeSuspect = persona.IsMergeSuspect,
            CreatedAt = now.AddDays(-persona.CreatedDaysAgo),
            UpdatedAt = now.AddDays(-Math.Min(persona.CreatedDaysAgo, 3)),
        };
    }

    private static Client CreateSyntheticClient(int clientIndex, DateTimeOffset now)
    {
        var firstName = FirstNames[(clientIndex - 1) % FirstNames.Length];
        var lastName = LastNames[(clientIndex + 3) % LastNames.Length];
        var email = $"demo.user{clientIndex:D3}@{DemoEmailDomain}";
        var phoneRaw = $"+6598{clientIndex:D7}";

        return new Client
        {
            Id = Guid.NewGuid(),
            TenantId = TenantIds.Default,
            FullName = $"{firstName} {lastName}",
            Email = email,
            NormalizedEmail = ClientContactNormalizer.NormalizeEmail(email),
            Phone = phoneRaw,
            NormalizedPhone = ClientContactNormalizer.NormalizePhone(phoneRaw, "SG"),
            Profession = Professions[(clientIndex - 1) % Professions.Length],
            Nationality = Nationalities[(clientIndex + 2) % Nationalities.Length],
            ConsentGiven = clientIndex % 10 != 0,
            ReferralSource = clientIndex % 3 == 0 ? "Friend" : "Social media",
            LeadStatus = LeadStatuses[(clientIndex - 1) % LeadStatuses.Length],
            IsMergeSuspect = false,
            CreatedAt = now.AddDays(-clientIndex % 28),
            UpdatedAt = now.AddDays(-clientIndex % 7),
        };
    }

    private static Activity CreateActivityFromSpec(
        DemoDataSeedCatalog.ActivitySpec spec,
        ActivityFormSchema formSchema,
        DateTimeOffset now,
        int scheduleOrdinal,
        int totalActivityCount)
    {
        return new Activity
        {
            Id = Guid.NewGuid(),
            TenantId = TenantIds.Default,
            Name = spec.Name,
            Slug = spec.Slug,
            Category = spec.Category,
            Schedule = SeedActivityScheduleFormatter.FormatSpreadSchedule(
                now,
                scheduleOrdinal,
                totalActivityCount),
            Location = $"{spec.CommunityLabel} venue",
            CommunityLabel = spec.CommunityLabel,
            Status = spec.Status,
            MaxRegistrants = spec.MaxRegistrants,
            ShowOnHomepage = spec.ShowOnHomepage,
            FormSchema = formSchema,
            CreatedAt = now.AddDays(-spec.CreatedDaysAgo),
            UpdatedAt = now,
        };
    }

    private static void SeedPersonaTimeline(
        CohestraDbContext dbContext,
        Client client,
        DemoDataSeedCatalog.Persona persona,
        DateTimeOffset now)
    {
        foreach (var seed in persona.Timeline)
        {
            dbContext.ClientTimelineEvents.Add(new ClientTimelineEvent
            {
                Id = Guid.NewGuid(),
                TenantId = TenantIds.Default,
                ClientId = client.Id,
                EventType = seed.EventType,
                OccurredAt = now.AddDays(-seed.DaysAgo),
                Subject = seed.Subject,
                Note = seed.Note,
                PreviousLeadStatus = seed.PreviousLeadStatus,
                NewLeadStatus = seed.NewLeadStatus,
            });
        }
    }

    private static IEnumerable<Client> PickSyntheticRegistrationClients(
        IReadOnlyList<Client> allClients,
        Activity activity,
        int targetCount,
        double fillRate)
    {
        if (targetCount <= 0)
        {
            yield break;
        }

        var picked = 0;
        foreach (var client in allClients)
        {
            if (picked >= targetCount)
            {
                yield break;
            }

            if (!ShouldRegisterSynthetic(client, activity, fillRate))
            {
                continue;
            }

            picked++;
            yield return client;
        }
    }

    private static bool ShouldRegisterSynthetic(Client client, Activity activity, double fillRate)
    {
        var hash = HashCode.Combine(client.Id, activity.Id);
        var bucket = Math.Abs(hash % 10_000) / 10_000d;
        return bucket < fillRate;
    }

    private static int AddRegistration(
        CohestraDbContext dbContext,
        Activity activity,
        Client client,
        ActivityFormSchema formSchema,
        DateTimeOffset now,
        ref int registrationSequence,
        HashSet<(Guid ClientId, Guid ActivityId)> registrationPairs)
    {
        if (activity.Status != ActivityStatus.Published)
        {
            return 0;
        }

        if (!registrationPairs.Add((client.Id, activity.Id)))
        {
            return 0;
        }

        registrationSequence++;
        dbContext.Registrations.Add(new Registration
        {
            Id = Guid.NewGuid(),
            TenantId = TenantIds.Default,
            RegistrationNumber = RegistrationNumberGenerator.Format(now, registrationSequence),
            ActivityId = activity.Id,
            ClientId = client.Id,
            Answers = BuildRegistrationAnswers(client, formSchema),
            CreatedAt = now.AddDays(-(registrationSequence % 21)),
        });

        return 1;
    }

    private static Dictionary<string, object?> BuildRegistrationAnswers(
        Client client,
        ActivityFormSchema formSchema)
    {
        var answers = new Dictionary<string, object?>(StringComparer.Ordinal)
        {
            ["full_name"] = client.FullName,
            ["consent"] = client.ConsentGiven,
        };

        if (!string.IsNullOrWhiteSpace(client.Email))
        {
            answers["email"] = client.Email;
        }

        if (!string.IsNullOrWhiteSpace(client.Phone))
        {
            answers["phone"] = client.Phone;
        }

        return answers;
    }

    private static Campaign? SeedCampaignAsync(
        CohestraDbContext dbContext,
        IReadOnlyDictionary<string, Client> personaClients,
        bool includeTimeline,
        DateTimeOffset now)
    {

        var template = new EmailTemplate
        {
            Id = Guid.NewGuid(),
            TenantId = TenantIds.Default,
            Name = "Spring community update",
            Subject = DemoDataSeedCatalog.DemoCampaignSubject,
            Body = DemoDataSeedCatalog.DemoCampaignBody,
            BodyFormat = CampaignBodyFormat.Plain,
            CreatedAt = now.AddDays(-10),
            UpdatedAt = now.AddDays(-10),
        };
        dbContext.EmailTemplates.Add(template);

        var campaign = new Campaign
        {
            Id = Guid.NewGuid(),
            TenantId = TenantIds.Default,
            Subject = DemoDataSeedCatalog.DemoCampaignSubject,
            Body = DemoDataSeedCatalog.DemoCampaignBody,
            BodyFormat = CampaignBodyFormat.Plain,
            EmailTemplateId = template.Id,
            Status = CampaignStatus.Completed,
            CreatedAt = now.AddDays(-6),
            SentAt = now.AddDays(-6),
            SentCount = 0,
            FailedCount = 0,
            SkippedCount = 0,
        };
        dbContext.Campaigns.Add(campaign);

        var recipientClients = AllConsentedClients(personaClients.Values).Take(5).ToList();
        foreach (var client in recipientClients)
        {
            campaign.SentCount++;
            dbContext.CampaignRecipients.Add(new CampaignRecipient
            {
                Id = Guid.NewGuid(),
                TenantId = TenantIds.Default,
                CampaignId = campaign.Id,
                ClientId = client.Id,
                Email = client.Email,
                Status = CampaignRecipientStatus.Sent,
            });
        }

        if (includeTimeline && personaClients.TryGetValue("campaign-mia", out var mia))
        {
            dbContext.ClientTimelineEvents.Add(new ClientTimelineEvent
            {
                Id = Guid.NewGuid(),
                TenantId = TenantIds.Default,
                ClientId = mia.Id,
                CampaignId = campaign.Id,
                EventType = ClientTimelineEventType.EmailCampaignSent,
                OccurredAt = now.AddDays(-6),
                Subject = campaign.Subject,
            });
        }

        return campaign;
    }

    private static IEnumerable<Client> AllConsentedClients(IEnumerable<Client> clients) =>
        clients.Where(client => client.ConsentGiven && !string.IsNullOrWhiteSpace(client.Email));

    internal static async Task WipeBusinessDataAsync(
        CohestraDbContext dbContext,
        CancellationToken cancellationToken = default)
    {
        // Ignore tenant filters — demo seed wipes business data for ALL tenants (see README).
        dbContext.CampaignRecipients.RemoveRange(
            await dbContext.IgnoreTenantFilters<CampaignRecipient>().ToListAsync(cancellationToken));
        dbContext.CampaignAssets.RemoveRange(
            await dbContext.IgnoreTenantFilters<CampaignAsset>().ToListAsync(cancellationToken));
        dbContext.Campaigns.RemoveRange(
            await dbContext.IgnoreTenantFilters<Campaign>().ToListAsync(cancellationToken));
        dbContext.ClientTimelineEvents.RemoveRange(
            await dbContext.IgnoreTenantFilters<ClientTimelineEvent>().ToListAsync(cancellationToken));
        dbContext.Registrations.RemoveRange(
            await dbContext.IgnoreTenantFilters<Registration>().ToListAsync(cancellationToken));
        dbContext.Clients.RemoveRange(
            await dbContext.IgnoreTenantFilters<Client>().ToListAsync(cancellationToken));
        dbContext.Activities.RemoveRange(
            await dbContext.IgnoreTenantFilters<Activity>().ToListAsync(cancellationToken));
        dbContext.Communities.RemoveRange(
            await dbContext.IgnoreTenantFilters<Community>().ToListAsync(cancellationToken));
        dbContext.Categories.RemoveRange(
            await dbContext.IgnoreTenantFilters<Category>().ToListAsync(cancellationToken));
        dbContext.EmailTemplates.RemoveRange(
            await dbContext.IgnoreTenantFilters<EmailTemplate>().ToListAsync(cancellationToken));

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    internal static void ValidateUniqueDefaultTenantContacts(CohestraDbContext dbContext)
    {
        var pendingClients = dbContext.ChangeTracker
            .Entries<Client>()
            .Where(entry => entry.State is EntityState.Added or EntityState.Modified)
            .Select(entry => entry.Entity)
            .Where(client => client.TenantId == TenantIds.Default)
            .ToList();

        var duplicatePhone = pendingClients
            .Where(client => !string.IsNullOrWhiteSpace(client.NormalizedPhone))
            .GroupBy(client => client.NormalizedPhone!, StringComparer.Ordinal)
            .FirstOrDefault(group => group.Count() > 1);

        if (duplicatePhone is not null)
        {
            var names = string.Join(", ", duplicatePhone.Select(client => client.FullName));
            throw new InvalidOperationException(
                $"Demo seed would violate unique phone constraint for default tenant: {duplicatePhone.Key} ({names}).");
        }

        var duplicateEmail = pendingClients
            .Where(client => !string.IsNullOrWhiteSpace(client.NormalizedEmail))
            .GroupBy(client => client.NormalizedEmail!, StringComparer.OrdinalIgnoreCase)
            .FirstOrDefault(group => group.Count() > 1);

        if (duplicateEmail is not null)
        {
            var names = string.Join(", ", duplicateEmail.Select(client => client.FullName));
            throw new InvalidOperationException(
                $"Demo seed would violate unique email constraint for default tenant: {duplicateEmail.Key} ({names}).");
        }
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
}
