using System.Text.Json;
using Cohestra.Application.Email;
using Cohestra.Application.Tenants;
using Cohestra.Domain.Campaigns;
using Cohestra.Domain.Clients;
using Cohestra.Domain.Outbox;
using Cohestra.Infrastructure.Campaigns;
using Cohestra.Infrastructure.Email;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Outbox;

public sealed class CampaignRecipientOutboxHandler(
    CohestraDbContext dbContext,
    CurrentTenant currentTenant,
    IEmailSender emailSender,
    IOptions<SendGridSettings> sendGridOptions,
    ILogger<CampaignRecipientOutboxHandler> logger) : IOutboxMessageHandler
{
    public string MessageType => OutboxMessageTypes.CampaignRecipient;

    public async Task HandleAsync(OutboxMessage message, CancellationToken cancellationToken = default)
    {
        var payload = JsonSerializer.Deserialize<CampaignRecipientOutboxPayload>(message.PayloadJson)
            ?? throw new InvalidOperationException("Campaign recipient outbox payload is invalid.");

        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == message.TenantId, cancellationToken)
            ?? throw new InvalidOperationException($"Tenant {message.TenantId} was not found for outbox message.");

        currentTenant.SetResolved(message.TenantId, tenant.Slug);

        var recipient = await dbContext.CampaignRecipients
            .Include(item => item.Client)
            .Include(item => item.Campaign)
            .FirstOrDefaultAsync(
                item => item.Id == payload.RecipientId && item.CampaignId == payload.CampaignId,
                cancellationToken)
            ?? throw new InvalidOperationException(
                $"Campaign recipient {payload.RecipientId} was not found.");

        if (recipient.Status != CampaignRecipientStatus.Queued)
        {
            return;
        }

        var campaign = recipient.Campaign;
        if (campaign.Status is CampaignStatus.Completed or CampaignStatus.Failed)
        {
            return;
        }

        if (campaign.Status == CampaignStatus.Queued)
        {
            campaign.Status = CampaignStatus.Sending;
        }

        EnsureSendGridConfigured(sendGridOptions.Value);

        if (string.IsNullOrWhiteSpace(tenant.AdminContactEmail))
        {
            throw new InvalidOperationException(
                "Configure a verified admin contact email for this workspace before sending campaigns.");
        }

        var fromEmail = tenant.AdminContactEmail.Trim();
        var fromName = string.IsNullOrWhiteSpace(tenant.Name) ? null : tenant.Name.Trim();
        var processedBody = CampaignEmailBodyProcessor.Process(
            campaign.Body,
            campaign.BodyFormat.ToString().ToLowerInvariant());
        var now = DateTimeOffset.UtcNow;

        var sendResult = await emailSender.SendAsync(
            new EmailMessage(
                recipient.Email ?? recipient.Client.Email ?? string.Empty,
                recipient.Client.FullName,
                campaign.Subject,
                processedBody.PlainTextBody,
                processedBody.HtmlBody,
                fromEmail,
                fromName),
            cancellationToken);

        if (sendResult.Success)
        {
            recipient.Status = CampaignRecipientStatus.Sent;
            recipient.ProviderMessageId = sendResult.ProviderMessageId;
            recipient.FailureReason = null;
            campaign.SentCount++;

            dbContext.ClientTimelineEvents.Add(new ClientTimelineEvent
            {
                Id = Guid.NewGuid(),
                TenantId = message.TenantId,
                ClientId = recipient.ClientId,
                EventType = ClientTimelineEventType.EmailCampaignSent,
                OccurredAt = now,
                Subject = campaign.Subject,
                CampaignId = campaign.Id,
            });
        }
        else
        {
            recipient.Status = CampaignRecipientStatus.Failed;
            recipient.FailureReason = sendResult.FailureReason ?? "Email send failed.";
            campaign.FailedCount++;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await TryFinalizeCampaignAsync(campaign.Id, cancellationToken);
    }

    private async Task TryFinalizeCampaignAsync(Guid campaignId, CancellationToken cancellationToken)
    {
        var campaign = await dbContext.Campaigns
            .Include(item => item.Recipients)
            .FirstOrDefaultAsync(item => item.Id == campaignId, cancellationToken);

        if (campaign is null || campaign.Status is CampaignStatus.Completed or CampaignStatus.Failed)
        {
            return;
        }

        if (campaign.Recipients.Any(recipient => recipient.Status == CampaignRecipientStatus.Queued))
        {
            return;
        }

        campaign.Status = campaign.SentCount > 0 ? CampaignStatus.Completed : CampaignStatus.Failed;
        campaign.SentAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Campaign {CampaignId} finalized with status {Status} ({SentCount} sent, {FailedCount} failed, {SkippedCount} skipped).",
            campaign.Id,
            campaign.Status,
            campaign.SentCount,
            campaign.FailedCount,
            campaign.SkippedCount);
    }

    private static void EnsureSendGridConfigured(SendGridSettings settings)
    {
        if (string.IsNullOrWhiteSpace(settings.ApiKey))
        {
            throw new InvalidOperationException(
                "Email delivery is not configured. Set SendGrid:ApiKey before sending campaigns.");
        }
    }
}
