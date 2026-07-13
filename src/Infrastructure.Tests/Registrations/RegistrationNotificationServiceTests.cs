using Cohestra.Application.Email;
using Cohestra.Application.Registrations;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Clients;
using Cohestra.Domain.Registrations;
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

    private static RegistrationNotificationService CreateService(
        CohestraDbContext dbContext,
        IEmailSender sender) =>
        new(
            dbContext,
            sender,
            Options.Create(new SendGridSettings
            {
                FromEmail = "noreply@creativorare.com",
                FromName = "Creativorare",
                RegistrationFromEmail = "noreply@creativorare.com",
                RegistrationFromName = "Creativorare",
            }),
            Options.Create(new EmailBrandingSettings()),
            Options.Create(new PublicWebOptions { BaseUrl = "http://localhost:3000" }),
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
        string? email)
    {
        var activityId = Guid.NewGuid();
        var clientId = Guid.NewGuid();
        var registrationId = Guid.NewGuid();

        dbContext.Activities.Add(new Activity
        {
            Id = activityId,
            Name = "Sunday Pickleball Clinic",
            Slug = "pickleball",
            Category = "Sports",
            Schedule = "Sun 9:00 AM",
            Location = "Ikigai Studio",
            CommunityLabel = "Ikigai",
            Status = ActivityStatus.Published,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });

        dbContext.Clients.Add(new Client
        {
            Id = clientId,
            FullName = "Elena Santos",
            Email = email,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });

        dbContext.Registrations.Add(new Registration
        {
            Id = registrationId,
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
        string Subject)
    {
        public CapturedEmailMessage(EmailMessage message)
            : this(
                message.ToEmail,
                message.FromEmail,
                null,
                message.Subject)
        {
        }
    }
}
