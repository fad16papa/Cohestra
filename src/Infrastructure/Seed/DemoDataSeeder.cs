using LeadGenerationCrm.Domain.Activities;
using LeadGenerationCrm.Domain.Clients;
using LeadGenerationCrm.Domain.Registrations;
using LeadGenerationCrm.Infrastructure.Activities;
using LeadGenerationCrm.Infrastructure.Persistence;
using LeadGenerationCrm.Infrastructure.Registrations;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace LeadGenerationCrm.Infrastructure.Seed;

public static class DemoDataSeeder
{
    public const string DemoEmailDomain = "demo.leadgenerationcrm.local";

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
        "Training Block",
        "Season Opener",
        "Evening Session",
        "Monthly Gathering",
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
        var settings = scope.ServiceProvider.GetRequiredService<IOptions<DemoDataSeedSettings>>().Value;
        var dbContext = scope.ServiceProvider.GetRequiredService<LeadGenerationCrmDbContext>();
        var logger = scope.ServiceProvider
            .GetRequiredService<ILoggerFactory>()
            .CreateLogger("DemoDataSeeder");

        await SeedDatabaseAsync(dbContext, settings, logger, cancellationToken);
    }

    internal static async Task SeedDatabaseAsync(
        LeadGenerationCrmDbContext dbContext,
        DemoDataSeedSettings settings,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        if (!settings.Enabled)
        {
            return;
        }

        var communityCount = Math.Clamp(settings.CommunityCount, 1, CommunityNames.Length);
        var activitiesPerCommunity = Math.Max(1, settings.ActivitiesPerCommunity);
        var clientCount = Math.Max(1, settings.ClientCount);

        await WipeBusinessDataAsync(dbContext, cancellationToken);

        var now = DateTimeOffset.UtcNow;
        var formSchema = CreateMinimalFormSchema();
        var registrationSequence = 0;

        for (var categoryIndex = 0; categoryIndex < CategoryNames.Length; categoryIndex++)
        {
            dbContext.Categories.Add(new Category
            {
                Id = Guid.NewGuid(),
                Name = CategoryNames[categoryIndex],
                CreatedAt = now,
                UpdatedAt = now,
            });
        }

        var clients = new List<Client>(clientCount);
        for (var clientIndex = 1; clientIndex <= clientCount; clientIndex++)
        {
            var firstName = FirstNames[(clientIndex - 1) % FirstNames.Length];
            var lastName = LastNames[(clientIndex + 3) % LastNames.Length];
            var email = $"demo.user{clientIndex:D3}@{DemoEmailDomain}";
            var phoneRaw = $"+6591{clientIndex:D7}";
            var normalizedPhone = ClientContactNormalizer.NormalizePhone(phoneRaw, "SG");
            var normalizedEmail = ClientContactNormalizer.NormalizeEmail(email);

            var client = new Client
            {
                Id = Guid.NewGuid(),
                FullName = $"{firstName} {lastName}",
                Email = email,
                NormalizedEmail = normalizedEmail,
                Phone = phoneRaw,
                NormalizedPhone = normalizedPhone,
                Profession = Professions[(clientIndex - 1) % Professions.Length],
                Nationality = Nationalities[(clientIndex + 2) % Nationalities.Length],
                ConsentGiven = clientIndex % 10 != 0,
                ReferralSource = clientIndex % 3 == 0 ? "Friend" : "Social media",
                LeadStatus = LeadStatuses[(clientIndex - 1) % LeadStatuses.Length],
                CreatedAt = now.AddDays(-clientIndex % 28),
                UpdatedAt = now.AddDays(-clientIndex % 7),
            };

            clients.Add(client);
            dbContext.Clients.Add(client);
        }

        var totalActivities = 0;
        var totalRegistrations = 0;

        for (var communityIndex = 0; communityIndex < communityCount; communityIndex++)
        {
            var communityName = CommunityNames[communityIndex];
            var communitySlug = ActivitySlugGenerator.Slugify(communityName);

            dbContext.Communities.Add(new Community
            {
                Id = Guid.NewGuid(),
                Name = communityName,
                CreatedAt = now,
                UpdatedAt = now,
            });

            for (var activityIndex = 1; activityIndex <= activitiesPerCommunity; activityIndex++)
            {
                var theme = ActivityThemes[(activityIndex - 1) % ActivityThemes.Length];
                var activityName = $"{communityName} {theme} {activityIndex:D2}";
                var activitySlug = $"demo-{communitySlug}-{activityIndex:D2}";

                var activity = new Activity
                {
                    Id = Guid.NewGuid(),
                    Name = activityName,
                    Slug = activitySlug,
                    Category = CategoryNames[communityIndex % CategoryNames.Length],
                    Schedule = $"Week {activityIndex}, Saturdays 10:00",
                    Location = $"{communityName} Demo Venue",
                    CommunityLabel = communityName,
                    Status = ActivityStatus.Published,
                    FormSchema = formSchema,
                    CreatedAt = now.AddDays(-14 - activityIndex),
                    UpdatedAt = now,
                };

                dbContext.Activities.Add(activity);
                totalActivities++;

                foreach (var client in clients)
                {
                    registrationSequence++;
                    dbContext.Registrations.Add(new Registration
                    {
                        Id = Guid.NewGuid(),
                        RegistrationNumber = RegistrationNumberGenerator.Format(now, registrationSequence),
                        ActivityId = activity.Id,
                        ClientId = client.Id,
                        Answers = new Dictionary<string, object?>
                        {
                            ["full_name"] = client.FullName,
                            ["email"] = client.Email,
                            ["phone"] = client.Phone,
                            ["consent"] = client.ConsentGiven,
                        },
                        CreatedAt = now.AddDays(-(registrationSequence % 21)),
                    });
                    totalRegistrations++;
                }
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Seeded demo data: {CommunityCount} communities, {ActivityCount} activities, {ClientCount} clients, {RegistrationCount} registrations.",
            communityCount,
            totalActivities,
            clientCount,
            totalRegistrations);
    }

    internal static async Task WipeBusinessDataAsync(
        LeadGenerationCrmDbContext dbContext,
        CancellationToken cancellationToken = default)
    {
        dbContext.CampaignRecipients.RemoveRange(await dbContext.CampaignRecipients.ToListAsync(cancellationToken));
        dbContext.CampaignAssets.RemoveRange(await dbContext.CampaignAssets.ToListAsync(cancellationToken));
        dbContext.Campaigns.RemoveRange(await dbContext.Campaigns.ToListAsync(cancellationToken));
        dbContext.ClientTimelineEvents.RemoveRange(
            await dbContext.ClientTimelineEvents.ToListAsync(cancellationToken));
        dbContext.Registrations.RemoveRange(await dbContext.Registrations.ToListAsync(cancellationToken));
        dbContext.Clients.RemoveRange(await dbContext.Clients.ToListAsync(cancellationToken));
        dbContext.Activities.RemoveRange(await dbContext.Activities.ToListAsync(cancellationToken));
        dbContext.Communities.RemoveRange(await dbContext.Communities.ToListAsync(cancellationToken));
        dbContext.Categories.RemoveRange(await dbContext.Categories.ToListAsync(cancellationToken));
        dbContext.EmailTemplates.RemoveRange(await dbContext.EmailTemplates.ToListAsync(cancellationToken));

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
}
