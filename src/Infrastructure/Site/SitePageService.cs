using LeadGenerationCrm.Application.Site;
using LeadGenerationCrm.Contracts.Site;
using LeadGenerationCrm.Domain.Site;
using LeadGenerationCrm.Infrastructure.Activities;
using LeadGenerationCrm.Infrastructure.Campaigns;
using LeadGenerationCrm.Infrastructure.Persistence;
using LeadGenerationCrm.Infrastructure.Seed;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace LeadGenerationCrm.Infrastructure.Site;

public sealed class SitePageService(
    LeadGenerationCrmDbContext dbContext,
    SitePublishGateValidator publishGateValidator,
    IPublishedSiteCache publishedSiteCache,
    SitePreviewTokenService previewTokenService,
    IOptions<CampaignAssetOptions> campaignAssetOptions,
    IOptions<SiteLandingSeedSettings> landingSeedSettings) : ISitePageService
{
    private const int MaxSavedTemplates = 12;
    public async Task<SitePageAdminResponse> GetAdminAsync(CancellationToken cancellationToken = default)
    {
        var page = await GetOrCreateSingletonAsync(cancellationToken);
        var savedTemplates = await LoadSavedTemplateSummariesAsync(cancellationToken);
        return ToAdminResponse(page, savedTemplates);
    }

    public async Task<SitePageAdminResponse> UpdateDraftAsync(
        UpdateSiteDraftRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.Draft is null)
        {
            throw new InvalidOperationException("Draft payload is required.");
        }

        if (request.Draft.SchemaVersion != 1)
        {
            throw new InvalidOperationException("Unsupported schema version. Only schema version 1 is supported.");
        }

        var accentError = ActivityBrandingValidator.ValidateAccentColor(request.Draft.AccentColor);
        if (accentError is not null)
        {
            throw new InvalidOperationException(accentError);
        }

        var page = await GetOrCreateSingletonAsync(cancellationToken);
        var now = DateTimeOffset.UtcNow;

        page.DraftSections = ToDocument(request.Draft);
        page.DraftUpdatedAt = now;
        page.SchemaVersion = request.Draft.SchemaVersion;

        await dbContext.SaveChangesAsync(cancellationToken);
        var savedTemplates = await LoadSavedTemplateSummariesAsync(cancellationToken);
        return ToAdminResponse(page, savedTemplates);
    }

    public async Task<SitePageAdminResponse> PublishAsync(
        Guid publishedByUserId,
        CancellationToken cancellationToken = default)
    {
        var page = await GetOrCreateSingletonAsync(cancellationToken);

        var publishGateError = await publishGateValidator.ValidateForPublishAsync(
            page.DraftSections,
            cancellationToken);

        if (publishGateError is not null)
        {
            throw new InvalidOperationException(publishGateError);
        }

        if (SiteSectionsDocumentJson.DocumentsEqual(page.DraftSections, page.PublishedSections) &&
            page.PublishedAt is not null)
        {
            var unchangedTemplates = await LoadSavedTemplateSummariesAsync(cancellationToken);
            return ToAdminResponse(page, unchangedTemplates);
        }

        var now = DateTimeOffset.UtcNow;

        if (page.PublishedSections is not null && page.PublishedAt is not null)
        {
            page.PreviousPublishedSections = CloneDocument(page.PublishedSections);
            page.PreviousPublishedAt = page.PublishedAt;
        }

        page.PublishedSections = CloneDocument(page.DraftSections!);
        page.PublishedAt = now;
        page.PublishedByUserId = publishedByUserId;

        await dbContext.SaveChangesAsync(cancellationToken);
        await SyncPublishedSiteCacheAsync(page, cancellationToken);
        var savedTemplates = await LoadSavedTemplateSummariesAsync(cancellationToken);
        return ToAdminResponse(page, savedTemplates);
    }

    public async Task<SitePageAdminResponse> ApplyPresetAsync(
        string presetId,
        CancellationToken cancellationToken = default)
    {
        if (!SitePageLayoutPresets.IsBuiltInPresetId(presetId))
        {
            throw new InvalidOperationException(
                "Preset must be community, minimal, showcase, or event-hub.");
        }

        var page = await GetOrCreateSingletonAsync(cancellationToken);
        var currentDraft = page.DraftSections ?? CreateEmptyDraft();
        var presetDocument = SitePageSeedDocumentBuilder.ApplyPresetToDraft(
            currentDraft,
            landingSeedSettings.Value,
            presetId.Trim());

        var accentError = ActivityBrandingValidator.ValidateAccentColor(presetDocument.AccentColor);
        if (accentError is not null)
        {
            throw new InvalidOperationException(accentError);
        }

        page.DraftSections = presetDocument;
        page.DraftUpdatedAt = DateTimeOffset.UtcNow;
        page.SchemaVersion = presetDocument.SchemaVersion;

        await dbContext.SaveChangesAsync(cancellationToken);
        var presetSavedTemplates = await LoadSavedTemplateSummariesAsync(cancellationToken);
        return ToAdminResponse(page, presetSavedTemplates);
    }

    public async Task<SitePageAdminResponse> ApplySavedTemplateAsync(
        Guid templateId,
        CancellationToken cancellationToken = default)
    {
        var template = await dbContext.SiteHomepageTemplates
            .FirstOrDefaultAsync(item => item.Id == templateId, cancellationToken);

        if (template is null)
        {
            throw new InvalidOperationException("Saved template was not found.");
        }

        if (template.Sections.Count == 0)
        {
            throw new InvalidOperationException("Saved template has no sections.");
        }

        var page = await GetOrCreateSingletonAsync(cancellationToken);
        var currentDraft = page.DraftSections ?? CreateEmptyDraft();
        var templateDocument = SitePageSeedDocumentBuilder.ApplySavedTemplateToDraft(
            currentDraft,
            template.Sections,
            landingSeedSettings.Value);

        var accentError = ActivityBrandingValidator.ValidateAccentColor(templateDocument.AccentColor);
        if (accentError is not null)
        {
            throw new InvalidOperationException(accentError);
        }

        page.DraftSections = templateDocument;
        page.DraftUpdatedAt = DateTimeOffset.UtcNow;
        page.SchemaVersion = templateDocument.SchemaVersion;

        await dbContext.SaveChangesAsync(cancellationToken);
        var savedTemplates = await LoadSavedTemplateSummariesAsync(cancellationToken);
        return ToAdminResponse(page, savedTemplates);
    }

    public async Task<SiteHomepageTemplateSummaryDto> CreateSavedTemplateAsync(
        string name,
        CancellationToken cancellationToken = default)
    {
        var trimmedName = name.Trim();
        if (trimmedName.Length < 2)
        {
            throw new InvalidOperationException("Template name must be at least 2 characters.");
        }

        if (trimmedName.Length > 80)
        {
            throw new InvalidOperationException("Template name must be 80 characters or fewer.");
        }

        var existingCount = await dbContext.SiteHomepageTemplates.CountAsync(cancellationToken);
        if (existingCount >= MaxSavedTemplates)
        {
            throw new InvalidOperationException(
                $"You can save up to {MaxSavedTemplates} homepage templates.");
        }

        var page = await GetOrCreateSingletonAsync(cancellationToken);
        var draft = page.DraftSections ?? CreateEmptyDraft();
        if (draft.Sections.Count == 0)
        {
            throw new InvalidOperationException("Add at least one section before saving a template.");
        }

        var now = DateTimeOffset.UtcNow;
        var template = new SiteHomepageTemplate
        {
            Id = Guid.NewGuid(),
            Name = trimmedName,
            Sections = CloneSections(draft.Sections),
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.SiteHomepageTemplates.Add(template);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ToTemplateSummary(template);
    }

    public async Task<SitePageAdminResponse> DeleteSavedTemplateAsync(
        Guid templateId,
        CancellationToken cancellationToken = default)
    {
        var template = await dbContext.SiteHomepageTemplates
            .FirstOrDefaultAsync(item => item.Id == templateId, cancellationToken);

        if (template is null)
        {
            throw new InvalidOperationException("Saved template was not found.");
        }

        dbContext.SiteHomepageTemplates.Remove(template);
        await dbContext.SaveChangesAsync(cancellationToken);

        var page = await GetOrCreateSingletonAsync(cancellationToken);
        var savedTemplates = await LoadSavedTemplateSummariesAsync(cancellationToken);
        return ToAdminResponse(page, savedTemplates);
    }

    public async Task<SitePageAdminResponse> RevertPublishedAsync(
        Guid revertedByUserId,
        CancellationToken cancellationToken = default)
    {
        var page = await GetOrCreateSingletonAsync(cancellationToken);

        if (page.PreviousPublishedSections is null || page.PreviousPublishedAt is null)
        {
            throw new InvalidOperationException("No previous published homepage to revert to.");
        }

        page.PublishedSections = CloneDocument(page.PreviousPublishedSections);
        page.PublishedAt = page.PreviousPublishedAt;
        page.PublishedByUserId = revertedByUserId;
        page.PreviousPublishedSections = null;
        page.PreviousPublishedAt = null;

        await dbContext.SaveChangesAsync(cancellationToken);
        await SyncPublishedSiteCacheAsync(page, cancellationToken);
        var revertSavedTemplates = await LoadSavedTemplateSummariesAsync(cancellationToken);
        return ToAdminResponse(page, revertSavedTemplates);
    }

    public async Task<PublicSiteResponse?> GetPublicAsync(CancellationToken cancellationToken = default)
    {
        SiteSectionsDocumentDto publishedDto;
        DateTimeOffset? publishedAt;

        var cached = await publishedSiteCache.GetAsync(cancellationToken);
        if (cached is not null)
        {
            publishedDto = cached.Published;
            publishedAt = cached.PublishedAt;
        }
        else
        {
            var page = await dbContext.SitePages
                .AsNoTracking()
                .FirstOrDefaultAsync(item => item.Id == SitePage.SingletonId, cancellationToken);

            if (page?.PublishedSections is null || page.PublishedAt is null)
            {
                return null;
            }

            publishedDto = ToDto(page.PublishedSections);
            publishedAt = page.PublishedAt;

            await publishedSiteCache.SetAsync(
                new PublishedSiteCacheEntry(publishedDto, publishedAt.Value),
                cancellationToken);
        }

        var upcomingActivities = await SiteUpcomingActivitiesResolver.LoadAsync(
            dbContext,
            publishedDto,
            campaignAssetOptions.Value.PublicApiBaseUrl,
            cancellationToken);

        return new PublicSiteResponse(publishedDto, publishedAt, upcomingActivities);
    }

    public Task<SitePreviewTokenResponse> CreatePreviewTokenAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        _ = cancellationToken;
        var result = previewTokenService.CreateToken(userId);
        return Task.FromResult(new SitePreviewTokenResponse(result.Token, result.ExpiresAt));
    }

    public async Task<PublicSiteResponse?> GetPreviewAsync(
        string previewToken,
        CancellationToken cancellationToken = default)
    {
        if (!previewTokenService.TryValidate(previewToken, out _))
        {
            return null;
        }

        var page = await dbContext.SitePages
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == SitePage.SingletonId, cancellationToken);

        if (page?.DraftSections is null)
        {
            return null;
        }

        var draftDto = ToDto(page.DraftSections);
        var upcomingActivities = await SiteUpcomingActivitiesResolver.LoadAsync(
            dbContext,
            draftDto,
            campaignAssetOptions.Value.PublicApiBaseUrl,
            cancellationToken);

        return new PublicSiteResponse(draftDto, page.DraftUpdatedAt, upcomingActivities);
    }

    private async Task SyncPublishedSiteCacheAsync(SitePage page, CancellationToken cancellationToken)
    {
        await publishedSiteCache.InvalidateAsync(cancellationToken);

        if (page.PublishedSections is null || page.PublishedAt is null)
        {
            return;
        }

        await publishedSiteCache.SetAsync(
            new PublishedSiteCacheEntry(ToDto(page.PublishedSections), page.PublishedAt.Value),
            cancellationToken);
    }

    private async Task<SitePage> GetOrCreateSingletonAsync(CancellationToken cancellationToken)
    {
        var page = await dbContext.SitePages
            .FirstOrDefaultAsync(item => item.Id == SitePage.SingletonId, cancellationToken);

        if (page is not null)
        {
            return page;
        }

        var now = DateTimeOffset.UtcNow;
        page = new SitePage
        {
            Id = SitePage.SingletonId,
            DraftSections = CreateEmptyDraft(),
            PublishedSections = null,
            DraftUpdatedAt = now,
            SchemaVersion = 1,
        };

        dbContext.SitePages.Add(page);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            return page;
        }
        catch (DbUpdateException)
        {
            dbContext.Entry(page).State = EntityState.Detached;
            return await dbContext.SitePages
                .FirstAsync(item => item.Id == SitePage.SingletonId, cancellationToken);
        }
    }

    private static SiteSectionsDocument CreateEmptyDraft() =>
        new()
        {
            SchemaVersion = 1,
            SiteName = string.Empty,
            Sections = [],
        };

    private static SitePageAdminResponse ToAdminResponse(
        SitePage page,
        IReadOnlyList<SiteHomepageTemplateSummaryDto> savedTemplates)
    {
        var draft = page.DraftSections ?? CreateEmptyDraft();
        var published = page.PublishedSections is null ? null : ToDto(page.PublishedSections);
        var hasUnpublishedChanges = !SiteSectionsDocumentJson.DocumentsEqual(
            draft,
            page.PublishedSections);

        return new SitePageAdminResponse(
            ToDto(draft),
            published,
            page.DraftUpdatedAt,
            page.PublishedAt,
            page.PublishedByUserId?.ToString(),
            hasUnpublishedChanges,
            page.PreviousPublishedSections is not null && page.PreviousPublishedAt is not null,
            page.PreviousPublishedAt,
            savedTemplates);
    }

    private async Task<IReadOnlyList<SiteHomepageTemplateSummaryDto>> LoadSavedTemplateSummariesAsync(
        CancellationToken cancellationToken)
    {
        var templates = await dbContext.SiteHomepageTemplates
            .AsNoTracking()
            .OrderByDescending(template => template.UpdatedAt)
            .ToListAsync(cancellationToken);

        return templates.Select(ToTemplateSummary).ToList();
    }

    private static SiteHomepageTemplateSummaryDto ToTemplateSummary(SiteHomepageTemplate template) =>
        new(
            template.Id.ToString(),
            template.Name,
            template.CreatedAt,
            template.UpdatedAt,
            template.Sections.Count);

    private static List<SiteSection> CloneSections(IEnumerable<SiteSection> sections) =>
        sections
            .Select(section => new SiteSection
            {
                Id = section.Id,
                Type = section.Type,
                Enabled = section.Enabled,
                Order = section.Order,
                Props = section.Props,
            })
            .ToList();

    private static SiteSectionsDocumentDto ToDto(SiteSectionsDocument document) =>
        new(
            document.SchemaVersion,
            document.SiteName,
            document.AccentColor,
            document.LogoAssetId,
            document.PresetId,
            document.Sections
                .OrderBy(section => section.Order)
                .Select(section => new SiteSectionDto(
                    section.Id,
                    section.Type,
                    section.Enabled,
                    section.Order,
                    section.Props))
                .ToList());

    private static SiteSectionsDocument ToDocument(SiteSectionsDocumentDto dto) =>
        new()
        {
            SchemaVersion = dto.SchemaVersion,
            SiteName = dto.SiteName ?? string.Empty,
            AccentColor = dto.AccentColor,
            LogoAssetId = dto.LogoAssetId,
            PresetId = dto.PresetId,
            Sections = dto.Sections
                .Select(section => new SiteSection
                {
                    Id = section.Id,
                    Type = section.Type,
                    Enabled = section.Enabled,
                    Order = section.Order,
                    Props = section.Props,
                })
                .ToList(),
        };

    private static SiteSectionsDocument CloneDocument(SiteSectionsDocument source) =>
        System.Text.Json.JsonSerializer.Deserialize<SiteSectionsDocument>(
            SiteSectionsDocumentJson.Serialize(source),
            SiteSectionsDocumentJson.SerializerOptions)
        ?? throw new InvalidOperationException("Could not clone site draft document.");
}
