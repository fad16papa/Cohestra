using Cohestra.Application.Campaigns;
using Cohestra.Contracts.Campaigns;
using Cohestra.Domain.Campaigns;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Campaigns;

public sealed class EmailTemplateService(CohestraDbContext dbContext) : IEmailTemplateService
{
    public async Task<EmailTemplateListResponse> ListAsync(
        CancellationToken cancellationToken = default)
    {
        var items = await dbContext.EmailTemplates
            .AsNoTracking()
            .OrderBy(template => template.Name)
            .Select(template => ToResponse(template))
            .ToListAsync(cancellationToken);

        return new EmailTemplateListResponse(items);
    }

    public async Task<EmailTemplateResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var template = await dbContext.EmailTemplates
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        return template is null ? null : ToResponse(template);
    }

    public async Task<EmailTemplateResponse> CreateAsync(
        CreateEmailTemplateRequest request,
        CancellationToken cancellationToken = default)
    {
        var processed = ProcessTemplateBody(request.Body, request.BodyFormat);
        var now = DateTimeOffset.UtcNow;
        var template = new EmailTemplate
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Subject = request.Subject.Trim(),
            Body = processed.StoredBody,
            BodyFormat = processed.BodyFormat,
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.EmailTemplates.Add(template);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ToResponse(template);
    }

    public async Task<EmailTemplateResponse?> UpdateAsync(
        Guid id,
        UpdateEmailTemplateRequest request,
        CancellationToken cancellationToken = default)
    {
        var template = await dbContext.EmailTemplates
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (template is null)
        {
            return null;
        }

        var processed = ProcessTemplateBody(request.Body, request.BodyFormat);
        template.Name = request.Name.Trim();
        template.Subject = request.Subject.Trim();
        template.Body = processed.StoredBody;
        template.BodyFormat = processed.BodyFormat;
        template.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        return ToResponse(template);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var template = await dbContext.EmailTemplates
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (template is null)
        {
            return false;
        }

        dbContext.EmailTemplates.Remove(template);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static ProcessedCampaignBody ProcessTemplateBody(string body, string? bodyFormat)
    {
        var processed = CampaignEmailBodyProcessor.Process(body, bodyFormat);
        if (processed.HtmlBody is not null)
        {
            CampaignEmailBodyProcessor.ValidateImageSources(processed.HtmlBody);
        }

        return processed;
    }

    private static EmailTemplateResponse ToResponse(EmailTemplate template) =>
        new(
            template.Id,
            template.Name,
            template.Subject,
            template.Body,
            template.BodyFormat.ToString().ToLowerInvariant(),
            template.CreatedAt,
            template.UpdatedAt);
}
