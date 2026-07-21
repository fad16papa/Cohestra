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
    IEmailSender emailSender,
    IHostEnvironment hostEnvironment,
    ILogger<AuthService> logger,
    IOptions<JwtSettings> jwtOptions,
    IOptions<AuthOtpSettings> otpOptions,
    IOptions<SendGridSettings> sendGridOptions,
    ITenantMembershipService tenantMembershipService) : IAuthService
{
    private const string BootstrapClosedMessage =
        "This workspace already has a tenant admin. Sign in instead.";

    private const string OrphanMembershipMessage =
        "Your account is not linked to a tenant. Contact support or your platform administrator.";

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
            return new AuthLoginResult(
                null,
                "email_not_verified",
                "Verify your email before signing in. Check your inbox for the verification code.");
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

        var orphanError = await GetOrphanTenantAdminErrorAsync(user, cancellationToken);
        if (orphanError is not null)
        {
            return new AuthLoginResult(null, "no_tenant_membership", orphanError);
        }

        var tokens = await IssueTokensAsync(user, cancellationToken);
        return new AuthLoginResult(tokens, null, null);
    }

    public async Task<AuthTokenResponse?> RefreshAsync(
        string refreshToken,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return null;
        }

        var userId = await refreshTokenStore.GetUserIdAsync(refreshToken, cancellationToken);
        if (userId is null)
        {
            return null;
        }

        var user = await userManager.FindByIdAsync(userId.Value.ToString());
        if (user is null || !user.EmailConfirmed)
        {
            await refreshTokenStore.RevokeAsync(refreshToken, cancellationToken);
            return null;
        }

        var consumedUserId = await refreshTokenStore.ConsumeAsync(refreshToken, cancellationToken);
        if (consumedUserId is null || consumedUserId != userId)
        {
            return null;
        }

        if (await GetOrphanTenantAdminErrorAsync(user, cancellationToken) is not null)
        {
            await refreshTokenStore.RevokeAsync(refreshToken, cancellationToken);
            return null;
        }

        return await IssueTokensAsync(user, cancellationToken);
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
                return (null, BootstrapClosedMessage);
            }

            // Resume pending verification for this email only (even if bootstrap already closed —
            // membership may already exist from the first submit).
            if (bootstrapClosed
                && !await userManager.IsInRoleAsync(existing, OperatorSeeder.TenantAdminRole))
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

        await OperatorSeeder.EnsureTenantAdminRoleAsync(roleManager, logger, cancellationToken);

        if (!await RoleExclusivity.CanAssignTenantAdminAsync(userManager, user, logger))
        {
            await userManager.DeleteAsync(user);
            return (null, "This account cannot be registered as a tenant operator.");
        }

        var addRole = await userManager.AddToRoleAsync(user, OperatorSeeder.TenantAdminRole);
        if (!addRole.Succeeded)
        {
            await userManager.DeleteAsync(user);
            return (null, "Could not assign TenantAdmin role.");
        }

        var ensureMembership = await EnsureDefaultTenantAdminMembershipAsync(user.Id, cancellationToken);
        if (ensureMembership is not null)
        {
            await userManager.DeleteAsync(user);
            return (null, ensureMembership);
        }

        var sendErrorOnCreate = await SendOtpAsync(user.Email!, user.Nickname, OtpPurpose.EmailVerification, cancellationToken);
        if (sendErrorOnCreate is not null)
        {
            return (null, sendErrorOnCreate);
        }

        return (BuildRegisterResponse(email), null);
    }

    public async Task<(AuthTokenResponse? Tokens, string? Error)> VerifyEmailAsync(
        VerifyEmailOtpRequest request,
        CancellationToken cancellationToken = default)
    {
        var email = request.Email?.Trim() ?? string.Empty;
        var code = request.Code?.Trim() ?? string.Empty;

        if (!IsValidEmail(email) || code.Length != otpOptions.Value.CodeLength)
        {
            return (null, "Invalid verification code.");
        }

        var user = await userManager.FindByEmailAsync(email);
        if (user is null)
        {
            return (null, "Invalid verification code.");
        }

        if (user.EmailConfirmed)
        {
            var orphan = await GetOrphanTenantAdminErrorAsync(user, cancellationToken);
            if (orphan is not null)
            {
                return (null, orphan);
            }

            return (await IssueTokensAsync(user, cancellationToken), null);
        }

        if (!await otpStore.ValidateAndConsumeAsync(email, OtpPurpose.EmailVerification, code, cancellationToken))
        {
            return (null, "Invalid or expired verification code.");
        }

        user.EmailConfirmed = true;
        var updateResult = await userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            return (null, "Could not verify email.");
        }

        var ensureMembership = await EnsureDefaultTenantAdminMembershipAsync(user.Id, cancellationToken);
        if (ensureMembership is not null)
        {
            return (null, ensureMembership);
        }

        var orphanAfter = await GetOrphanTenantAdminErrorAsync(user, cancellationToken);
        if (orphanAfter is not null)
        {
            return (null, orphanAfter);
        }

        return (await IssueTokensAsync(user, cancellationToken), null);
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

    public async Task<(MessageResponse? Response, string? Error)> ResetPasswordAsync(
        ResetPasswordRequest request,
        CancellationToken cancellationToken = default)
    {
        var email = request.Email?.Trim() ?? string.Empty;
        var code = request.Code?.Trim() ?? string.Empty;
        var newPassword = request.NewPassword ?? string.Empty;

        if (!IsValidEmail(email) || code.Length != otpOptions.Value.CodeLength)
        {
            return (null, "Invalid or expired reset code.");
        }

        var user = await userManager.FindByEmailAsync(email);
        if (user is null || !user.EmailConfirmed)
        {
            return (null, "Invalid or expired reset code.");
        }

        if (!await otpStore.ValidateAndConsumeAsync(email, OtpPurpose.PasswordReset, code, cancellationToken))
        {
            return (null, "Invalid or expired reset code.");
        }

        var resetToken = await userManager.GeneratePasswordResetTokenAsync(user);
        var resetResult = await userManager.ResetPasswordAsync(user, resetToken, newPassword);
        if (!resetResult.Succeeded)
        {
            return (null, FormatIdentityErrors(resetResult));
        }

        return (new MessageResponse("Password updated. You can sign in with your new password."), null);
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

        return (new MessageResponse("Password updated successfully."), null);
    }

    /// <summary>
    /// TenantAdmin Identity users must have at least one TenantMembership before tokens are issued.
    /// PlatformAdmin-only users are exempt (no tenant membership required).
    /// </summary>
    private async Task<string?> GetOrphanTenantAdminErrorAsync(
        ApplicationUser user,
        CancellationToken cancellationToken)
    {
        if (!await userManager.IsInRoleAsync(user, OperatorSeeder.TenantAdminRole))
        {
            return null;
        }

        var count = await tenantMembershipService.CountMembershipsForUserAsync(user.Id, cancellationToken);
        return count == 0 ? OrphanMembershipMessage : null;
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
        CancellationToken cancellationToken)
    {
        var roles = await userManager.GetRolesAsync(user);
        var (accessToken, expiresInSeconds) = jwtTokenService.CreateAccessToken(user, roles);
        var refreshToken = GenerateRefreshToken();
        var refreshTtl = TimeSpan.FromHours(jwtOptions.Value.RefreshTokenHours);

        await refreshTokenStore.StoreAsync(refreshToken, user.Id, refreshTtl, cancellationToken);

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
}
