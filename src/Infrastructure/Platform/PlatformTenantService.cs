using System.Net.Mail;
using System.Text.Json;
using Cohestra.Application.Tenants;
using Cohestra.Contracts.Platform;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Cohestra.Infrastructure.Platform;

public sealed class PlatformTenantService(CohestraDbContext dbContext) : IPlatformTenantService
{
    private const int MaxNameLength = 200;
    private const int MaxEmailLength = 320;
    private const int MaxReasonLength = 1000;

    public async Task<PlatformTenantResult<TenantResponse>> CreateAsync(
        CreateTenantRequest request,
        Guid actorUserId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return PlatformTenantResult<TenantResponse>.Fail(PlatformTenantError.Validation, "Name is required.");
        }

        var name = request.Name.Trim();
        if (name.Length > MaxNameLength)
        {
            return PlatformTenantResult<TenantResponse>.Fail(
                PlatformTenantError.Validation,
                $"Name must be at most {MaxNameLength} characters.");
        }

        if (string.IsNullOrWhiteSpace(request.AdminContactEmail))
        {
            return PlatformTenantResult<TenantResponse>.Fail(
                PlatformTenantError.Validation,
                "Admin contact email is required.");
        }

        var email = request.AdminContactEmail.Trim();
        if (email.Length > MaxEmailLength || !IsValidEmail(email))
        {
            return PlatformTenantResult<TenantResponse>.Fail(
                PlatformTenantError.Validation,
                "Admin contact email must be a valid email address (max 320 characters).");
        }

        var slugError = TenantSlugRules.ValidateForProvision(request.Slug);
        if (slugError is not null)
        {
            return PlatformTenantResult<TenantResponse>.Fail(PlatformTenantError.Validation, slugError);
        }

        if (!TryParsePlan(request.Plan, out var plan))
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
            Name = name,
            AdminContactEmail = email,
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

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            return PlatformTenantResult<TenantResponse>.Fail(
                PlatformTenantError.Conflict,
                $"Slug '{slug}' is already in use.");
        }

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

        var reason = request.Reason.Trim();
        if (reason.Length > MaxReasonLength)
        {
            return PlatformTenantResult<TenantResponse>.Fail(
                PlatformTenantError.Validation,
                $"Suspend reason must be at most {MaxReasonLength} characters.");
        }

        var tenant = await dbContext.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);
        if (tenant is null)
        {
            return PlatformTenantResult<TenantResponse>.Fail(PlatformTenantError.NotFound, "Tenant not found.");
        }

        if (tenant.Id == TenantIds.Default)
        {
            return PlatformTenantResult<TenantResponse>.Fail(
                PlatformTenantError.Conflict,
                "Cannot suspend the Platform 0 default tenant.");
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
            Reason = reason,
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

        if (tenant.Id == TenantIds.Default)
        {
            return PlatformTenantResult<TenantResponse>.Fail(
                PlatformTenantError.Conflict,
                "Cannot archive the Platform 0 default tenant.");
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
        // Keep SuspendedAt when archiving from Suspended (forensic timeline).
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

    private static bool TryParsePlan(string? plan, out TenantPlan parsed)
    {
        parsed = default;
        if (string.IsNullOrWhiteSpace(plan))
        {
            return false;
        }

        var value = plan.Trim();
        if (value.All(char.IsDigit))
        {
            return false;
        }

        return Enum.TryParse(value, ignoreCase: true, out parsed) && Enum.IsDefined(parsed);
    }

    private static bool IsValidEmail(string email)
    {
        try
        {
            var address = new MailAddress(email);
            return address.Address.Equals(email, StringComparison.OrdinalIgnoreCase);
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private static bool IsUniqueConstraintViolation(DbUpdateException exception) =>
        exception.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation,
        };

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
