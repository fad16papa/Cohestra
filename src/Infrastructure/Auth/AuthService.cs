using System.Security.Cryptography;
using System.Text.RegularExpressions;
using Cohestra.Application.Auth;
using Cohestra.Application.Email;
using Cohestra.Application.Tenants;
using Cohestra.Contracts.Auth;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Email;
using Cohestra.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Auth;

public sealed class AuthService(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    RoleManager<IdentityRole<Guid>> roleManager,
    IJwtTokenService jwtTokenService,
    IRefreshTokenStore refreshTokenStore,
    IAuthOtpStore otpStore,
    IAuthOtpVerifyRateLimiter otpVerifyRateLimiter,
    IEmailSender emailSender,
    IHostEnvironment hostEnvironment,
    ILogger<AuthService> logger,
    IOptions<JwtSettings> jwtOptions,
    IOptions<AuthOtpSettings> otpOptions,
    IOptions<SendGridSettings> sendGridOptions,
    ITenantMembershipService tenantMembershipService,
    ITenantHostResolver tenantHostResolver,
    ITenantAccessService tenantAccessService,
    IAuthHandoffStore authHandoffStore) : IAuthService
{
    private const string BootstrapClosedMessage =
        "This workspace already has a tenant admin. Sign in instead.";

    private const string EmailAlreadyRegisteredMessage =
        "An account with this email already exists. Sign in instead.";

    private const string OrphanMembershipMessage =
        "Your account is not linked to a tenant. Contact support or your platform administrator.";

    private const string HostMembershipMessage =
        "Your account is not a member of this workspace. Sign in from your tenant host.";

    private const string MultipleWorkspacesMessage =
        "Your account belongs to multiple workspaces. Sign in using your workspace address (for example, your-org.localhost).";

    private static readonly Regex NicknamePattern = new(
        @"^[A-Za-z0-9][A-Za-z0-9\s\-_.]{1,30}[A-Za-z0-9]$",
        RegexOptions.Compiled);

    public async Task<OnboardingStatusResponse> GetOnboardingStatusAsync(
        CancellationToken cancellationToken = default)
    {
        if (await tenantMembershipService.DefaultTenantHasTenantAdminAsync(cancellationToken))
        {
            return new OnboardingStatusResponse(false, BootstrapClosedMessage);
        }

        return new OnboardingStatusResponse(
            true,
            "Create your operator account to get started.");
    }

    public async Task<AuthLoginResult> LoginAsync(
        string email,
        string password,
        string? host,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            return InvalidCredentials();
        }

        var user = await userManager.FindByEmailAsync(email.Trim());
        if (user is null)
        {
            return InvalidCredentials();
        }

        if (!user.EmailConfirmed)
        {
            var verifyTenantSlug = await tenantMembershipService.GetPendingVerificationTenantSlugAsync(
                user.Id,
                cancellationToken);

            return new AuthLoginResult(
                null,
                "email_not_verified",
                "Verify your email before signing in. Check your inbox for the verification code.",
                verifyTenantSlug);
        }

        var signInResult = await signInManager.CheckPasswordSignInAsync(user, password, lockoutOnFailure: true);
        if (signInResult.IsLockedOut)
        {
            return new AuthLoginResult(
                null,
                "locked_out",
                "Too many failed attempts. Try again in a few minutes.");
        }

        if (!signInResult.Succeeded)
        {
            return InvalidCredentials();
        }

        var session = await ResolveSessionBindingAsync(user, host, preferredTenantId: null, cancellationToken);
        if (session.ErrorCode is not null)
        {
            if (ShouldMaskAsInvalidCredentials(session.ErrorCode))
            {
                return InvalidCredentials();
            }

            return new AuthLoginResult(null, session.ErrorCode, session.ErrorMessage);
        }

        var tokens = await IssueTokensAsync(
            user,
            session.TenantId,
            session.MembershipRole,
            cancellationToken);

        if (session.TenantId is Guid tenantId)
        {
            await tenantAccessService.TouchActivityAsync(tenantId, cancellationToken);
        }

        if (session.RequiresTenantHandoff
            && session.TenantId is Guid handoffTenantId
            && !string.IsNullOrWhiteSpace(session.TenantSlug))
        {
            var (handoffCode, handoffExpiresInSeconds) = await authHandoffStore.CreateAsync(
                new AuthHandoffPayload(
                    handoffTenantId,
                    session.TenantSlug,
                    tokens.AccessToken,
                    tokens.RefreshToken,
                    tokens.ExpiresInSeconds),
                cancellationToken);

            return new AuthLoginResult(
                null,
                null,
                null,
                TenantSlug: session.TenantSlug,
                HandoffCode: handoffCode,
                HandoffExpiresInSeconds: handoffExpiresInSeconds);
        }

        return new AuthLoginResult(tokens, null, null);
    }

    public async Task<AuthLoginResult> RefreshAsync(
        string refreshToken,
        string? host,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return InvalidRefreshToken();
        }

        var session = await refreshTokenStore.GetSessionAsync(refreshToken, cancellationToken);
        if (session is null)
        {
            return InvalidRefreshToken();
        }

        var user = await userManager.FindByIdAsync(session.UserId.ToString());
        if (user is null || !user.EmailConfirmed)
        {
            await refreshTokenStore.RevokeAsync(refreshToken, cancellationToken);
            return InvalidRefreshToken();
        }

        var binding = await ResolveSessionBindingAsync(
            user,
            host,
            preferredTenantId: session.TenantId,
            cancellationToken);
        if (binding.ErrorCode is not null)
        {
            await refreshTokenStore.RevokeAsync(refreshToken, cancellationToken);
            if (ShouldMaskAsInvalidCredentials(binding.ErrorCode))
            {
                return InvalidRefreshToken();
            }

            return new AuthLoginResult(null, binding.ErrorCode, binding.ErrorMessage);
        }

        // Host (when resolvable) must match stored tenant_id.
        if (session.TenantId is not null
            && binding.TenantId is not null
            && session.TenantId != binding.TenantId)
        {
            await refreshTokenStore.RevokeAsync(refreshToken, cancellationToken);
            return InvalidRefreshToken();
        }

        // Stored tenant sessions must keep a live membership — never revive tenant_id via ??.
        if (session.TenantId is not null && binding.TenantId is null)
        {
            await refreshTokenStore.RevokeAsync(refreshToken, cancellationToken);
            return InvalidRefreshToken();
        }

        var consumed = await refreshTokenStore.ConsumeAsync(refreshToken, cancellationToken);
        if (consumed is null || consumed.UserId != session.UserId)
        {
            return InvalidRefreshToken();
        }

        var tokens = await IssueTokensAsync(
            user,
            binding.TenantId,
            binding.MembershipRole,
            cancellationToken);
        return new AuthLoginResult(tokens, null, null);
    }

    public async Task<(RegisterOperatorResponse? Response, string? Error)> RegisterAsync(
        RegisterOperatorRequest request,
        CancellationToken cancellationToken = default)
    {
        var email = request.Email?.Trim() ?? string.Empty;
        var nickname = request.Nickname?.Trim() ?? string.Empty;
        var password = request.Password ?? string.Empty;

        if (!IsValidEmail(email))
        {
            return (null, "Enter a valid email address.");
        }

        if (!IsValidNickname(nickname))
        {
            return (null, "Nickname must be 3–32 characters (letters, numbers, spaces, - _ .).");
        }

        var bootstrapClosed =
            await tenantMembershipService.DefaultTenantHasTenantAdminAsync(cancellationToken);

        var existing = await userManager.FindByEmailAsync(email);
        if (existing is not null)
        {
            if (existing.EmailConfirmed)
            {
                return (null, bootstrapClosed ? BootstrapClosedMessage : EmailAlreadyRegisteredMessage);
            }

            // Bootstrap closed = confirmed TenantAdmin exists — no public register/resume.
            if (bootstrapClosed)
            {
                return (null, BootstrapClosedMessage);
            }

            existing.Nickname = nickname;
            var updateResult = await userManager.UpdateAsync(existing);
            if (!updateResult.Succeeded)
            {
                return (null, "Could not update pending registration.");
            }

            if (!string.IsNullOrEmpty(existing.PasswordHash))
            {
                var removePassword = await userManager.RemovePasswordAsync(existing);
                if (!removePassword.Succeeded)
                {
                    return (null, "Could not update pending registration.");
                }
            }

            var passwordResult = await userManager.AddPasswordAsync(existing, password);
            if (!passwordResult.Succeeded)
            {
                return (null, FormatIdentityErrors(passwordResult));
            }

            var ensureRole = await EnsureTenantAdminIdentityRoleAsync(existing, deleteOnFailure: false, cancellationToken);
            if (ensureRole is not null)
            {
                return (null, ensureRole);
            }

            var ensurePending = await EnsureDefaultTenantAdminMembershipAsync(existing.Id, cancellationToken);
            if (ensurePending is not null)
            {
                return (null, ensurePending);
            }

            var sendError = await SendOtpAsync(existing.Email!, existing.Nickname, OtpPurpose.EmailVerification, cancellationToken);
            if (sendError is not null)
            {
                return (null, sendError);
            }

            return (BuildRegisterResponse(email), null);
        }

        if (bootstrapClosed)
        {
            return (null, BootstrapClosedMessage);
        }

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            Nickname = nickname,
            EmailConfirmed = false,
        };

        var createResult = await userManager.CreateAsync(user, password);
        if (!createResult.Succeeded)
        {
            return (null, FormatIdentityErrors(createResult));
        }

        var assignRole = await EnsureTenantAdminIdentityRoleAsync(user, deleteOnFailure: true, cancellationToken);
        if (assignRole is not null)
        {
            return (null, assignRole);
        }

        var ensureMembership = await EnsureDefaultTenantAdminMembershipAsync(user.Id, cancellationToken);
        if (ensureMembership is not null)
        {
            if (await tenantMembershipService.CountMembershipsForUserAsync(user.Id, cancellationToken) == 0)
            {
                await userManager.DeleteAsync(user);
            }

            return (null, ensureMembership);
        }

        var sendErrorOnCreate = await SendOtpAsync(user.Email!, user.Nickname, OtpPurpose.EmailVerification, cancellationToken);
        if (sendErrorOnCreate is not null)
        {
            return (null, sendErrorOnCreate);
        }

        return (BuildRegisterResponse(email), null);
    }

    public async Task<(AuthTokenResponse? Tokens, string? Error, string? ErrorCode)> VerifyEmailAsync(
        VerifyEmailOtpRequest request,
        string? host,
        string? clientIp,
        CancellationToken cancellationToken = default)
    {
        var email = request.Email?.Trim() ?? string.Empty;
        var code = request.Code?.Trim() ?? string.Empty;

        if (IsValidEmail(email)
            && !await otpVerifyRateLimiter.AllowVerifyAsync(email, clientIp, cancellationToken))
        {
            return (null, "Too many verification attempts. Try again later.", AuthErrorCodes.OtpVerifyRateLimited);
        }

        if (!IsValidEmail(email) || code.Length != otpOptions.Value.CodeLength)
        {
            return (null, "Invalid verification code.", null);
        }

        var user = await userManager.FindByEmailAsync(email);
        if (user is null)
        {
            return (null, "Invalid verification code.", null);
        }

        if (user.EmailConfirmed)
        {
            var session = await ResolveSessionBindingAsync(user, host, preferredTenantId: null, cancellationToken);
            if (session.ErrorCode is not null)
            {
                return (null, session.ErrorMessage, null);
            }

            await otpVerifyRateLimiter.ClearFailuresAsync(email, clientIp, cancellationToken);
            return (await IssueTokensAsync(user, session.TenantId, session.MembershipRole, cancellationToken), null, null);
        }

        // Another confirmed TenantAdmin already closed bootstrap — do not confirm a second admin.
        if (await tenantMembershipService.DefaultTenantHasTenantAdminAsync(cancellationToken))
        {
            return (null, BootstrapClosedMessage, null);
        }

        var ensureMembership = await EnsureDefaultTenantAdminMembershipAsync(user.Id, cancellationToken);
        if (ensureMembership is not null)
        {
            return (null, ensureMembership, null);
        }

        if (!await otpStore.ValidateAndConsumeAsync(email, OtpPurpose.EmailVerification, code, cancellationToken))
        {
            await otpVerifyRateLimiter.RecordFailedVerifyAsync(email, clientIp, cancellationToken);
            return (null, "Invalid or expired verification code.", null);
        }

        user.EmailConfirmed = true;
        var updateResult = await userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            return (null, "Could not verify email.", null);
        }

        await otpVerifyRateLimiter.ClearFailuresAsync(email, clientIp, cancellationToken);
        await refreshTokenStore.RevokeAllForUserAsync(user.Id, cancellationToken);

        var binding = await ResolveSessionBindingAsync(user, host, preferredTenantId: TenantIds.Default, cancellationToken);
        if (binding.ErrorCode is not null)
        {
            return (null, binding.ErrorMessage, null);
        }

        return (await IssueTokensAsync(user, binding.TenantId, binding.MembershipRole, cancellationToken), null, null);
    }

    public async Task<(MessageResponse? Response, string? Error)> ResendOtpAsync(
        ResendOtpRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!TryParsePurpose(request.Purpose, out var purpose))
        {
            return (null, "Purpose must be email_verification or password_reset.");
        }

        var email = request.Email?.Trim() ?? string.Empty;
        if (!IsValidEmail(email))
        {
            return (null, "Enter a valid email address.");
        }

        var user = await userManager.FindByEmailAsync(email);
        if (user is null)
        {
            return (new MessageResponse("If an account exists, a new code was sent."), null);
        }

        if (purpose == OtpPurpose.EmailVerification && user.EmailConfirmed)
        {
            return (null, "This email is already verified. Sign in instead.");
        }

        var sendError = await SendOtpAsync(
            email,
            purpose == OtpPurpose.EmailVerification ? user.Nickname : null,
            purpose,
            cancellationToken);

        if (sendError is not null)
        {
            return (null, sendError);
        }

        return (new MessageResponse("A new verification code was sent to your email."), null);
    }

    public async Task<MessageResponse> ForgotPasswordAsync(
        ForgotPasswordRequest request,
        CancellationToken cancellationToken = default)
    {
        var email = request.Email?.Trim() ?? string.Empty;
        if (!IsValidEmail(email))
        {
            return new MessageResponse("If an account exists, a reset code was sent.");
        }

        var user = await userManager.FindByEmailAsync(email);
        if (user is null || !user.EmailConfirmed)
        {
            return new MessageResponse("If an account exists, a reset code was sent.");
        }

        var sendError = await SendOtpAsync(email, null, OtpPurpose.PasswordReset, cancellationToken);
        if (sendError is not null)
        {
            logger.LogWarning("Password reset OTP could not be sent for {Email}: {Error}", email, sendError);
        }

        return new MessageResponse("If an account exists, a reset code was sent.");
    }

    public async Task<(MessageResponse? Response, string? Error, string? ErrorCode)> ResetPasswordAsync(
        ResetPasswordRequest request,
        string? clientIp,
        CancellationToken cancellationToken = default)
    {
        var email = request.Email?.Trim() ?? string.Empty;
        var code = request.Code?.Trim() ?? string.Empty;
        var newPassword = request.NewPassword ?? string.Empty;

        if (IsValidEmail(email)
            && !await otpVerifyRateLimiter.AllowVerifyAsync(email, clientIp, cancellationToken))
        {
            return (null, "Too many verification attempts. Try again later.", AuthErrorCodes.OtpVerifyRateLimited);
        }

        if (!IsValidEmail(email) || code.Length != otpOptions.Value.CodeLength)
        {
            return (null, "Invalid or expired reset code.", null);
        }

        var user = await userManager.FindByEmailAsync(email);
        if (user is null || !user.EmailConfirmed)
        {
            return (null, "Invalid or expired reset code.", null);
        }

        if (!await otpStore.ValidateAndConsumeAsync(email, OtpPurpose.PasswordReset, code, cancellationToken))
        {
            await otpVerifyRateLimiter.RecordFailedVerifyAsync(email, clientIp, cancellationToken);
            return (null, "Invalid or expired reset code.", null);
        }

        await otpVerifyRateLimiter.ClearFailuresAsync(email, clientIp, cancellationToken);

        var resetToken = await userManager.GeneratePasswordResetTokenAsync(user);
        var resetResult = await userManager.ResetPasswordAsync(user, resetToken, newPassword);
        if (!resetResult.Succeeded)
        {
            return (null, FormatIdentityErrors(resetResult), null);
        }

        await refreshTokenStore.RevokeAllForUserAsync(user.Id, cancellationToken);

        return (new MessageResponse("Password updated. You can sign in with your new password."), null, null);
    }

    public async Task<(MessageResponse? Response, string? Error)> ChangePasswordAsync(
        Guid userId,
        ChangePasswordRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            return (null, "Could not update password.");
        }

        var changeResult = await userManager.ChangePasswordAsync(
            user,
            request.CurrentPassword,
            request.NewPassword);

        if (!changeResult.Succeeded)
        {
            return (null, FormatIdentityErrors(changeResult));
        }

        await refreshTokenStore.RevokeAllForUserAsync(userId, cancellationToken);

        return (new MessageResponse("Password updated successfully."), null);
    }

    /// <summary>
    /// PlatformAdmin-only users may authenticate without membership/tenant_id.
    /// Tenant-scoped users must have membership on the Host-resolved tenant (or preferredTenantId on refresh).
    /// </summary>
    private async Task<SessionBinding> ResolveSessionBindingAsync(
        ApplicationUser user,
        string? host,
        Guid? preferredTenantId,
        CancellationToken cancellationToken)
    {
        var isPlatformAdmin = await userManager.IsInRoleAsync(user, PlatformAdminSeeder.PlatformAdminRole);
        var isTenantAdmin = await userManager.IsInRoleAsync(user, OperatorSeeder.TenantAdminRole);

        if (isPlatformAdmin && !isTenantAdmin)
        {
            return SessionBinding.PlatformOnly();
        }

        Guid tenantId;
        var requiresTenantHandoff = false;
        string? resolvedTenantSlug = null;

        if (preferredTenantId is not null)
        {
            tenantId = preferredTenantId.Value;

            if (!string.IsNullOrWhiteSpace(host))
            {
                var hostResolution = await tenantHostResolver.ResolveAsync(host, cancellationToken);
                if (!hostResolution.IsMarketingHost
                    && hostResolution.Succeeded
                    && hostResolution.TenantId is not null
                    && hostResolution.TenantId.Value != tenantId)
                {
                    return SessionBinding.Fail("tenant_mismatch", "Refresh token tenant does not match this Host.");
                }

                resolvedTenantSlug = hostResolution.Slug;
            }
        }
        else
        {
            var hostResolution = await tenantHostResolver.ResolveAsync(host, cancellationToken);
            if (hostResolution.Succeeded && hostResolution.TenantId is not null)
            {
                tenantId = hostResolution.TenantId.Value;
                resolvedTenantSlug = hostResolution.Slug;
            }
            else
            {
                var memberships = await tenantMembershipService.GetActiveMembershipsForUserAsync(
                    user.Id,
                    cancellationToken);

                if (memberships.Count == 0)
                {
                    return SessionBinding.Fail(
                        "tenant_unresolved",
                        hostResolution.ErrorDetail ?? "Could not resolve tenant from Host.");
                }

                if (memberships.Count > 1)
                {
                    return SessionBinding.Fail("multiple_workspaces", MultipleWorkspacesMessage);
                }

                tenantId = memberships[0].TenantId;
                resolvedTenantSlug = memberships[0].TenantSlug;
                requiresTenantHandoff = hostResolution.IsMarketingHost || !hostResolution.Succeeded;
            }
        }

        var membership = await tenantMembershipService.GetMembershipAsync(user.Id, tenantId, cancellationToken);
        if (membership is null)
        {
            if (isPlatformAdmin)
            {
                return SessionBinding.PlatformOnly();
            }

            var anyMemberships = await tenantMembershipService.CountMembershipsForUserAsync(user.Id, cancellationToken);
            if (isTenantAdmin && anyMemberships == 0)
            {
                return SessionBinding.Fail("no_tenant_membership", OrphanMembershipMessage);
            }

            return SessionBinding.Fail("no_tenant_membership", HostMembershipMessage);
        }

        return SessionBinding.ForTenant(
            membership.TenantId,
            membership.Role,
            resolvedTenantSlug,
            requiresTenantHandoff);
    }

    private async Task<string?> EnsureTenantAdminIdentityRoleAsync(
        ApplicationUser user,
        bool deleteOnFailure,
        CancellationToken cancellationToken)
    {
        await OperatorSeeder.EnsureTenantAdminRoleAsync(roleManager, logger, cancellationToken);

        if (await userManager.IsInRoleAsync(user, OperatorSeeder.TenantAdminRole))
        {
            return null;
        }

        if (!await RoleExclusivity.CanAssignTenantAdminAsync(userManager, user, logger))
        {
            if (deleteOnFailure)
            {
                await userManager.DeleteAsync(user);
            }

            return "This account cannot be registered as a tenant operator.";
        }

        var addRole = await userManager.AddToRoleAsync(user, OperatorSeeder.TenantAdminRole);
        if (addRole.Succeeded)
        {
            return null;
        }

        if (deleteOnFailure)
        {
            await userManager.DeleteAsync(user);
        }

        return "Could not assign TenantAdmin role.";
    }

    private async Task<string?> EnsureDefaultTenantAdminMembershipAsync(
        Guid userId,
        CancellationToken cancellationToken)
    {
        var result = await tenantMembershipService.EnsureMembershipAsync(
            userId,
            TenantIds.Default,
            TenantMembershipRole.TenantAdmin,
            cancellationToken);

        if (result.Succeeded)
        {
            return null;
        }

        return result.Detail ?? "Could not link operator to the default tenant.";
    }

    private RegisterOperatorResponse BuildRegisterResponse(string email)
    {
        var expirySeconds = otpOptions.Value.ExpiryMinutes * 60;
        return new RegisterOperatorResponse(
            email,
            expirySeconds,
            "Check your email for a verification code to finish setup.");
    }

    private async Task<string?> SendOtpAsync(
        string email,
        string? nickname,
        OtpPurpose purpose,
        CancellationToken cancellationToken)
    {
        var settings = otpOptions.Value;
        var allowed = await otpStore.TryRecordSendAttemptAsync(
            email,
            purpose,
            settings.MaxSendAttemptsPerWindow,
            TimeSpan.FromMinutes(settings.SendWindowMinutes),
            cancellationToken);

        if (!allowed)
        {
            return "Too many code requests. Wait a few minutes and try again.";
        }

        var code = GenerateNumericCode(settings.CodeLength);
        var ttl = TimeSpan.FromMinutes(settings.ExpiryMinutes);
        await otpStore.TryStoreAsync(email, purpose, code, ttl, cancellationToken);

        var emailContent = purpose == OtpPurpose.EmailVerification
            ? AuthOtpEmailBuilder.BuildEmailVerification(nickname ?? string.Empty, code, settings.ExpiryMinutes)
            : AuthOtpEmailBuilder.BuildPasswordReset(code, settings.ExpiryMinutes);

        var fromEmail = sendGridOptions.Value.RegistrationFromEmail
            ?? sendGridOptions.Value.FromEmail;
        var fromName = sendGridOptions.Value.RegistrationFromName
            ?? sendGridOptions.Value.FromName;

        if (string.IsNullOrWhiteSpace(fromEmail))
        {
            if (hostEnvironment.IsDevelopment())
            {
                logger.LogWarning(
                    "DEV ONLY — OTP for {Email} ({Purpose}): {Code}",
                    email,
                    purpose,
                    code);
                return null;
            }

            return "Email delivery is not configured.";
        }

        try
        {
            var sendResult = await emailSender.SendAsync(
                new EmailMessage(
                    email,
                    nickname,
                    emailContent.Subject,
                    emailContent.PlainTextBody,
                    emailContent.HtmlBody,
                    fromEmail,
                    fromName),
                cancellationToken);

            if (!sendResult.Success)
            {
                logger.LogWarning(
                    "Failed to send OTP email to {Email} ({Purpose}): {Reason}",
                    email,
                    purpose,
                    sendResult.FailureReason);
                return sendResult.FailureReason
                    ?? "Could not send verification email. Try again shortly.";
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send OTP email to {Email}", email);
            return "Could not send verification email. Try again shortly.";
        }

        if (hostEnvironment.IsDevelopment())
        {
            logger.LogInformation(
                "DEV ONLY — OTP for {Email} ({Purpose}): {Code}",
                email,
                purpose,
                code);
        }

        return null;
    }

    private async Task<AuthTokenResponse> IssueTokensAsync(
        ApplicationUser user,
        Guid? tenantId,
        TenantMembershipRole? membershipRole,
        CancellationToken cancellationToken)
    {
        var roles = await userManager.GetRolesAsync(user);
        var (accessToken, expiresInSeconds) = jwtTokenService.CreateAccessToken(
            user,
            roles,
            tenantId,
            membershipRole);
        var refreshToken = GenerateRefreshToken();
        var refreshTtl = TimeSpan.FromHours(jwtOptions.Value.RefreshTokenHours);

        await refreshTokenStore.StoreAsync(refreshToken, user.Id, tenantId, refreshTtl, cancellationToken);

        return new AuthTokenResponse(accessToken, refreshToken, expiresInSeconds);
    }

    private static string GenerateRefreshToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

    private static string GenerateNumericCode(int length)
    {
        var max = (int)Math.Pow(10, length);
        var min = max / 10;
        return RandomNumberGenerator.GetInt32(min, max).ToString();
    }

    private static AuthLoginResult InvalidCredentials() =>
        new(null, "invalid_credentials", "Invalid email or password.");

    private static bool ShouldMaskAsInvalidCredentials(string errorCode) =>
        string.Equals(errorCode, "no_tenant_membership", StringComparison.Ordinal)
        || string.Equals(errorCode, "tenant_mismatch", StringComparison.Ordinal);

    private static AuthLoginResult InvalidRefreshToken() =>
        new(null, "invalid_refresh_token", "Invalid or expired refresh token.");

    private static bool IsValidEmail(string email) =>
        !string.IsNullOrWhiteSpace(email) && email.Contains('@', StringComparison.Ordinal);

    private static bool IsValidNickname(string nickname) =>
        nickname.Length >= 3 && NicknamePattern.IsMatch(nickname);

    private static bool TryParsePurpose(string? value, out OtpPurpose purpose)
    {
        if (string.Equals(value, "email_verification", StringComparison.OrdinalIgnoreCase))
        {
            purpose = OtpPurpose.EmailVerification;
            return true;
        }

        if (string.Equals(value, "password_reset", StringComparison.OrdinalIgnoreCase))
        {
            purpose = OtpPurpose.PasswordReset;
            return true;
        }

        purpose = default;
        return false;
    }

    private static string FormatIdentityErrors(IdentityResult result) =>
        result.Errors.FirstOrDefault()?.Description ?? "Request could not be completed.";

    private sealed record SessionBinding(
        Guid? TenantId,
        TenantMembershipRole? MembershipRole,
        string? TenantSlug,
        bool RequiresTenantHandoff,
        string? ErrorCode,
        string? ErrorMessage)
    {
        public static SessionBinding PlatformOnly() => new(null, null, null, false, null, null);

        public static SessionBinding ForTenant(
            Guid tenantId,
            TenantMembershipRole role,
            string? tenantSlug = null,
            bool requiresTenantHandoff = false) =>
            new(tenantId, role, tenantSlug, requiresTenantHandoff, null, null);

        public static SessionBinding Fail(string errorCode, string message) =>
            new(null, null, null, false, errorCode, message);
    }
}
