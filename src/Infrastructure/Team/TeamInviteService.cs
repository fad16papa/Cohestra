using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Cohestra.Application.Email;
using Cohestra.Application.Team;
using Cohestra.Application.Tenants;
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
    ILogger<TeamInviteService> logger) : ITeamInviteService
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
            invite.ExpiresAt);
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

        var overview = await GetOverviewAsync(invite.TenantId, cancellationToken);
        if (overview.SeatCapReached)
        {
            return (TeamInviteResult.Fail(TeamInviteError.SeatCapReached, "Seat cap reached for this workspace."), null);
        }

        var user = await userManager.FindByEmailAsync(invite.Email);
        var createdAccount = false;

        if (user is null)
        {
            var nickname = string.IsNullOrWhiteSpace(command.Nickname)
                ? invite.Email.Split('@')[0]
                : command.Nickname.Trim();

            if (!NicknamePattern.IsMatch(nickname))
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
                Nickname = nickname,
                EmailConfirmed = true,
            };

            var createResult = await userManager.CreateAsync(user, command.Password);
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

            var passwordValid = await userManager.CheckPasswordAsync(user, command.Password);
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

    private async Task SendInviteEmailAsync(
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
            await emailSender.SendAsync(message, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to send team invite email to {Email}", email);
        }
    }
}
