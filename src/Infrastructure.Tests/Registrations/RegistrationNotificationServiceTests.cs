using Cohestra.Application.Campaigns;
using Cohestra.Application.Email;
using Cohestra.Application.Registrations;
using Cohestra.Contracts.Campaigns;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Clients;
using Cohestra.Domain.Registrations;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Campaigns;
using Cohestra.Infrastructure.Email;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Registrations;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Tests.Registrations;

public sealed class RegistrationNotificationServiceTests
{
    [Fact]
    public async Task SendConfirmationIfApplicableAsync_SendsOnceWhenClientHasEmail()
    {
        await using var dbContext = CreateDbContext();
        var (registrationId, _) = await SeedRegistrationAsync(dbContext, "elena@example.com");
        var sender = new CapturingEmailSender();

        var service = CreateService(dbContext, sender);
        var result = await service.SendConfirmationIfApplicableAsync(registrationId);

        Assert.True(result.Sent);
        Assert.Equal("elena@example.com", result.RecipientEmail);
        Assert.Single(sender.Messages);
        Assert.Equal("noreply@creativorare.com", sender.Messages[0].FromEmail);
        Assert.Null(sender.Messages[0].ReplyTo);
        Assert.Equal("elena@example.com", sender.Messages[0].ToEmail);
        Assert.Contains("You're registered", sender.Messages[0].Subject);
    }

    [Fact]
    public async Task SendConfirmationIfApplicableAsync_EmbedsCampaignHeroInlineWhenAssetAvailable()
    {
        const string assetId = "11111111-1111-1111-1111-111111111111";
        await using var dbContext = CreateDbContext();
        var (registrationId, _) = await SeedRegistrationAsync(
            dbContext,
            "elena@example.com",
            heroImageUrl: $"/api/v1/public/campaign-assets/{assetId}");
        var sender = new CapturingEmailSender();
        var assets = new StubCampaignAssetService(
            Guid.Parse(assetId),
            [0x89, 0x50, 0x4E, 0x47],
            "image/png",
            "hero.png");

        var service = CreateService(
            dbContext,
            sender,
            assets,
            publicWebBaseUrl: "http://localhost:8088");
        var result = await service.SendConfirmationIfApplicableAsync(registrationId);

        Assert.True(result.Sent);
        Assert.Single(sender.Messages);
        Assert.Contains("cid:registration-hero", sender.Messages[0].HtmlBody);
        Assert.NotNull(sender.Messages[0].InlineAttachments);
        Assert.Single(sender.Messages[0].InlineAttachments!);
        Assert.Equal("registration-hero", sender.Messages[0].InlineAttachments![0].ContentId);
    }

    [Fact]
    public async Task SendConfirmationIfApplicableAsync_UsesResolvedRegistrationThemeHero()
    {
        const string themeAssetId = "22222222-2222-2222-2222-222222222222";
        await using var dbContext = CreateDbContext();
        var tenantId = TenantIds.Default;
        var activityId = Guid.NewGuid();
        var clientId = Guid.NewGuid();
        var registrationId = Guid.NewGuid();

        dbContext.Tenants.Add(new Tenant
        {
            Id = tenantId,
            Slug = "creativorare",
            Name = "Creativorare",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });

        dbContext.Communities.Add(new Community
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Ikigai",
            DefaultHeroImageUrl = "/api/v1/public/campaign-assets/99999999-9999-9999-9999-999999999999",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });

        dbContext.Activities.Add(new Activity
        {
            Id = activityId,
            TenantId = tenantId,
            Name = "Sunday Pickleball Clinic",
            Slug = "pickleball",
            Category = "Sports",
            Schedule = "Sun 9:00 AM",
            Location = "Ikigai Studio",
            CommunityLabel = "Ikigai",
            HeroImageUrl = null,
            RegistrationTheme = new RegistrationTheme
            {
                InheritCommunityBrand = true,
                HeroImageUrl = $"/api/v1/public/campaign-assets/{themeAssetId}",
            },
            Status = ActivityStatus.Published,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });

        dbContext.Clients.Add(new Client
        {
            Id = clientId,
            TenantId = tenantId,
            FullName = "Elena Santos",
            Email = "elena@example.com",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });

        dbContext.Registrations.Add(new Registration
        {
            Id = registrationId,
            TenantId = tenantId,
            RegistrationNumber = "REG20260616000042",
            ActivityId = activityId,
            ClientId = clientId,
            CreatedAt = DateTimeOffset.UtcNow,
        });

        await dbContext.SaveChangesAsync();

        var sender = new CapturingEmailSender();
        var assets = new StubCampaignAssetService(
            Guid.Parse(themeAssetId),
            [0x89, 0x50, 0x4E, 0x47],
            "image/png",
            "theme-hero.png");

        var service = CreateService(
            dbContext,
            sender,
            assets,
            publicWebBaseUrl: "http://localhost:8088");
        var result = await service.SendConfirmationIfApplicableAsync(registrationId);

        Assert.True(result.Sent);
        Assert.Single(sender.Messages);
        Assert.Contains("cid:registration-hero", sender.Messages[0].HtmlBody);
        Assert.DoesNotContain("99999999-9999-9999-9999-999999999999", sender.Messages[0].HtmlBody);
    }

    [Fact]
    public void ResolveLogoUrlForEmail_UsesPngWhenSvgIsDefault()
    {
        var url = RegistrationNotificationService.ResolveLogoUrlForEmail(
            new EmailBrandingSettings(),
            new PublicWebOptions { BaseUrl = "https://cohestra.app" });

        Assert.Equal("https://cohestra.app/brand/cohestra-logo-email.png", url);
    }

    [Fact]
    public async Task SendConfirmationIfApplicableAsync_UsesCommunityDefaultHeroWhenThemeInherits()
    {
        const string communityAssetId = "33333333-3333-3333-3333-333333333333";
        await using var dbContext = CreateDbContext();
        var tenantId = TenantIds.Default;
        var activityId = Guid.NewGuid();
        var clientId = Guid.NewGuid();
        var registrationId = Guid.NewGuid();

        dbContext.Tenants.Add(new Tenant
        {
            Id = tenantId,
            Slug = "creativorare",
            Name = "Creativorare",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });

        dbContext.Communities.Add(new Community
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Ikigai",
            DefaultHeroImageUrl = $"/api/v1/public/campaign-assets/{communityAssetId}",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });

        dbContext.Activities.Add(new Activity
        {
            Id = activityId,
            TenantId = tenantId,
            Name = "Sunday Pickleball Clinic",
            Slug = "pickleball",
            Category = "Sports",
            Schedule = "Sun 9:00 AM",
            Location = "Ikigai Studio",
            CommunityLabel = "Ikigai",
            HeroImageUrl = null,
            RegistrationTheme = new RegistrationTheme { InheritCommunityBrand = true },
            Status = ActivityStatus.Published,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });

        dbContext.Clients.Add(new Client
        {
            Id = clientId,
            TenantId = tenantId,
            FullName = "Elena Santos",
            Email = "elena@example.com",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });

        dbContext.Registrations.Add(new Registration
        {
            Id = registrationId,
            TenantId = tenantId,
            RegistrationNumber = "REG20260616000042",
            ActivityId = activityId,
            ClientId = clientId,
            CreatedAt = DateTimeOffset.UtcNow,
        });

        await dbContext.SaveChangesAsync();

        var sender = new CapturingEmailSender();
        var assets = new StubCampaignAssetService(
            Guid.Parse(communityAssetId),
            [0x89, 0x50, 0x4E, 0x47],
            "image/png",
            "community-hero.png");

        var service = CreateService(
            dbContext,
            sender,
            assets,
            publicWebBaseUrl: "http://localhost:8088");
        var result = await service.SendConfirmationIfApplicableAsync(registrationId);

        Assert.True(result.Sent);
        Assert.Single(sender.Messages);
        Assert.Contains("cid:registration-hero", sender.Messages[0].HtmlBody);
    }

    [Fact]
    public void ResolveLogoUrlForEmail_FallsBackToPngWhenConfiguredLogoIsSvg()
    {
        var url = RegistrationNotificationService.ResolveLogoUrlForEmail(
            new EmailBrandingSettings { LogoUrl = "https://cdn.example.com/logo.svg?v=1" },
            new PublicWebOptions { BaseUrl = "https://cohestra.app" });

        Assert.Equal("https://cohestra.app/brand/cohestra-logo-email.png", url);
    }

    [Fact]
    public async Task SendConfirmationIfApplicableAsync_EmbedsPlatformLogoWhenNoHero()
    {
        await using var dbContext = CreateDbContext();
        var (registrationId, _) = await SeedRegistrationAsync(dbContext, "elena@example.com");
        var sender = new CapturingEmailSender();

        var service = CreateService(dbContext, sender);
        var result = await service.SendConfirmationIfApplicableAsync(registrationId);

        Assert.True(result.Sent);
        Assert.Single(sender.Messages);
        Assert.Contains("cid:cohestra-brand-logo", sender.Messages[0].HtmlBody);
        Assert.NotNull(sender.Messages[0].InlineAttachments);
        Assert.Contains(
            sender.Messages[0].InlineAttachments!,
            attachment => attachment.ContentId == "cohestra-brand-logo");
        Assert.DoesNotContain("background-color:#000000", sender.Messages[0].HtmlBody);
    }

    [Fact]
    public async Task SendConfirmationIfApplicableAsync_SkipsWhenClientHasNoEmail()
    {
        await using var dbContext = CreateDbContext();
        var (registrationId, _) = await SeedRegistrationAsync(dbContext, email: null);
        var sender = new CapturingEmailSender();

        var service = CreateService(dbContext, sender);
        var result = await service.SendConfirmationIfApplicableAsync(registrationId);

        Assert.False(result.Sent);
        Assert.Null(result.RecipientEmail);
        Assert.Empty(sender.Messages);
    }

    [Fact]
    public async Task SendConfirmationIfApplicableAsync_SubstitutesPipingTokensInCustomCopy()
    {
        await using var dbContext = CreateDbContext();
        var tenantId = TenantIds.Default;
        var activityId = Guid.NewGuid();
        var clientId = Guid.NewGuid();
        var registrationId = Guid.NewGuid();

        dbContext.Tenants.Add(new Tenant
        {
            Id = tenantId,
            Slug = "creativorare",
            Name = "Creativorare",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });

        dbContext.Activities.Add(new Activity
        {
            Id = activityId,
            TenantId = tenantId,
            Name = "Sunday Pickleball Clinic",
            Slug = "pickleball",
            Category = "Sports",
            Schedule = "Sun 9:00 AM",
            Location = "Ikigai Studio",
            CommunityLabel = "Ikigai",
            Status = ActivityStatus.Published,
            FormSchema = new ActivityFormSchema
            {
                Version = 1,
                Meta = new FormSchemaMeta
                {
                    ConfirmationEmailSubject = "You're in, {{full_name}}",
                    ConfirmationEmailBodyMarkdown = "See you Saturday, {{full_name}}.",
                },
                Fields =
                [
                    new FormFieldDefinition
                    {
                        Id = "full_name",
                        Type = FormFieldTypes.Text,
                        Label = "Full name",
                        Required = true,
                    },
                ],
            },
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });

        dbContext.Clients.Add(new Client
        {
            Id = clientId,
            TenantId = tenantId,
            FullName = "Maya Chen",
            Email = "maya@example.com",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });

        dbContext.Registrations.Add(new Registration
        {
            Id = registrationId,
            TenantId = tenantId,
            RegistrationNumber = "REG20260616000042",
            ActivityId = activityId,
            ClientId = clientId,
            Answers = new Dictionary<string, object?> { ["full_name"] = "Maya Chen" },
            CreatedAt = DateTimeOffset.UtcNow,
        });

        await dbContext.SaveChangesAsync();

        var sender = new CapturingEmailSender();
        var service = CreateService(dbContext, sender);
        var result = await service.SendConfirmationIfApplicableAsync(registrationId);

        Assert.True(result.Sent);
        Assert.Single(sender.Messages);
        Assert.Equal("You're in, Maya Chen", sender.Messages[0].Subject);
        Assert.Contains("See you Saturday, Maya Chen.", sender.Messages[0].HtmlBody);
    }

    [Fact]
    public async Task SendConfirmationIfApplicableAsync_OmitsHiddenFieldTokensFromEmail()
    {
        await using var dbContext = CreateDbContext();
        var tenantId = TenantIds.Default;
        var activityId = Guid.NewGuid();
        var clientId = Guid.NewGuid();
        var registrationId = Guid.NewGuid();

        dbContext.Tenants.Add(new Tenant
        {
            Id = tenantId,
            Slug = "creativorare",
            Name = "Creativorare",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });

        dbContext.Activities.Add(new Activity
        {
            Id = activityId,
            TenantId = tenantId,
            Name = "Sunday Pickleball Clinic",
            Slug = "pickleball",
            Category = "Sports",
            Schedule = "Sun 9:00 AM",
            Location = "Ikigai Studio",
            CommunityLabel = "Ikigai",
            Status = ActivityStatus.Published,
            FormSchema = new ActivityFormSchema
            {
                Version = 1,
                Meta = new FormSchemaMeta
                {
                    ConfirmationEmailBodyMarkdown = "Hidden campaign ref is {{field:ref}} end.",
                },
                Fields =
                [
                    new FormFieldDefinition
                    {
                        Id = "full_name",
                        Type = FormFieldTypes.Text,
                        Label = "Full name",
                        Required = true,
                    },
                    new FormFieldDefinition
                    {
                        Id = "ref",
                        Type = FormFieldTypes.Hidden,
                        Label = "Campaign ref",
                        Required = false,
                    },
                ],
            },
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });

        dbContext.Clients.Add(new Client
        {
            Id = clientId,
            TenantId = tenantId,
            FullName = "Maya Chen",
            Email = "maya@example.com",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });

        dbContext.Registrations.Add(new Registration
        {
            Id = registrationId,
            TenantId = tenantId,
            RegistrationNumber = "REG20260616000042",
            ActivityId = activityId,
            ClientId = clientId,
            Answers = new Dictionary<string, object?>
            {
                ["full_name"] = "Maya Chen",
                ["ref"] = "SECRET_REF_XYZ",
            },
            CreatedAt = DateTimeOffset.UtcNow,
        });

        await dbContext.SaveChangesAsync();

        var sender = new CapturingEmailSender();
        var service = CreateService(dbContext, sender);
        var result = await service.SendConfirmationIfApplicableAsync(registrationId);

        Assert.True(result.Sent);
        Assert.Single(sender.Messages);
        Assert.Contains("Hidden campaign ref is", sender.Messages[0].HtmlBody);
        Assert.Contains("end.", sender.Messages[0].HtmlBody);
        Assert.DoesNotContain("SECRET_REF_XYZ", sender.Messages[0].HtmlBody);
        Assert.DoesNotContain("Save the date", sender.Messages[0].HtmlBody);
    }

    private static RegistrationNotificationService CreateService(
        CohestraDbContext dbContext,
        IEmailSender sender,
        ICampaignAssetService? campaignAssetService = null,
        string publicWebBaseUrl = "http://localhost:3000") =>
        new(
            dbContext,
            sender,
            campaignAssetService ?? new StubCampaignAssetService(),
            Options.Create(new SendGridSettings
            {
                FromEmail = "noreply@creativorare.com",
                FromName = "Creativorare",
                RegistrationFromEmail = "noreply@creativorare.com",
                RegistrationFromName = "Creativorare",
            }),
            Options.Create(new EmailBrandingSettings()),
            Options.Create(new PublicWebOptions { BaseUrl = publicWebBaseUrl }),
            Options.Create(new CampaignAssetOptions { PublicApiBaseUrl = "https://uat.creativorare.com" }),
            NullLogger<RegistrationNotificationService>.Instance);

    private static CohestraDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new CohestraDbContext(options);
    }

    private static async Task<(Guid RegistrationId, Guid ClientId)> SeedRegistrationAsync(
        CohestraDbContext dbContext,
        string? email,
        string? heroImageUrl = null)
    {
        var tenantId = TenantIds.Default;
        var activityId = Guid.NewGuid();
        var clientId = Guid.NewGuid();
        var registrationId = Guid.NewGuid();

        dbContext.Tenants.Add(new Tenant
        {
            Id = tenantId,
            Slug = "creativorare",
            Name = "Creativorare",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });

        dbContext.Activities.Add(new Activity
        {
            Id = activityId,
            TenantId = tenantId,
            Name = "Sunday Pickleball Clinic",
            Slug = "pickleball",
            Category = "Sports",
            Schedule = "Sun 9:00 AM",
            Location = "Ikigai Studio",
            CommunityLabel = "Ikigai",
            HeroImageUrl = heroImageUrl,
            Status = ActivityStatus.Published,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });

        dbContext.Clients.Add(new Client
        {
            Id = clientId,
            TenantId = tenantId,
            FullName = "Elena Santos",
            Email = email,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });

        dbContext.Registrations.Add(new Registration
        {
            Id = registrationId,
            TenantId = tenantId,
            RegistrationNumber = "REG20260616000042",
            ActivityId = activityId,
            ClientId = clientId,
            CreatedAt = DateTimeOffset.UtcNow,
        });

        await dbContext.SaveChangesAsync();
        return (registrationId, clientId);
    }

    private sealed class CapturingEmailSender : IEmailSender
    {
        public List<CapturedEmailMessage> Messages { get; } = [];

        public Task<EmailSendResult> SendAsync(
            EmailMessage message,
            CancellationToken cancellationToken = default)
        {
            Messages.Add(new CapturedEmailMessage(message));
            return Task.FromResult(new EmailSendResult(true, "test-message-id", null));
        }
    }

    private sealed record CapturedEmailMessage(
        string ToEmail,
        string? FromEmail,
        string? ReplyTo,
        string Subject,
        string HtmlBody,
        IReadOnlyList<EmailInlineAttachment>? InlineAttachments)
    {
        public CapturedEmailMessage(EmailMessage message)
            : this(
                message.ToEmail,
                message.FromEmail,
                null,
                message.Subject,
                message.HtmlBody ?? string.Empty,
                message.InlineAttachments)
        {
        }
    }

    private sealed class StubCampaignAssetService : ICampaignAssetService
    {
        private readonly Guid? _assetId;
        private readonly byte[]? _content;
        private readonly string? _contentType;
        private readonly string? _fileName;

        public StubCampaignAssetService()
        {
        }

        public StubCampaignAssetService(
            Guid assetId,
            byte[] content,
            string contentType,
            string fileName)
        {
            _assetId = assetId;
            _content = content;
            _contentType = contentType;
            _fileName = fileName;
        }

        public Task<CampaignAssetResponse> UploadAsync(
            Stream content,
            string fileName,
            string contentType,
            string? altText,
            CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<CampaignAssetResponse> CreateFromActivityQrAsync(
            Guid activityId,
            string? altText,
            CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<CampaignAssetFileResult?> GetFileAsync(
            Guid id,
            CancellationToken cancellationToken = default)
        {
            if (_assetId != id || _content is null || _contentType is null || _fileName is null)
            {
                return Task.FromResult<CampaignAssetFileResult?>(null);
            }

            return Task.FromResult<CampaignAssetFileResult?>(
                new CampaignAssetFileResult(_content, _contentType, _fileName));
        }

        public string BuildPublicUrl(Guid assetId) =>
            $"https://example.com/api/v1/public/campaign-assets/{assetId:D}";
    }
}
