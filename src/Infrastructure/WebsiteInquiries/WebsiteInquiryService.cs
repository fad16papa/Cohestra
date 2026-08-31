using System.Text.Json;
using Cohestra.Application.Outbox;
using Cohestra.Application.Tenants;
using Cohestra.Application.WebsiteInquiries;
using Cohestra.Domain.Clients;
using Cohestra.Domain.Outbox;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Registrations;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.WebsiteInquiries;

public sealed class WebsiteInquiryService(
    CohestraDbContext dbContext,
    ICurrentTenant currentTenant,
    ClientDeduplicationService clientDeduplicationService,
    IOutboxPublisher outboxPublisher) : IWebsiteInquiryService
{
    public async Task<WebsiteInquirySubmitResult> SubmitAsync(
        SubmitWebsiteInquiryCommand command,
        CancellationToken cancellationToken = default)
    {
        if (!currentTenant.IsResolved || currentTenant.TenantId is null || currentTenant.TenantId == Guid.Empty)
        {
            return WebsiteInquirySubmitResult.NotFound();
        }

        var tenantId = currentTenant.TenantId.Value;

        var validationError = WebsiteInquiryValidator.Validate(command);
        if (validationError is not null)
        {
            return WebsiteInquirySubmitResult.Invalid(validationError);
        }

        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == tenantId, cancellationToken);

        if (tenant is null)
        {
            return WebsiteInquirySubmitResult.NotFound();
        }

        if (tenant.Plan is TenantPlan.Basic)
        {
            return WebsiteInquirySubmitResult.PlanLocked();
        }

        if (!await HasEnabledContactSectionAsync(tenantId, cancellationToken))
        {
            return WebsiteInquirySubmitResult.ContactDisabled();
        }

        var now = DateTimeOffset.UtcNow;
        var name = command.Name.Trim();
        var email = string.IsNullOrWhiteSpace(command.Email) ? null : command.Email.Trim();
        var phone = string.IsNullOrWhiteSpace(command.Phone) ? null : command.Phone.Trim();
        var message = command.Message.Trim();

        var profile = new ExtractedClientProfile(
            NameFromForm: name,
            DisplayName: name,
            Phone: phone,
            NormalizedPhone: ClientContactNormalizer.NormalizePhone(
                phone,
                PhoneCountrySupport.DefaultPhoneCountryIsoCode),
            Email: email,
            NormalizedEmail: ClientContactNormalizer.NormalizeEmail(email),
            Profession: null,
            Nationality: null,
            Residency: null,
            ConsentGiven: command.ConsentGiven,
            ReferralSource: null);

        var (client, clientCreated) = await clientDeduplicationService.FindOrCreateAsync(
            profile,
            now,
            cancellationToken);

        var timelineEvent = new ClientTimelineEvent
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ClientId = client.Id,
            EventType = ClientTimelineEventType.WebsiteInquiry,
            OccurredAt = now,
            Subject = "Website inquiry",
            Note = TruncateNote(message),
        };

        dbContext.ClientTimelineEvents.Add(timelineEvent);

        if (tenant.EmailOnNewRegistration
            && !string.IsNullOrWhiteSpace(tenant.AdminContactEmail))
        {
            var payload = JsonSerializer.Serialize(
                new WebsiteInquiryOperatorNotifyOutboxPayload(
                    client.Id,
                    timelineEvent.Id,
                    name,
                    phone,
                    email,
                    message));
            outboxPublisher.Enqueue(
                tenantId,
                OutboxMessageTypes.WebsiteInquiryOperatorNotify,
                payload,
                $"website-inquiry:{timelineEvent.Id}:operator-notify");
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return WebsiteInquirySubmitResult.Created(client.Id, clientCreated);
    }

    private async Task<bool> HasEnabledContactSectionAsync(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var page = await dbContext.SitePages
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.TenantId == tenantId, cancellationToken);

        if (page?.PublishedSections is null || page.PublishedAt is null)
        {
            return false;
        }

        return page.PublishedSections.Sections?.Any(section =>
            section.Enabled &&
            string.Equals(section.Type, "contact", StringComparison.OrdinalIgnoreCase)) == true;
    }

    private static string TruncateNote(string message)
    {
        var maxLength = WebsiteInquiryValidator.MaxMessageLength;
        var trimmed = message.Trim();
        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }
}

internal sealed record WebsiteInquiryOperatorNotifyOutboxPayload(
    Guid ClientId,
    Guid TimelineEventId,
    string ParticipantName,
    string? Phone,
    string? Email,
    string Message);
