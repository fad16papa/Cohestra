using System.Text.Json;
using Cohestra.Application.Auth;
using Cohestra.Application.Platform;
using Cohestra.Application.Tenants;
using Cohestra.Contracts.Auth;
using Cohestra.Contracts.Platform;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Support;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Identity;
using Cohestra.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Platform;

public sealed class PlatformTenantOpsService(
    CohestraDbContext dbContext,
    ITenantAccessService tenantAccessService,
    IAuthService authService,
    UserManager<ApplicationUser> userManager) : IPlatformTenantOpsService
{
    private const int MaxSearchLength = 200;
    private const int MaxOmniResults = 20;

    public async Task<PlatformTenantResult<PlatformTenantSnapshotResponse>> GetSnapshotAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var tenant = await dbContext.Tenants.AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == tenantId, cancellationToken);
        if (tenant is null)
        {
            return PlatformTenantResult<PlatformTenantSnapshotResponse>.Fail(
                PlatformTenantError.NotFound,
                "Tenant not found.");
        }

        var usage = await tenantAccessService.GetUsageAsync(tenantId, cancellationToken);
        var limits = TenantPlanLimits.For(tenant.Plan);

        var openIssueCount = await dbContext.IgnoreTenantFilters<SupportIssue>()
            .AsNoTracking()
            .CountAsync(
                issue => issue.TenantId == tenantId
                    && (issue.Status == SupportIssueStatus.Open
                        || issue.Status == SupportIssueStatus.InProgress
                        || issue.Status == SupportIssueStatus.WaitingOnOperator),
                cancellationToken);

        var members = await LoadSnapshotMembersAsync(tenantId, cancellationToken);

        return PlatformTenantResult<PlatformTenantSnapshotResponse>.Ok(
            new PlatformTenantSnapshotResponse(
                tenant.Id,
                tenant.Slug,
                tenant.Name,
                tenant.Plan.ToString(),
                tenant.Status.ToString(),
                tenant.BillingStatus.ToString(),
                tenant.IsComplimentary,
                new PlatformLimitMeterResponse(usage.SeatsUsed, limits.Seats),
                new PlatformLimitMeterResponse(usage.Communities, limits.Communities),
                new PlatformLimitMeterResponse(usage.PublishedActivities, limits.PublishedActivities),
                new PlatformLimitMeterResponse(usage.RegistrationsThisMonth, limits.RegistrationsPerMonth),
                tenant.LastActivityAt,
                openIssueCount,
                PlatformTenantFlags.IsDemoOrLoadTest(tenant.Slug, tenant.Id),
                members));
    }

    public async Task<PlatformTenantResult<IReadOnlyList<PlatformTenantMemberResponse>>> ListMembersAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        if (!await dbContext.Tenants.AsNoTracking().AnyAsync(item => item.Id == tenantId, cancellationToken))
        {
            return PlatformTenantResult<IReadOnlyList<PlatformTenantMemberResponse>>.Fail(
                PlatformTenantError.NotFound,
                "Tenant not found.");
        }

        var members = await (
            from membership in dbContext.TenantMemberships.AsNoTracking()
            join user in dbContext.Users.AsNoTracking() on membership.UserId equals user.Id
            where membership.TenantId == tenantId
            orderby user.Email
            select new PlatformTenantMemberResponse(
                membership.UserId,
                user.Email ?? string.Empty,
                membership.Role.ToString(),
                user.EmailConfirmed))
            .ToListAsync(cancellationToken);

        return PlatformTenantResult<IReadOnlyList<PlatformTenantMemberResponse>>.Ok(members);
    }

    public async Task<PlatformTenantResult<IReadOnlyList<PlatformTenantOpenIssueResponse>>> ListOpenIssuesAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        if (!await dbContext.Tenants.AsNoTracking().AnyAsync(item => item.Id == tenantId, cancellationToken))
        {
            return PlatformTenantResult<IReadOnlyList<PlatformTenantOpenIssueResponse>>.Fail(
                PlatformTenantError.NotFound,
                "Tenant not found.");
        }

        var issues = await dbContext.IgnoreTenantFilters<SupportIssue>()
            .AsNoTracking()
            .Where(issue => issue.TenantId == tenantId
                && issue.Status != SupportIssueStatus.Resolved
                && issue.Status != SupportIssueStatus.Closed)
            .OrderByDescending(issue => issue.CreatedAt)
            .Select(issue => new PlatformTenantOpenIssueResponse(
                issue.Id,
                issue.IssueNumber,
                issue.Subject,
                issue.Status.ToString(),
                issue.CreatedAt))
            .ToListAsync(cancellationToken);

        return PlatformTenantResult<IReadOnlyList<PlatformTenantOpenIssueResponse>>.Ok(issues);
    }

    public async Task<PlatformTenantResult<PlatformRecoveryActionResponse>> SendPasswordResetAsync(
        Guid tenantId,
        Guid memberUserId,
        Guid actorUserId,
        string? actorEmail,
        CancellationToken cancellationToken = default)
    {
        var member = await ResolveMemberAsync(tenantId, memberUserId, cancellationToken);
        if (member is null || string.IsNullOrWhiteSpace(member.Email))
        {
            return PlatformTenantResult<PlatformRecoveryActionResponse>.Fail(
                PlatformTenantError.NotFound,
                "Member not found on this tenant.");
        }

        await authService.ForgotPasswordAsync(new ForgotPasswordRequest(member.Email), cancellationToken);

        var now = DateTimeOffset.UtcNow;
        dbContext.PlatformAuditLogs.Add(new PlatformAuditLog
        {
            Id = Guid.CreateVersion7(),
            ActorUserId = actorUserId,
            ActorEmail = actorEmail,
            TenantId = tenantId,
            Action = PlatformAuditAction.PasswordResetSent,
            DetailsJson = JsonSerializer.Serialize(new { memberEmail = member.Email }),
            CreatedAt = now,
        });
        await dbContext.SaveChangesAsync(cancellationToken);

        return PlatformTenantResult<PlatformRecoveryActionResponse>.Ok(
            new PlatformRecoveryActionResponse("If an account exists, a reset code was sent."));
    }

    public async Task<PlatformTenantResult<PlatformRecoveryActionResponse>> ResendEmailVerificationAsync(
        Guid tenantId,
        Guid memberUserId,
        Guid actorUserId,
        string? actorEmail,
        CancellationToken cancellationToken = default)
    {
        var member = await ResolveMemberAsync(tenantId, memberUserId, cancellationToken);
        if (member is null || string.IsNullOrWhiteSpace(member.Email))
        {
            return PlatformTenantResult<PlatformRecoveryActionResponse>.Fail(
                PlatformTenantError.NotFound,
                "Member not found on this tenant.");
        }

        if (member.EmailConfirmed)
        {
            return PlatformTenantResult<PlatformRecoveryActionResponse>.Fail(
                PlatformTenantError.Conflict,
                "This email is already verified.");
        }

        var (response, error) = await authService.ResendOtpAsync(
            new ResendOtpRequest(member.Email, "email_verification"),
            cancellationToken);

        if (error is not null)
        {
            return PlatformTenantResult<PlatformRecoveryActionResponse>.Fail(
                PlatformTenantError.Conflict,
                error);
        }

        var now = DateTimeOffset.UtcNow;
        dbContext.PlatformAuditLogs.Add(new PlatformAuditLog
        {
            Id = Guid.CreateVersion7(),
            ActorUserId = actorUserId,
            ActorEmail = actorEmail,
            TenantId = tenantId,
            Action = PlatformAuditAction.EmailVerificationResent,
            DetailsJson = JsonSerializer.Serialize(new { memberEmail = member.Email }),
            CreatedAt = now,
        });
        await dbContext.SaveChangesAsync(cancellationToken);

        return PlatformTenantResult<PlatformRecoveryActionResponse>.Ok(
            new PlatformRecoveryActionResponse(response?.Message ?? "A new verification code was sent."));
    }

    public async Task<PlatformOmniSearchResponse> SearchAsync(
        string? query,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return new PlatformOmniSearchResponse([], []);
        }

        var term = query.Trim();
        if (term.Length > MaxSearchLength)
        {
            term = term[..MaxSearchLength];
        }

        var lowered = term.ToLowerInvariant();

        var tenantQuery = dbContext.Tenants.AsNoTracking()
            .Where(tenant =>
                tenant.Slug.ToLower().Contains(lowered)
                || tenant.Name.ToLower().Contains(lowered)
                || (tenant.AdminContactEmail != null && tenant.AdminContactEmail.ToLower().Contains(lowered)));

        var membershipTenantIds = dbContext.TenantMemberships.AsNoTracking()
            .Join(
                dbContext.Users.AsNoTracking(),
                membership => membership.UserId,
                user => user.Id,
                (membership, user) => new { membership.TenantId, user.Email })
            .Where(row => row.Email != null && row.Email.ToLower().Contains(lowered))
            .Select(row => row.TenantId);

        tenantQuery = tenantQuery.Union(
            dbContext.Tenants.AsNoTracking().Where(tenant => membershipTenantIds.Contains(tenant.Id)));

        var tenants = await tenantQuery
            .OrderBy(tenant => tenant.Slug)
            .Take(MaxOmniResults)
            .Select(tenant => new PlatformOmniSearchTenantResult(
                tenant.Id,
                tenant.Slug,
                tenant.Name,
                tenant.Status.ToString(),
                tenant.Plan.ToString()))
            .ToListAsync(cancellationToken);

        var issues = await dbContext.IgnoreTenantFilters<SupportIssue>()
            .AsNoTracking()
            .Where(issue =>
                issue.IssueNumber.ToLower().Contains(lowered)
                || issue.TenantSlug.ToLower().Contains(lowered)
                || issue.OperatorEmail.ToLower().Contains(lowered)
                || issue.Subject.ToLower().Contains(lowered))
            .OrderByDescending(issue => issue.CreatedAt)
            .Take(MaxOmniResults)
            .Select(issue => new PlatformOmniSearchIssueResult(
                issue.Id,
                issue.IssueNumber,
                issue.TenantSlug,
                issue.Subject,
                issue.Status.ToString()))
            .ToListAsync(cancellationToken);

        return new PlatformOmniSearchResponse(tenants, issues);
    }

    private async Task<ApplicationUser?> ResolveMemberAsync(
        Guid tenantId,
        Guid memberUserId,
        CancellationToken cancellationToken)
    {
        var hasMembership = await dbContext.TenantMemberships.AsNoTracking()
            .AnyAsync(
                membership => membership.TenantId == tenantId && membership.UserId == memberUserId,
                cancellationToken);
        if (!hasMembership)
        {
            return null;
        }

        return await userManager.FindByIdAsync(memberUserId.ToString());
    }

    private async Task<IReadOnlyList<PlatformTenantSnapshotMemberResponse>> LoadSnapshotMembersAsync(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        return await (
            from membership in dbContext.TenantMemberships.AsNoTracking()
            join user in dbContext.Users.AsNoTracking() on membership.UserId equals user.Id
            where membership.TenantId == tenantId
            orderby user.Email
            select new PlatformTenantSnapshotMemberResponse(
                user.Email ?? string.Empty,
                membership.Role.ToString()))
            .ToListAsync(cancellationToken);
    }
}
