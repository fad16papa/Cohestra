using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Cohestra.Application.Auth;
using Cohestra.Application.Email;
using Cohestra.Application.Team;
using Cohestra.Application.Tenants;
using Cohestra.Infrastructure.Auth;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Email;
using Cohestra.Infrastructure.Identity;
using Cohestra.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Team;

public sealed class TeamInviteService(
    CohestraDbContext dbContext,
    UserManager<ApplicationUser> userManager,
    ITenantMembershipService membershipService,
    IEmailSender emailSender,
    IOptions<SendGridSettings> sendGridOptions,
    ILogger<TeamInviteService> logger,
    IAuthOtpStore otpStore,
    IOptions<AuthOtpSettings> otpOptions) : ITeamInviteService
{
    private static readonly TimeSpan InviteTtl = TimeSpan.FromDays(7);

    private static readonly Regex NicknamePattern = new(
        @"^[A-Za-z0-9][A-Za-z0-9\s\-_.]{1,30}[A-Za-z0-9]$",
        RegexOptions.Compiled);

    public async Task<TeamOverviewDto> GetOverviewAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken)
            ?? throw new InvalidOperationException("Tenant not found.");

        var limits = TenantPlanLimits.For(tenant.Plan);
        var now = DateTimeOffset.UtcNow;

        var members = await (
            from membership in dbContext.TenantMemberships.AsNoTracking()
            join user in dbContext.Users.AsNoTracking() on membership.UserId equals user.Id
            where membership.TenantId == tenantId
            orderby membership.CreatedAt
            select new TeamMemberDto(
                membership.UserId,
                user.Email ?? string.Empty,
                user.Nickname,
                membership.Role.ToString(),
                membership.CreatedAt))
            .ToListAsync(cancellationToken);

        var invites = await dbContext.TenantInvites
            .AsNoTracking()
            .Where(i => i.TenantId == tenantId && i.RevokedAt == null && i.AcceptedAt == null && i.ExpiresAt > now)
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => new TeamPendingInviteDto(
                i.Id,
                i.Email,
                i.Role.ToString(),
                i.ExpiresAt,
                i.CreatedAt))
            .ToListAsync(cancellationToken);

        var seatsUsed = members.Count + invites.Count;
        var invitesAllowed = tenant.Plan is not TenantPlan.Basic;
        var seatCapReached = seatsUsed >= limits.Seats;

        return new TeamOverviewDto(
            tenant.Plan.ToString(),
            limits.Seats,
            members.Count,
            invites.Count,
            seatsUsed,
            invitesAllowed,
            seatCapReached,
            members,
            invites);
    }

    public async Task<TeamInviteResult> CreateInviteAsync(
        Guid tenantId,
        Guid invitedByUserId,
        string email,
        TenantMembershipRole role,
        string acceptBaseUrl,
        CancellationToken cancellationToken = default)
    {
        email = email.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
        {
            return TeamInviteResult.Fail(TeamInviteError.Validation, "A valid email is required.");
        }

        if (role is not (TenantMembershipRole.TenantAdmin or TenantMembershipRole.TenantMember))
        {
            return TeamInviteResult.Fail(TeamInviteError.Validation, "Role must be TenantAdmin or TenantMember.");
        }

        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);

        if (tenant is null)
        {
            return TeamInviteResult.Fail(TeamInviteError.NotFound, "Tenant not found.");
        }

        if (tenant.Plan is TenantPlan.Basic)
        {
            return TeamInviteResult.Fail(
                TeamInviteError.PlanLocked,
                "Basic plan is solo-only. Upgrade to Core for a second keyholder.");
        }

        var overview = await GetOverviewAsync(tenantId, cancellationToken);
        if (overview.SeatCapReached)
        {
            return TeamInviteResult.Fail(
                TeamInviteError.SeatCapReached,
                "Seat cap reached. Revoke a pending invite or upgrade your plan.");
        }

        var existingUser = await userManager.FindByEmailAsync(email);
        if (existingUser is not null)
        {
            var existingMembership = await membershipService.GetMembershipAsync(existingUser.Id, tenantId, cancellationToken);
            if (existingMembership is not null)
            {
                return TeamInviteResult.Fail(TeamInviteError.Conflict, "This person is already on the team.");
            }
        }

        var now = DateTimeOffset.UtcNow;
        var duplicatePending = await dbContext.TenantInvites.AnyAsync(
            i => i.TenantId == tenantId
                && i.Email == email
                && i.RevokedAt == null
                && i.AcceptedAt == null
                && i.ExpiresAt > now,
            cancellationToken);

        if (duplicatePending)
        {
            return TeamInviteResult.Fail(TeamInviteError.Conflict, "An invite is already pending for this email.");
        }

        var rawToken = GenerateToken();
        var invite = new TenantInvite
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Email = email,
            Role = role,
            TokenHash = HashToken(rawToken),
            InvitedByUserId = invitedByUserId,
            ExpiresAt = now.Add(InviteTtl),
            CreatedAt = now,
        };

        dbContext.TenantInvites.Add(invite);
        await dbContext.SaveChangesAsync(cancellationToken);

        var acceptUrl = BuildAcceptUrl(acceptBaseUrl, rawToken);
        await SendInviteEmailAsync(tenant.Name, email, acceptUrl, cancellationToken);

        return TeamInviteResult.Ok();
    }

    public async Task<(TeamInviteResult Result, BootstrapFirstAdminDto? Value)> BootstrapFirstAdminAsync(
        Guid tenantId,
        Guid invitedByUserId,
        string email,
        string acceptBaseUrl,
        CancellationToken cancellationToken = default)
    {
        email = email.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
        {
            return (TeamInviteResult.Fail(TeamInviteError.Validation, "A valid email is required."), null);
        }

        if (invitedByUserId == Guid.Empty)
        {
            return (TeamInviteResult.Fail(TeamInviteError.Validation, "Platform admin actor is required."), null);
        }

        var relational = dbContext.Database.IsRelational();
        await using var transaction = relational
            ? await dbContext.Database.BeginTransactionAsync(cancellationToken)
            : null;

        if (relational)
        {
            var key = AdvisoryKey(tenantId);
            await dbContext.Database.ExecuteSqlInterpolatedAsync(
                $"SELECT pg_advisory_xact_lock({key})",
                cancellationToken);
        }

        var tenant = await dbContext.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);

        if (tenant is null)
        {
            return (TeamInviteResult.Fail(TeamInviteError.NotFound, "Tenant not found."), null);
        }

        if (!tenant.IsComplimentary)
        {
            return (TeamInviteResult.Fail(
                TeamInviteError.Conflict,
                "Only complimentary workspaces can receive a first-admin bootstrap."), null);
        }

        if (tenant.Status != TenantStatus.Active)
        {
            return (TeamInviteResult.Fail(
                TeamInviteError.Conflict,
                "Suspended or archived workspaces cannot be bootstrapped."), null);
        }

        var memberCount = await dbContext.IgnoreTenantFilters<TenantMembership>()
            .CountAsync(m => m.TenantId == tenantId, cancellationToken);
        if (memberCount > 0)
        {
            return (TeamInviteResult.Fail(
                TeamInviteError.Conflict,
                "This workspace already has a member. Bootstrap is one-time."), null);
        }

        var limits = TenantPlanLimits.For(tenant.Plan);
        if (ActiveMembersFillSeatCap(memberCount, limits.Seats))
        {
            return (TeamInviteResult.Fail(
                TeamInviteError.SeatCapReached,
                "Seat cap reached."), null);
        }

        var now = DateTimeOffset.UtcNow;
        var pending = await dbContext.IgnoreTenantFilters<TenantInvite>().AnyAsync(
            i => i.TenantId == tenantId
                && i.RevokedAt == null
                && i.AcceptedAt == null
                && i.ExpiresAt > now,
            cancellationToken);
        if (pending)
        {
            return (TeamInviteResult.Fail(
                TeamInviteError.Conflict,
                "A first-admin invite is already pending."), null);
        }

        var existingUser = await userManager.FindByEmailAsync(email);
        if (existingUser is not null
            && await userManager.IsInRoleAsync(existingUser, global::Cohestra.Infrastructure.Auth.PlatformAdminSeeder.PlatformAdminRole))
        {
            return (TeamInviteResult.Fail(
                TeamInviteError.Conflict,
                "Platform administrators cannot become workspace admins."), null);
        }

        var rawToken = GenerateToken();
        var invite = new TenantInvite
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Email = email,
            Role = TenantMembershipRole.TenantAdmin,
            TokenHash = HashToken(rawToken),
            InvitedByUserId = invitedByUserId,
            ExpiresAt = now.Add(InviteTtl),
            CreatedAt = now,
            RequiresActivationOtp = true,
        };

        dbContext.TenantInvites.Add(invite);
        dbContext.PlatformAuditLogs.Add(new PlatformAuditLog
        {
            Id = Guid.CreateVersion7(),
            ActorUserId = invitedByUserId,
            TenantId = tenantId,
            Action = PlatformAuditAction.FirstAdminBootstrapped,
            Reason = null,
            DetailsJson = JsonSerializer.Serialize(new
            {
                invite.Email,
                Role = TenantMembershipRole.TenantAdmin.ToString(),
                tenant.Plan,
                tenant.IsComplimentary,
            }),
            CreatedAt = now,
        });
        await dbContext.SaveChangesAsync(cancellationToken);

        var acceptUrl = BuildAcceptUrl(acceptBaseUrl, rawToken);
        var sent = await SendInviteEmailAsync(tenant.Name, email, acceptUrl, cancellationToken);
        if (!sent)
        {
            if (transaction is not null)
            {
                await transaction.RollbackAsync(cancellationToken);
            }
            else
            {
                invite.RevokedAt = DateTimeOffset.UtcNow;
                await dbContext.SaveChangesAsync(cancellationToken);
            }

            return (TeamInviteResult.Fail(
                TeamInviteError.Validation,
                "Invitation email could not be sent. No invite was kept."), null);
        }

        if (transaction is not null)
        {
            await transaction.CommitAsync(cancellationToken);
        }

        return (
            TeamInviteResult.Ok(),
            new BootstrapFirstAdminDto(invite.Id, invite.Email, invite.ExpiresAt));
    }

    internal static bool ActiveMembersFillSeatCap(int activeMembers, int seatLimit) =>
        activeMembers >= seatLimit;

    private static long AdvisoryKey(Guid tenantId)
    {
        var bytes = tenantId.ToByteArray();
        return BitConverter.ToInt64(bytes, 0);
    }

    public async Task<TeamInviteResult> RevokeInviteAsync(
        Guid tenantId,
        Guid inviteId,
        CancellationToken cancellationToken = default)
    {
        var invite = await dbContext.TenantInvites
            .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == inviteId, cancellationToken);

        if (invite is null)
        {
            return TeamInviteResult.Fail(TeamInviteError.NotFound, "Invite not found.");
        }

        if (invite.AcceptedAt is not null)
        {
            return TeamInviteResult.Fail(TeamInviteError.Conflict, "Invite was already accepted.");
        }

        if (invite.RevokedAt is not null)
        {
            return TeamInviteResult.Ok();
        }

        invite.RevokedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
        return TeamInviteResult.Ok();
    }

    public async Task<TeamInviteResult> RemoveMemberAsync(
        Guid tenantId,
        Guid actorUserId,
        Guid memberUserId,
        CancellationToken cancellationToken = default)
    {
        if (actorUserId == memberUserId)
        {
            return TeamInviteResult.Fail(
                TeamInviteError.Validation,
                "You cannot remove yourself from the team.");
        }

        var membership = await dbContext.TenantMemberships
            .FirstOrDefaultAsync(
                m => m.TenantId == tenantId && m.UserId == memberUserId,
                cancellationToken);

        if (membership is null)
        {
            return TeamInviteResult.Fail(TeamInviteError.NotFound, "Team member not found.");
        }

        if (membership.Role == TenantMembershipRole.TenantAdmin)
        {
            var otherAdmins = await dbContext.TenantMemberships.CountAsync(
                m => m.TenantId == tenantId
                    && m.Role == TenantMembershipRole.TenantAdmin
                    && m.UserId != memberUserId,
                cancellationToken);

            if (otherAdmins == 0)
            {
                return TeamInviteResult.Fail(
                    TeamInviteError.Conflict,
                    "Cannot remove the last workspace admin.");
            }
        }

        dbContext.TenantMemberships.Remove(membership);
        await dbContext.SaveChangesAsync(cancellationToken);
        return TeamInviteResult.Ok();
    }

    public async Task<InvitePreviewDto?> GetInvitePreviewAsync(
        string token,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return null;
        }

        var hash = HashToken(token.Trim());
        var invite = await dbContext.IgnoreTenantFilters<TenantInvite>()
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.TokenHash == hash, cancellationToken);

        if (invite is null || !invite.IsPending(DateTimeOffset.UtcNow))
        {
            return null;
        }

        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == invite.TenantId, cancellationToken);

        if (tenant is null)
        {
            return null;
        }

        return new InvitePreviewDto(
            tenant.Name,
            tenant.Slug,
            invite.Email,
            invite.Role.ToString(),
            invite.ExpiresAt,
            invite.RequiresActivationOtp);
    }

    public async Task<(TeamInviteResult Result, AcceptInviteResultDto? Value)> AcceptInviteAsync(
        AcceptInviteCommand command,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(command.Token))
        {
            return (TeamInviteResult.Fail(TeamInviteError.Validation, "Invite token is required."), null);
        }

        if (string.IsNullOrWhiteSpace(command.Password) || command.Password.Length < 8)
        {
            return (TeamInviteResult.Fail(TeamInviteError.Validation, "Password must be at least 8 characters."), null);
        }

        var hash = HashToken(command.Token.Trim());
        var invite = await dbContext.IgnoreTenantFilters<TenantInvite>()
            .FirstOrDefaultAsync(i => i.TokenHash == hash, cancellationToken);

        if (invite is null)
        {
            return (TeamInviteResult.Fail(TeamInviteError.NotFound, "Invite not found."), null);
        }

        if (invite.RevokedAt is not null)
        {
            return (TeamInviteResult.Fail(TeamInviteError.Revoked, "This invite was revoked."), null);
        }

        if (invite.AcceptedAt is not null)
        {
            return (TeamInviteResult.Fail(TeamInviteError.Conflict, "This invite was already accepted."), null);
        }

        if (invite.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            return (TeamInviteResult.Fail(TeamInviteError.Expired, "This invite has expired."), null);
        }

        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == invite.TenantId, cancellationToken);

        if (tenant is null)
        {
            return (TeamInviteResult.Fail(TeamInviteError.NotFound, "Workspace not found."), null);
        }

        if (tenant.Status != TenantStatus.Active)
        {
            return (TeamInviteResult.Fail(
                TeamInviteError.Conflict,
                "This workspace is not accepting members."), null);
        }

        if (invite.Role is not (TenantMembershipRole.TenantAdmin or TenantMembershipRole.TenantMember))
        {
            return (TeamInviteResult.Fail(
                TeamInviteError.Validation,
                "Invite role cannot grant platform access."), null);
        }

        var memberCount = await dbContext.IgnoreTenantFilters<TenantMembership>()
            .CountAsync(m => m.TenantId == invite.TenantId, cancellationToken);
        if (ActiveMembersFillSeatCap(memberCount, TenantPlanLimits.For(tenant.Plan).Seats))
        {
            return (TeamInviteResult.Fail(TeamInviteError.SeatCapReached, "Seat cap reached for this workspace."), null);
        }

        if (invite.RequiresActivationOtp)
        {
            return (TeamInviteResult.Fail(
                TeamInviteError.ActivationOtpRequired,
                "This invitation needs the email code before the account can be activated."), null);
        }

        return await ActivateInviteAsync(invite, tenant, command.Password, command.Nickname, cancellationToken);
    }

    public async Task<(TeamInviteResult Result, StartInviteActivationDto? Value)> StartInviteActivationAsync(
        StartInviteActivationCommand command,
        CancellationToken cancellationToken = default)
    {
        var loaded = await LoadActionableInviteAsync(command.Token, cancellationToken);
        if (loaded.Failure is not null)
        {
            return (loaded.Failure, null);
        }

        var invite = loaded.Invite!;
        if (!invite.RequiresActivationOtp)
        {
            return (TeamInviteResult.Fail(
                TeamInviteError.Validation,
                "This invitation is accepted without an email code."), null);
        }

        if (!string.IsNullOrWhiteSpace(command.Nickname) && !NicknamePattern.IsMatch(command.Nickname.Trim()))
        {
            return (TeamInviteResult.Fail(
                TeamInviteError.Validation,
                "Display name must be 3–32 characters using letters, numbers, spaces, or -_. "), null);
        }

        var settings = otpOptions.Value;
        var scope = ActivationScope(invite);
        var sendAllowed = await otpStore.TryRecordSendAttemptAsync(
            invite.Email,
            OtpPurpose.InviteActivation,
            settings.MaxSendAttemptsPerWindow,
            TimeSpan.FromMinutes(settings.SendWindowMinutes),
            cancellationToken,
            scope);
        if (!sendAllowed)
        {
            return (TeamInviteResult.Fail(
                TeamInviteError.RateLimited,
                "Too many code requests. Wait a few minutes and try again."), null);
        }

        var code = GenerateNumericCode(settings.CodeLength);
        var ttl = TimeSpan.FromMinutes(settings.ExpiryMinutes);
        await otpStore.TryStoreAsync(
            invite.Email,
            OtpPurpose.InviteActivation,
            code,
            ttl,
            cancellationToken,
            scope);

        var sent = await SendActivationCodeAsync(invite.Email, code, settings.ExpiryMinutes, invite.Id, cancellationToken);
        if (!sent)
        {
            await otpStore.RemoveAsync(invite.Email, OtpPurpose.InviteActivation, cancellationToken, scope);
            return (TeamInviteResult.Fail(
                TeamInviteError.Validation,
                "The email code could not be sent. No account was created."), null);
        }

        return (
            TeamInviteResult.Ok(),
            new StartInviteActivationDto(true, MaskEmail(invite.Email), settings.ExpiryMinutes * 60));
    }

    public async Task<(TeamInviteResult Result, AcceptInviteResultDto? Value)> CompleteInviteActivationAsync(
        CompleteInviteActivationCommand command,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(command.Password) || command.Password.Length < 8)
        {
            return (TeamInviteResult.Fail(TeamInviteError.Validation, "Password must be at least 8 characters."), null);
        }

        var settings = otpOptions.Value;
        var code = command.Code?.Trim() ?? string.Empty;
        if (code.Length != settings.CodeLength || code.Any(ch => !char.IsDigit(ch)))
        {
            return (TeamInviteResult.Fail(TeamInviteError.Validation, "Enter the email code."), null);
        }

        var loaded = await LoadActionableInviteAsync(command.Token, cancellationToken);
        if (loaded.Failure is not null)
        {
            return (loaded.Failure, null);
        }

        var invite = loaded.Invite!;
        var tenant = loaded.Tenant!;
        if (!invite.RequiresActivationOtp)
        {
            return (TeamInviteResult.Fail(
                TeamInviteError.Validation,
                "This invitation is accepted without an email code."), null);
        }

        var scope = ActivationScope(invite);
        var consumed = await otpStore.ValidateAndConsumeAsync(
            invite.Email,
            OtpPurpose.InviteActivation,
            code,
            cancellationToken,
            scope);
        if (!consumed)
        {
            var stillAllowed = await otpStore.TryRecordFailedVerificationAsync(
                invite.Email,
                OtpPurpose.InviteActivation,
                settings.MaxFailedVerificationAttempts,
                cancellationToken,
                scope);
            return stillAllowed
                ? (TeamInviteResult.Fail(TeamInviteError.Validation, "That code is invalid or expired."), null)
                : (TeamInviteResult.Fail(
                    TeamInviteError.RateLimited,
                    "Too many incorrect codes. Request a new code."), null);
        }

        return await ActivateInviteAsync(invite, tenant, command.Password, command.Nickname, cancellationToken);
    }

    private async Task<(TeamInviteResult? Failure, TenantInvite? Invite, Tenant? Tenant)> LoadActionableInviteAsync(
        string token,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return (TeamInviteResult.Fail(TeamInviteError.Validation, "Invite token is required."), null, null);
        }

        var hash = HashToken(token.Trim());
        var invite = await dbContext.IgnoreTenantFilters<TenantInvite>()
            .FirstOrDefaultAsync(i => i.TokenHash == hash, cancellationToken);
        if (invite is null)
        {
            return (TeamInviteResult.Fail(TeamInviteError.NotFound, "Invite not found."), null, null);
        }

        if (invite.RevokedAt is not null)
        {
            return (TeamInviteResult.Fail(TeamInviteError.Revoked, "This invite was revoked."), null, null);
        }

        if (invite.AcceptedAt is not null)
        {
            return (TeamInviteResult.Fail(TeamInviteError.Conflict, "This invite was already accepted."), null, null);
        }

        if (invite.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            return (TeamInviteResult.Fail(TeamInviteError.Expired, "This invite has expired."), null, null);
        }

        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == invite.TenantId, cancellationToken);
        if (tenant is null)
        {
            return (TeamInviteResult.Fail(TeamInviteError.NotFound, "Workspace not found."), null, null);
        }

        if (tenant.Status != TenantStatus.Active)
        {
            return (TeamInviteResult.Fail(
                TeamInviteError.Conflict,
                "This workspace is not accepting members."), null, null);
        }

        if (invite.Role is not (TenantMembershipRole.TenantAdmin or TenantMembershipRole.TenantMember))
        {
            return (TeamInviteResult.Fail(
                TeamInviteError.Validation,
                "Invite role cannot grant platform access."), null, null);
        }

        var memberCount = await dbContext.IgnoreTenantFilters<TenantMembership>()
            .CountAsync(m => m.TenantId == invite.TenantId, cancellationToken);
        if (ActiveMembersFillSeatCap(memberCount, TenantPlanLimits.For(tenant.Plan).Seats))
        {
            return (TeamInviteResult.Fail(TeamInviteError.SeatCapReached, "Seat cap reached for this workspace."), null, null);
        }

        return (null, invite, tenant);
    }

    private async Task<(TeamInviteResult Result, AcceptInviteResultDto? Value)> ActivateInviteAsync(
        TenantInvite invite,
        Tenant tenant,
        string password,
        string? nickname,
        CancellationToken cancellationToken)
    {
        var user = await userManager.FindByEmailAsync(invite.Email);
        if (user is not null
            && await userManager.IsInRoleAsync(user, global::Cohestra.Infrastructure.Auth.PlatformAdminSeeder.PlatformAdminRole))
        {
            return (TeamInviteResult.Fail(
                TeamInviteError.Conflict,
                "Platform administrators cannot join a workspace."), null);
        }
        var createdAccount = false;

        if (user is null)
        {
            var displayName = string.IsNullOrWhiteSpace(nickname)
                ? invite.Email.Split('@')[0]
                : nickname.Trim();

            if (!NicknamePattern.IsMatch(displayName))
            {
                return (TeamInviteResult.Fail(
                    TeamInviteError.Validation,
                    "Display name must be 3–32 characters using letters, numbers, spaces, or -_. "), null);
            }

            user = new ApplicationUser
            {
                Id = Guid.NewGuid(),
                Email = invite.Email,
                UserName = invite.Email,
                Nickname = displayName,
                EmailConfirmed = true,
            };

            var createResult = await userManager.CreateAsync(user, password);
            if (!createResult.Succeeded)
            {
                var detail = string.Join(" ", createResult.Errors.Select(e => e.Description));
                return (TeamInviteResult.Fail(TeamInviteError.Validation, detail), null);
            }

            createdAccount = true;
        }
        else
        {
            if (!user.EmailConfirmed)
            {
                return (TeamInviteResult.Fail(
                    TeamInviteError.Validation,
                    "Verify your email before accepting this invite."), null);
            }

            var passwordValid = await userManager.CheckPasswordAsync(user, password);
            if (!passwordValid)
            {
                return (TeamInviteResult.Fail(
                    TeamInviteError.Validation,
                    "Incorrect password for this email. Sign in with your existing account password."), null);
            }
        }

        var membershipResult = await membershipService.CreateMembershipAsync(
            user.Id,
            invite.TenantId,
            invite.Role,
            cancellationToken);

        if (!membershipResult.Succeeded)
        {
            if (membershipResult.Error == TenantMembershipError.Conflict)
            {
                return (TeamInviteResult.Fail(TeamInviteError.Conflict, "You are already on this team."), null);
            }

            return (TeamInviteResult.Fail(TeamInviteError.Validation, membershipResult.Detail ?? "Could not join team."), null);
        }

        invite.AcceptedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        return (TeamInviteResult.Ok(), new AcceptInviteResultDto(invite.Email, tenant.Slug, createdAccount));
    }

    internal static string MaskEmail(string email)
    {
        var at = email.IndexOf('@');
        if (at <= 0 || at == email.Length - 1)
        {
            return "***";
        }

        var local = email[..at];
        var visible = local.Length == 1 ? "*" : local[..1] + "***";
        return visible + "@" + email[(at + 1)..];
    }

    private static string ActivationScope(TenantInvite invite) =>
        $"{invite.Id:D}|{invite.TenantId:D}|{invite.Email.Trim().ToLowerInvariant()}";

    private static string GenerateNumericCode(int length)
    {
        var digits = length < 6 ? 6 : length;
        var max = (int)Math.Pow(10, digits);
        var min = max / 10;
        return RandomNumberGenerator.GetInt32(min, max).ToString();
    }

    private async Task<bool> SendActivationCodeAsync(
        string email,
        string code,
        int expiryMinutes,
        Guid inviteId,
        CancellationToken cancellationToken)
    {
        var settings = sendGridOptions.Value;
        var fromEmail = string.IsNullOrWhiteSpace(settings.FromEmail) ? "noreply@cohestra.app" : settings.FromEmail;
        var fromName = string.IsNullOrWhiteSpace(settings.FromName) ? "Cohestra" : settings.FromName;
        var content = AuthOtpEmailBuilder.BuildInviteActivation(code, expiryMinutes);
        var message = new EmailMessage(
            email,
            null,
            content.Subject,
            content.PlainTextBody,
            content.HtmlBody,
            fromEmail,
            fromName,
            content.InlineAttachments);

        try
        {
            var result = await emailSender.SendAsync(message, cancellationToken);
            return result.Success;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to send invitation activation code for invite {InviteId}", inviteId);
            return false;
        }
    }

    internal static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes);
    }

    internal static string GenerateToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    private static string BuildAcceptUrl(string acceptBaseUrl, string rawToken)
    {
        var separator = acceptBaseUrl.Contains('?', StringComparison.Ordinal) ? '&' : '?';
        return $"{acceptBaseUrl.TrimEnd('/')}{separator}token={Uri.EscapeDataString(rawToken)}";
    }

    private async Task<bool> SendInviteEmailAsync(
        string tenantName,
        string email,
        string acceptUrl,
        CancellationToken cancellationToken)
    {
        var settings = sendGridOptions.Value;
        var fromEmail = string.IsNullOrWhiteSpace(settings.FromEmail) ? "noreply@cohestra.app" : settings.FromEmail;
        var fromName = string.IsNullOrWhiteSpace(settings.FromName) ? "Cohestra" : settings.FromName;

        var message = new EmailMessage(
            email,
            null,
            $"You're invited to {tenantName} on Cohestra",
            $"You have been invited to join {tenantName} on Cohestra.\n\nAccept invite: {acceptUrl}\n\nLink expires in 7 days.",
            $"""
            <p>You have been invited to join <strong>{tenantName}</strong> on Cohestra.</p>
            <p><a href="{acceptUrl}">Accept invite</a> — link expires in 7 days.</p>
            <p>If you did not expect this invite, you can ignore this email.</p>
            """,
            fromEmail,
            fromName);

        try
        {
            var result = await emailSender.SendAsync(message, cancellationToken);
            return result.Success;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to send team invite email to {Email}", email);
            return false;
        }
    }
}
