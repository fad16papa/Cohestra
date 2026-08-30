using System.Text.Json;
using Cohestra.Application.Activities;
using Cohestra.Application.Tenants;
using Cohestra.Contracts.Activities;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Tenants;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Activities;

public sealed class FormTemplateService(
    CohestraDbContext dbContext,
    ICurrentTenant currentTenant) : IFormTemplateService
{
    public async Task<FormTemplateListResponse> ListAsync(
        CancellationToken cancellationToken = default)
    {
        var templates = await dbContext.TenantFormTemplates
            .AsNoTracking()
            .OrderBy(template => template.Name)
            .Select(template => ToSummary(template))
            .ToListAsync(cancellationToken);

        var usage = await BuildUsageAsync(cancellationToken);
        return new FormTemplateListResponse(templates, usage);
    }

    public async Task<FormTemplateResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var template = await dbContext.TenantFormTemplates
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        return template is null ? null : ToResponse(template);
    }

    public async Task<FormTemplateResponse> CreateAsync(
        CreateFormTemplateRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var nameError = ValidateName(request.Name);
        if (nameError is not null)
        {
            throw new ArgumentException(nameError);
        }

        var validationError = FormSchemaValidator.ValidateDto(request.FormSchema);
        if (validationError is not null)
        {
            throw new ArgumentException(validationError);
        }

        var mapped = FormSchemaValidator.MapToDomain(request.FormSchema);
        FormFieldStepAssigner.ApplyMissingBuckets(mapped);
        await EnsureFormSchemaPlanAllowedAsync(mapped, tenantId, cancellationToken);
        await EnsureCanAddTemplateAsync(tenantId, cancellationToken);

        var now = DateTimeOffset.UtcNow;
        var template = new TenantFormTemplate
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = request.Name.Trim(),
            FormSchema = CloneSchema(mapped),
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.TenantFormTemplates.Add(template);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ToResponse(template);
    }

    public async Task<FormTemplateResponse?> UpdateAsync(
        Guid id,
        UpdateFormTemplateRequest request,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var template = await dbContext.TenantFormTemplates
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (template is null)
        {
            return null;
        }

        if (request.Name is not null)
        {
            var nameError = ValidateName(request.Name);
            if (nameError is not null)
            {
                throw new ArgumentException(nameError);
            }

            template.Name = request.Name.Trim();
        }

        if (request.FormSchema is not null)
        {
            var validationError = FormSchemaValidator.ValidateDto(request.FormSchema);
            if (validationError is not null)
            {
                throw new ArgumentException(validationError);
            }

            var mapped = FormSchemaValidator.MapToDomain(request.FormSchema);
            FormFieldStepAssigner.ApplyMissingBuckets(mapped);
            await EnsureFormSchemaPlanAllowedAsync(mapped, tenantId, cancellationToken);
            template.FormSchema = CloneSchema(mapped);
        }

        template.UpdatedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        return ToResponse(template);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var template = await dbContext.TenantFormTemplates
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (template is null)
        {
            return false;
        }

        dbContext.TenantFormTemplates.Remove(template);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task EnsureCanAddTemplateAsync(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var plan = await GetTenantPlanAsync(tenantId, cancellationToken);
        var limit = FormTemplateSlotLimits.For(plan);
        var used = await dbContext.TenantFormTemplates.CountAsync(cancellationToken);

        if (!TenantPlanLimitValidator.IsAtOrOverCapacity(used, limit))
        {
            return;
        }

        var message = plan switch
        {
            TenantPlan.Basic =>
                "Core saves up to 5 form recipes for every new session.",
            TenantPlan.Core =>
                "Pro saves up to 25 form recipes. Upgrade to save more templates.",
            TenantPlan.Pro =>
                $"Saved form templates are at capacity ({used}/{limit}). Delete a template to save a new one.",
            _ => TenantPlanLimitValidator.ValidateCanAddFormTemplate(used, limit)
                 ?? "Saved form templates are at capacity.",
        };

        throw new FormTemplatePlanLockedException(message);
    }

    private async Task<FormTemplateUsageResponse> BuildUsageAsync(
        CancellationToken cancellationToken)
    {
        var tenantId = RequireTenantId();
        var plan = await GetTenantPlanAsync(tenantId, cancellationToken);
        var limit = FormTemplateSlotLimits.For(plan);
        var used = await dbContext.TenantFormTemplates.CountAsync(cancellationToken);
        return new FormTemplateUsageResponse(used, limit);
    }

    private async Task EnsureFormSchemaPlanAllowedAsync(
        ActivityFormSchema schema,
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var hasRecipes = schema.Fields.Any(field => field.VisibleWhen is not null);
        var hasSteps = schema.Meta is { SplitIntoSteps: true };
        var hasCorePlusFields = schema.Fields.Any(field =>
            FormFieldTypes.CorePlusOnly.Contains(field.Type));

        if (!hasRecipes && !hasSteps && !hasCorePlusFields)
        {
            return;
        }

        var plan = await GetTenantPlanAsync(tenantId, cancellationToken);

        if (hasCorePlusFields && plan is TenantPlan.Basic)
        {
            throw new FormSchemaPlanLockedException(
                "Scale and emergency contact fields require a Core or Pro plan.");
        }

        if (hasRecipes && plan is TenantPlan.Basic)
        {
            throw new FormSchemaPlanLockedException(
                "Form Recipes require a Core or Pro plan.");
        }

        if (hasSteps && plan is not (TenantPlan.Pro or TenantPlan.Enterprise))
        {
            throw new FormSchemaPlanLockedException(
                "Split into steps requires a Pro plan.");
        }
    }

    private async Task<TenantPlan> GetTenantPlanAsync(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var plan = await dbContext.Tenants
            .AsNoTracking()
            .Where(tenant => tenant.Id == tenantId)
            .Select(tenant => (TenantPlan?)tenant.Plan)
            .FirstOrDefaultAsync(cancellationToken);

        if (plan is null)
        {
            throw new InvalidOperationException("Tenant not found for form template plan gate.");
        }

        return plan.Value;
    }

    private Guid RequireTenantId()
    {
        if (!currentTenant.IsResolved || currentTenant.TenantId is not Guid tenantId || tenantId == Guid.Empty)
        {
            throw new InvalidOperationException("Tenant context is required for form templates.");
        }

        return tenantId;
    }

    private static string? ValidateName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return "Template name is required.";
        }

        if (name.Trim().Length > 120)
        {
            return "Template name must be 120 characters or fewer.";
        }

        return null;
    }

    private static ActivityFormSchema CloneSchema(ActivityFormSchema schema)
    {
        var json = JsonSerializer.Serialize(schema, ActivityFormSchemaJson.SerializerOptions);
        return JsonSerializer.Deserialize<ActivityFormSchema>(json, ActivityFormSchemaJson.SerializerOptions)
               ?? new ActivityFormSchema();
    }

    private static FormTemplateSummaryResponse ToSummary(TenantFormTemplate template) =>
        new(template.Id, template.Name, template.CreatedAt, template.UpdatedAt);

    private static FormTemplateResponse ToResponse(TenantFormTemplate template) =>
        new(
            template.Id,
            template.Name,
            FormSchemaMapper.ToDto(template.FormSchema)!,
            template.CreatedAt,
            template.UpdatedAt);
}
