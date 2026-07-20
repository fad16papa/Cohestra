using System.Text.Json;
using Cohestra.Application.Tenants;
using Cohestra.Contracts.Platform;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Platform;

public sealed class PlatformTenantService(CohestraDbContext dbContext) : IPlatformTenantService
{
    public async Task<PlatformTenantResult<TenantResponse>> CreateAsync(
        CreateTenantRequest request,
        Guid actorUserId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return PlatformTenantResult<TenantResponse>.Fail(PlatformTenantError.Validation, "Name is required.");
        }

        if (string.IsNullOrWhiteSpace(request.AdminContactEmail))
        {
            return PlatformTenantResult<TenantResponse>.Fail(
                PlatformTenantError.Validation,
                "Admin contact email is required.");
        }

        var slugError = TenantSlugRules.ValidateForProvision(request.Slug);
        if (slugError is not null)
        {
            return PlatformTenantResult<TenantResponse>.Fail(PlatformTenantError.Validation, slugError);
        }

        if (!Enum.TryParse<TenantPlan>(request.Plan, ignoreCase: true, out var plan))
        {
            return PlatformTenantResult<TenantResponse>.Fail(
                PlatformTenantError.Validation,
                "Plan must be Basic, Core, Pro, or Enterprise.");
        }

        var slug = TenantSlugRules.Normalize(request.Slug);
        var exists = await dbContext.Tenants.AnyAsync(t => t.Slug == slug, cancellationToken);
        if (exists)
        {
            return PlatformTenantResult<TenantResponse>.Fail(
                PlatformTenantError.Conflict,
                $"Slug '{slug}' is already in use.");
        }

        var now = DateTimeOffset.UtcNow;
        var tenant = new Tenant
        {
            Id = Guid.CreateVersion7(),
            Slug = slug,
            Name = request.Name.Trim(),
            AdminContactEmail = request.AdminContactEmail.Trim(),
            Plan = plan,
            Status = TenantStatus.Active,
            BillingStatus = BillingStatus.Free,
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.Tenants.Add(tenant);
        dbContext.PlatformAuditLogs.Add(new PlatformAuditLog
        {
            Id = Guid.CreateVersion7(),
            ActorUserId = actorUserId,
            TenantId = tenant.Id,
            Action = PlatformAuditAction.TenantCreated,
            Reason = null,
            DetailsJson = JsonSerializer.Serialize(new
            {
                tenant.Slug,
                tenant.Name,
                Plan = tenant.Plan.ToString(),
                tenant.AdminContactEmail,
            }),
            CreatedAt = now,
        });

        await dbContext.SaveChangesAsync(cancellationToken);
        return PlatformTenantResult<TenantResponse>.Ok(Map(tenant));
    }

    public async Task<PlatformTenantResult<TenantResponse>> SuspendAsync(
        Guid tenantId,
        SuspendTenantRequest request,
        Guid actorUserId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            return PlatformTenantResult<TenantResponse>.Fail(
                PlatformTenantError.Validation,
                "Suspend reason is required (abuse / ToS / support freeze — not non-payment).");
        }

        var tenant = await dbContext.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);
        if (tenant is null)
        {
            return PlatformTenantResult<TenantResponse>.Fail(PlatformTenantError.NotFound, "Tenant not found.");
        }

        if (tenant.Status != TenantStatus.Active)
        {
            return PlatformTenantResult<TenantResponse>.Fail(
                PlatformTenantError.Conflict,
                $"Cannot suspend tenant in status {tenant.Status}.");
        }

        var now = DateTimeOffset.UtcNow;
        var billingBefore = tenant.BillingStatus;
        tenant.Status = TenantStatus.Suspended;
        tenant.SuspendedAt = now;
        tenant.UpdatedAt = now;

        dbContext.PlatformAuditLogs.Add(new PlatformAuditLog
        {
            Id = Guid.CreateVersion7(),
            ActorUserId = actorUserId,
            TenantId = tenant.Id,
            Action = PlatformAuditAction.TenantSuspended,
            Reason = request.Reason.Trim(),
            DetailsJson = JsonSerializer.Serialize(new
            {
                BillingStatusUnchanged = billingBefore.ToString(),
                Note = "Break-glass suspend (abuse/ToS/support freeze) — not collections.",
            }),
            CreatedAt = now,
        });

        await dbContext.SaveChangesAsync(cancellationToken);
        return PlatformTenantResult<TenantResponse>.Ok(Map(tenant));
    }

    public async Task<PlatformTenantResult<TenantResponse>> ReactivateAsync(
        Guid tenantId,
        Guid actorUserId,
        CancellationToken cancellationToken = default)
    {
        var tenant = await dbContext.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);
        if (tenant is null)
        {
            return PlatformTenantResult<TenantResponse>.Fail(PlatformTenantError.NotFound, "Tenant not found.");
        }

        if (tenant.Status != TenantStatus.Suspended)
        {
            return PlatformTenantResult<TenantResponse>.Fail(
                PlatformTenantError.Conflict,
                $"Cannot reactivate tenant in status {tenant.Status}.");
        }

        var now = DateTimeOffset.UtcNow;
        var billingBefore = tenant.BillingStatus;
        tenant.Status = TenantStatus.Active;
        tenant.SuspendedAt = null;
        tenant.UpdatedAt = now;

        dbContext.PlatformAuditLogs.Add(new PlatformAuditLog
        {
            Id = Guid.CreateVersion7(),
            ActorUserId = actorUserId,
            TenantId = tenant.Id,
            Action = PlatformAuditAction.TenantReactivated,
            DetailsJson = JsonSerializer.Serialize(new
            {
                BillingStatusUnchanged = billingBefore.ToString(),
            }),
            CreatedAt = now,
        });

        await dbContext.SaveChangesAsync(cancellationToken);
        return PlatformTenantResult<TenantResponse>.Ok(Map(tenant));
    }

    public async Task<PlatformTenantResult<TenantResponse>> ArchiveAsync(
        Guid tenantId,
        Guid actorUserId,
        CancellationToken cancellationToken = default)
    {
        var tenant = await dbContext.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);
        if (tenant is null)
        {
            return PlatformTenantResult<TenantResponse>.Fail(PlatformTenantError.NotFound, "Tenant not found.");
        }

        if (tenant.Status == TenantStatus.Archived)
        {
            return PlatformTenantResult<TenantResponse>.Fail(
                PlatformTenantError.Conflict,
                "Tenant is already archived.");
        }

        var now = DateTimeOffset.UtcNow;
        tenant.Status = TenantStatus.Archived;
        tenant.ArchivedAt = now;
        tenant.SuspendedAt = null;
        tenant.UpdatedAt = now;

        dbContext.PlatformAuditLogs.Add(new PlatformAuditLog
        {
            Id = Guid.CreateVersion7(),
            ActorUserId = actorUserId,
            TenantId = tenant.Id,
            Action = PlatformAuditAction.TenantArchived,
            DetailsJson = JsonSerializer.Serialize(new
            {
                SoftArchiveDays = 30,
                Note = "Soft archive; hard purge job out of scope for Story 11.3.",
            }),
            CreatedAt = now,
        });

        await dbContext.SaveChangesAsync(cancellationToken);
        return PlatformTenantResult<TenantResponse>.Ok(Map(tenant));
    }

    private static TenantResponse Map(Tenant tenant) =>
        new(
            tenant.Id,
            tenant.Slug,
            tenant.Name,
            tenant.Plan.ToString(),
            tenant.Status.ToString(),
            tenant.BillingStatus.ToString(),
            tenant.AdminContactEmail,
            tenant.SuspendedAt,
            tenant.ArchivedAt,
            tenant.CreatedAt,
            tenant.UpdatedAt);
}
