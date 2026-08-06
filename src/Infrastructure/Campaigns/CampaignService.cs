using Cohestra.Application.Campaigns;
using Cohestra.Application.Email;
using Cohestra.Contracts.Campaigns;
using Cohestra.Domain.Campaigns;
using Cohestra.Domain.Clients;
using Cohestra.Infrastructure.Email;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Campaigns;

public sealed class CampaignService(
    CohestraDbContext dbContext,
    IClientSegmentService segmentService,
    IEmailSender emailSender,
    IOptions<SendGridSettings> sendGridOptions) : ICampaignService
{
    private const int DefaultPageSize = 25;
    private const int MaxPageSize = 100;
    private const int MaxSubjectLength = 200;

    public async Task<SendCampaignResponse> SendAsync(
        SendCampaignRequest request,
        CancellationToken cancellationToken = default)
    {
        var sendGridSettings = sendGridOptions.Value;
        EnsureSendGridConfigured(sendGridSettings);

        var subject = request.Subject?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(subject))
        {
            throw new ArgumentException("Campaign subject is required.");
        }

        if (subject.Length > MaxSubjectLength)
        {
            throw new ArgumentException($"Campaign subject must be {MaxSubjectLength} characters or fewer.");
        }

        var processedBody = ProcessBody(request.Body, request.BodyFormat);
        ClientSegmentQueryValidator.Validate(request.Segment);

        if (request.EmailTemplateId is Guid templateId)
        {
            var templateExists = await dbContext.EmailTemplates
                .AsNoTracking()
                .AnyAsync(item => item.Id == templateId, cancellationToken);

            if (!templateExists)
            {
                throw new ArgumentException("Email template was not found.");
            }
        }

        var clientIds = await segmentService.ResolveClientIdsAsync(request.Segment, cancellationToken);
        if (clientIds.Count == 0)
        {
            throw new ArgumentException("Segment matches no clients.");
        }

        var clients = await dbContext.Clients
            .Where(client => clientIds.Contains(client.Id))
            .OrderBy(client => client.FullName)
            .ToListAsync(cancellationToken);

        var tenantId = clients[0].TenantId;
        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);

        if (tenant is null || string.IsNullOrWhiteSpace(tenant.AdminContactEmail))
        {
            throw new InvalidOperationException(
                "Configure a verified admin contact email for this workspace before sending campaigns.");
        }

        var fromEmail = tenant.AdminContactEmail.Trim();
        var fromName = string.IsNullOrWhiteSpace(tenant.Name) ? null : tenant.Name.Trim();

        var now = DateTimeOffset.UtcNow;
        var campaign = new Campaign
        {
            Id = Guid.NewGuid(),
            Subject = subject,
            Body = processedBody.StoredBody,
            BodyFormat = processedBody.BodyFormat,
            EmailTemplateId = request.EmailTemplateId,
            CreatedAt = now,
            SentAt = now,
            Status = CampaignStatus.Completed,
        };

        var results = new List<CampaignRecipientResultResponse>(clients.Count);
        var sentCount = 0;
        var failedCount = 0;
        var skippedCount = 0;

        foreach (var client in clients)
        {
            if (!client.ConsentGiven)
            {
                skippedCount++;
                AddRecipient(campaign, results, client, CampaignRecipientStatus.Skipped,
                    "Client has not recorded consent.");
                continue;
            }

            if (string.IsNullOrWhiteSpace(client.Email))
            {
                skippedCount++;
                AddRecipient(campaign, results, client, CampaignRecipientStatus.Skipped,
                    "Client has no email address.");
                continue;
            }

            var sendResult = await emailSender.SendAsync(
                new EmailMessage(
                    client.Email,
                    client.FullName,
                    subject,
                    processedBody.PlainTextBody,
                    processedBody.HtmlBody,
                    fromEmail,
                    fromName),
                cancellationToken);

            if (sendResult.Success)
            {
                sentCount++;
                campaign.Recipients.Add(new CampaignRecipient
                {
                    Id = Guid.NewGuid(),
                    CampaignId = campaign.Id,
                    ClientId = client.Id,
                    Email = client.Email,
                    Status = CampaignRecipientStatus.Sent,
                    ProviderMessageId = sendResult.ProviderMessageId,
                });

                dbContext.ClientTimelineEvents.Add(new ClientTimelineEvent
                {
                    Id = Guid.NewGuid(),
                    ClientId = client.Id,
                    EventType = ClientTimelineEventType.EmailCampaignSent,
                    OccurredAt = now,
                    Subject = subject,
                    CampaignId = campaign.Id,
                });

                results.Add(new CampaignRecipientResultResponse(
                    client.Id,
                    client.FullName,
                    client.Email,
                    "sent",
                    null));
            }
            else
            {
                failedCount++;
                var failureReason = sendResult.FailureReason ?? "Email send failed.";
                AddRecipient(campaign, results, client, CampaignRecipientStatus.Failed, failureReason);
            }
        }

        campaign.SentCount = sentCount;
        campaign.FailedCount = failedCount;
        campaign.SkippedCount = skippedCount;
        campaign.Status = sentCount > 0 ? CampaignStatus.Completed : CampaignStatus.Failed;

        dbContext.Campaigns.Add(campaign);
        await dbContext.SaveChangesAsync(cancellationToken);

        return new SendCampaignResponse(
            campaign.Id,
            campaign.Subject,
            campaign.SentAt,
            sentCount,
            failedCount,
            skippedCount,
            results);
    }

    public async Task<SendTestCampaignEmailResponse> SendTestAsync(
        SendTestCampaignEmailRequest request,
        string operatorEmail,
        CancellationToken cancellationToken = default)
    {
        EnsureSendGridConfigured(sendGridOptions.Value);

        var subject = request.Subject?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(subject))
        {
            throw new ArgumentException("Campaign subject is required.");
        }

        if (subject.Length > MaxSubjectLength)
        {
            throw new ArgumentException($"Campaign subject must be {MaxSubjectLength} characters or fewer.");
        }

        if (string.IsNullOrWhiteSpace(operatorEmail))
        {
            throw new ArgumentException("Operator email is required to send a test message.");
        }

        var processedBody = ProcessBody(request.Body, request.BodyFormat);
        var testSubject = $"[Test] {subject}";

        var sendResult = await emailSender.SendAsync(
            new EmailMessage(
                operatorEmail,
                null,
                testSubject,
                processedBody.PlainTextBody,
                processedBody.HtmlBody),
            cancellationToken);

        return new SendTestCampaignEmailResponse(sendResult.Success, sendResult.FailureReason);
    }

    public async Task<CampaignListResponse> ListAsync(
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var normalizedPage = page < 1 ? 1 : page;
        var normalizedPageSize = pageSize < 1
            ? DefaultPageSize
            : Math.Min(pageSize, MaxPageSize);

        var query = dbContext.Campaigns.AsNoTracking().OrderByDescending(campaign => campaign.SentAt);
        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((normalizedPage - 1) * normalizedPageSize)
            .Take(normalizedPageSize)
            .Select(campaign => new CampaignListItemResponse(
                campaign.Id,
                campaign.Subject,
                campaign.SentAt,
                campaign.SentCount,
                campaign.FailedCount,
                campaign.SkippedCount,
                campaign.Status.ToString().ToLowerInvariant()))
            .ToListAsync(cancellationToken);

        return new CampaignListResponse(items, normalizedPage, normalizedPageSize, totalCount);
    }

    public async Task<CampaignDetailResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var campaign = await dbContext.Campaigns
            .AsNoTracking()
            .Include(item => item.Recipients)
            .ThenInclude(recipient => recipient.Client)
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (campaign is null)
        {
            return null;
        }

        var results = campaign.Recipients
            .OrderBy(recipient => recipient.Client.FullName)
            .Select(recipient => new CampaignRecipientResultResponse(
                recipient.ClientId,
                recipient.Client.FullName,
                recipient.Email,
                recipient.Status.ToString().ToLowerInvariant(),
                recipient.FailureReason))
            .ToList();

        return new CampaignDetailResponse(
            campaign.Id,
            campaign.Subject,
            campaign.Body,
            campaign.BodyFormat.ToString().ToLowerInvariant(),
            campaign.SentAt,
            campaign.SentCount,
            campaign.FailedCount,
            campaign.SkippedCount,
            campaign.Status.ToString().ToLowerInvariant(),
            results);
    }

    private ProcessedCampaignBody ProcessBody(string? body, string? bodyFormat)
    {
        var processed = CampaignEmailBodyProcessor.Process(body ?? string.Empty, bodyFormat);

        if (processed.HtmlBody is not null)
        {
            CampaignEmailBodyProcessor.ValidateImageSources(processed.HtmlBody);
        }

        return processed;
    }

    private static void EnsureSendGridConfigured(SendGridSettings settings)
    {
        if (string.IsNullOrWhiteSpace(settings.ApiKey))
        {
            throw new InvalidOperationException(
                "Email delivery is not configured. Set SendGrid:ApiKey before sending campaigns.");
        }
    }

    private static void AddRecipient(
        Campaign campaign,
        List<CampaignRecipientResultResponse> results,
        Client client,
        CampaignRecipientStatus status,
        string failureReason)
    {
        campaign.Recipients.Add(new CampaignRecipient
        {
            Id = Guid.NewGuid(),
            CampaignId = campaign.Id,
            ClientId = client.Id,
            Email = client.Email,
            Status = status,
            FailureReason = failureReason,
        });

        results.Add(new CampaignRecipientResultResponse(
            client.Id,
            client.FullName,
            client.Email,
            status.ToString().ToLowerInvariant(),
            failureReason));
    }
}
