using System.Net.Mail;
using System.Text.Json;
using Cohestra.Application.Tenants;
using Cohestra.Contracts.Platform;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Clients;
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
    private const int DefaultPageSize = 25;
    private const int MaxPageSize = 100;
    private const int MaxPage = 10_000;
    private const int MaxSearchLength = 200;
    private const int DefaultAuditTake = 25;
    private const int MaxAuditTake = 50;

    public async Task<TenantListResponse> ListAsync(
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var normalizedPageSize = pageSize < 1
            ? DefaultPageSize
            : Math.Min(pageSize, MaxPageSize);
        var normalizedPage = page < 1 ? 1 : Math.Min(page, MaxPage);
        // Keep Skip within Int32 range for EF providers.
        var maxSafePage = Math.Max(1, (int.MaxValue / normalizedPageSize) - 1);
        if (normalizedPage > maxSafePage)
        {
            normalizedPage = maxSafePage;
        }

        var query = dbContext.Tenants.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            if (term.Length > MaxSearchLength)
            {
                term = term[..MaxSearchLength];
            }

            term = term.ToLowerInvariant();
            query = query.Where(t =>
                t.Slug.ToLower().Contains(term) ||
                t.Name.ToLower().Contains(term));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var tenants = await query
            .OrderByDescending(t => t.CreatedAt)
            .ThenBy(t => t.Slug)
            .Skip((normalizedPage - 1) * normalizedPageSize)
            .Take(normalizedPageSize)
            .ToListAsync(cancellationToken);

        var ids = tenants.Select(t => t.Id).ToList();
        var activityCounts = ids.Count == 0
            ? new Dictionary<Guid, int>()
            : await dbContext.IgnoreTenantFilters<Activity>()
                .AsNoTracking()
                .Where(a => ids.Contains(a.TenantId))
                .GroupBy(a => a.TenantId)
                .Select(g => new { TenantId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.TenantId, x => x.Count, cancellationToken);

        var clientCounts = ids.Count == 0
            ? new Dictionary<Guid, int>()
            : await dbContext.IgnoreTenantFilters<Client>()
                .AsNoTracking()
                .Where(c => ids.Contains(c.TenantId))
                .GroupBy(c => c.TenantId)
                .Select(g => new { TenantId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.TenantId, x => x.Count, cancellationToken);

        var items = tenants.Select(t => new TenantListItemResponse(
            t.Id,
            t.Slug,
            t.Name,
            t.Plan.ToString(),
            t.Status.ToString(),
            t.BillingStatus.ToString(),
            t.IsComplimentary,
            t.AdminContactEmail,
            t.CreatedAt,
            activityCounts.GetValueOrDefault(t.Id),
            clientCounts.GetValueOrDefault(t.Id))).ToList();

        return new TenantListResponse(items, normalizedPage, normalizedPageSize, totalCount);
    }

    public async Task<PlatformTenantResult<TenantDetailResponse>> GetByIdAsync(
        Guid tenantId,
        int auditTake = DefaultAuditTake,
        CancellationToken cancellationToken = default)
    {
        var tenant = await dbContext.Tenants.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);
        if (tenant is null)
        {
            return PlatformTenantResult<TenantDetailResponse>.Fail(
                PlatformTenantError.NotFound,
                "Tenant not found.");
        }

        var take = auditTake < 1
            ? DefaultAuditTake
            : Math.Min(auditTake, MaxAuditTake);

        var audits = await dbContext.PlatformAuditLogs.AsNoTracking()
            .Where(a => a.TenantId == tenantId)
            .OrderByDescending(a => a.CreatedAt)
            .Take(take)
            .Select(a => new PlatformAuditEntryResponse(
                a.Id,
                a.ActorUserId,
                a.TenantId,
                a.Action.ToString(),
                a.Reason,
                a.CreatedAt))
            .ToListAsync(cancellationToken);

        return PlatformTenantResult<TenantDetailResponse>.Ok(
            new TenantDetailResponse(Map(tenant), audits));
    }

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

        TenantPlan plan;
        if (request.IsComplimentary)
        {
            if (!TryParseComplimentaryPlan(request.Plan, out plan))
            {
                return PlatformTenantResult<TenantResponse>.Fail(
                    PlatformTenantError.Validation,
                    "Complimentary plan must be Basic, Core, or Pro.");
            }
        }
        else if (!TryParsePlan(request.Plan, out plan))
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
            IsComplimentary = request.IsComplimentary,
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
                tenant.IsComplimentary,
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

    public async Task<PlatformTenantResult<TenantResponse>> SetComplimentaryAsync(
        Guid tenantId,
        SetComplimentaryRequest request,
        Guid actorUserId,
        CancellationToken cancellationToken = default)
    {
        if (request.IsComplimentary is null)
        {
            return PlatformTenantResult<TenantResponse>.Fail(
                PlatformTenantError.Validation,
                "isComplimentary is required.");
        }

        var setComplimentary = request.IsComplimentary.Value;

        if (tenantId == TenantIds.Default)
        {
            return PlatformTenantResult<TenantResponse>.Fail(
                PlatformTenantError.Conflict,
                "Cannot change complimentary on the Platform 0 default tenant.");
        }

        var tenant = await dbContext.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);
        if (tenant is null)
        {
            return PlatformTenantResult<TenantResponse>.Fail(PlatformTenantError.NotFound, "Tenant not found.");
        }

        if (tenant.Status == TenantStatus.Archived)
        {
            return PlatformTenantResult<TenantResponse>.Fail(
                PlatformTenantError.Conflict,
                "Cannot change complimentary on an Archived tenant.");
        }

        var reason = string.IsNullOrWhiteSpace(request.Reason) ? null : request.Reason.Trim();
        if (reason is { Length: > MaxReasonLength })
        {
            return PlatformTenantResult<TenantResponse>.Fail(
                PlatformTenantError.Validation,
                $"Reason must be at most {MaxReasonLength} characters.");
        }

        var now = DateTimeOffset.UtcNow;
        var planBefore = tenant.Plan;
        var complimentaryBefore = tenant.IsComplimentary;
        var billingBefore = tenant.BillingStatus;

        if (setComplimentary)
        {
            if (!TryParseComplimentaryPlan(request.Plan, out var plan))
            {
                return PlatformTenantResult<TenantResponse>.Fail(
                    PlatformTenantError.Validation,
                    "Complimentary plan must be Basic, Core, or Pro.");
            }

            // Idempotent: already sponsored on the requested plan with Free billing — no duplicate audit.
            // If BillingStatus drifted, fall through to force Free (AC1).
            if (tenant.IsComplimentary && tenant.Plan == plan && tenant.BillingStatus == BillingStatus.Free)
            {
                return PlatformTenantResult<TenantResponse>.Ok(Map(tenant));
            }

            tenant.IsComplimentary = true;
            tenant.Plan = plan;
            tenant.BillingStatus = BillingStatus.Free;
            // Stripe customer/subscription IDs left unchanged (conversion may reuse customer).
            tenant.UpdatedAt = now;

            dbContext.PlatformAuditLogs.Add(new PlatformAuditLog
            {
                Id = Guid.CreateVersion7(),
                ActorUserId = actorUserId,
                TenantId = tenant.Id,
                Action = PlatformAuditAction.ComplimentarySet,
                Reason = reason,
                DetailsJson = JsonSerializer.Serialize(new
                {
                    PlanBefore = planBefore.ToString(),
                    PlanAfter = plan.ToString(),
                    IsComplimentaryBefore = complimentaryBefore,
                    IsComplimentaryAfter = true,
                    BillingStatusBefore = billingBefore.ToString(),
                    BillingStatusAfter = BillingStatus.Free.ToString(),
                    StripeIdsUnchanged = true,
                    Note = "FR-23 delinquency jobs must skip IsComplimentary=true.",
                }),
                CreatedAt = now,
            });
        }
        else
        {
            if (!tenant.IsComplimentary)
            {
                return PlatformTenantResult<TenantResponse>.Fail(
                    PlatformTenantError.Conflict,
                    "Tenant is not complimentary.");
            }

            tenant.IsComplimentary = false;
            tenant.UpdatedAt = now;
            // Plan and BillingStatus left as-is; Checkout (FR-19) required before paid Stripe sync.

            dbContext.PlatformAuditLogs.Add(new PlatformAuditLog
            {
                Id = Guid.CreateVersion7(),
                ActorUserId = actorUserId,
                TenantId = tenant.Id,
                Action = PlatformAuditAction.ComplimentaryCleared,
                Reason = reason,
                DetailsJson = JsonSerializer.Serialize(new
                {
                    IsComplimentaryBefore = true,
                    IsComplimentaryAfter = false,
                    PlanUnchanged = tenant.Plan.ToString(),
                    BillingStatusUnchanged = tenant.BillingStatus.ToString(),
                    Note = "Checkout (FR-19) required before paid entitlements sync from Stripe.",
                }),
                CreatedAt = now,
            });
        }

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

    private static bool TryParseComplimentaryPlan(string? plan, out TenantPlan parsed)
    {
        if (!TryParsePlan(plan, out parsed))
        {
            return false;
        }

        return parsed is TenantPlan.Basic or TenantPlan.Core or TenantPlan.Pro;
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
            tenant.IsComplimentary,
            tenant.AdminContactEmail,
            tenant.SuspendedAt,
            tenant.ArchivedAt,
            tenant.CreatedAt,
            tenant.UpdatedAt);
}
