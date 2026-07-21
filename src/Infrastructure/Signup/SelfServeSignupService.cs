using System.Net.Mail;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using Cohestra.Application.Auth;
using Cohestra.Application.Compliance;
using Cohestra.Application.Email;
using Cohestra.Application.Signup;
using Cohestra.Application.Tenants;
using Cohestra.Contracts.Legal;
using Cohestra.Contracts.Signup;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Email;
using Cohestra.Infrastructure.Identity;
using Cohestra.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;

namespace Cohestra.Infrastructure.Signup;

public sealed class SelfServeSignupService(
    CohestraDbContext dbContext,
    ILegalComplianceService legalCompliance,
    ICaptchaVerifier captchaVerifier,
    UserManager<ApplicationUser> userManager,
    RoleManager<IdentityRole<Guid>> roleManager,
    ITenantMembershipService tenantMembershipService,
    IAuthOtpStore otpStore,
    IEmailSender emailSender,
    IJwtTokenService jwtTokenService,
    IRefreshTokenStore refreshTokenStore,
    IHostEnvironment hostEnvironment,
    ILogger<SelfServeSignupService> logger,
    IOptions<SelfServeSignupSettings> signupOptions,
    IOptions<AuthOtpSettings> otpOptions,
    IOptions<JwtSettings> jwtOptions,
    IOptions<SendGridSettings> sendGridOptions) : ISelfServeSignupService
{
    private const int MaxOrgNameLength = 200;
    private const int MaxEmailLength = 320;

    private static readonly Regex NicknameSanitizer = new(@"[^A-Za-z0-9\s\-_.]", RegexOptions.Compiled);

    public async Task<SelfServeSignupResult<SlugAvailabilityResponse>> CheckSlugAsync(
        string? slug,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return SelfServeSignupResult<SlugAvailabilityResponse>.Fail(
                SelfServeSignupError.Validation,
                "Slug is required.");
        }

        var normalized = TenantSlugRules.Normalize(slug);
        var validationError = TenantSlugRules.ValidateForProvision(normalized);
        if (validationError is not null)
        {
            var suggestions = await TenantSlugAvailability.BuildSuggestionsAsync(
                dbContext,
                normalized,
                maxSuggestions: 3,
                cancellationToken);

            return SelfServeSignupResult<SlugAvailabilityResponse>.Ok(new SlugAvailabilityResponse(
                Available: false,
                Slug: normalized,
                ValidationError: validationError,
                Suggestions: suggestions));
        }

        var taken = await dbContext.Tenants.AsNoTracking()
            .AnyAsync(t => t.Slug == normalized, cancellationToken);

        if (taken)
        {
            var suggestions = await TenantSlugAvailability.BuildSuggestionsAsync(
                dbContext,
                normalized,
                maxSuggestions: 3,
                cancellationToken);

            return SelfServeSignupResult<SlugAvailabilityResponse>.Ok(new SlugAvailabilityResponse(
                Available: false,
                Slug: normalized,
                ValidationError: $"Slug '{normalized}' is already in use.",
                Suggestions: suggestions));
        }

        return SelfServeSignupResult<SlugAvailabilityResponse>.Ok(new SlugAvailabilityResponse(
            Available: true,
            Slug: normalized,
            ValidationError: null,
            Suggestions: []));
    }

    public async Task<SelfServeSignupResult<PublicSignupResponse>> SignupAsync(
        PublicSignupRequest request,
        string? clientIp,
        CancellationToken cancellationToken = default)
    {
        if (signupOptions.Value.RegistrationClosed)
        {
            return SelfServeSignupResult<PublicSignupResponse>.Fail(
                SelfServeSignupError.RegistrationClosed,
                "Self-serve signup is currently closed. Contact us for a workspace.");
        }

        var legalError = legalCompliance.ValidateAcceptance(new LegalAcceptanceInput(
            request.AcceptTermsAndPrivacy,
            request.TermsVersion,
            request.PrivacyVersion));
        if (legalError is not null)
        {
            return SelfServeSignupResult<PublicSignupResponse>.Fail(
                SelfServeSignupError.Validation,
                legalError);
        }

        var captcha = await captchaVerifier.VerifyAsync(request.CaptchaToken, clientIp, cancellationToken);
        if (!captcha.Valid)
        {
            return SelfServeSignupResult<PublicSignupResponse>.Fail(
                SelfServeSignupError.Captcha,
                captcha.Error ?? "CAPTCHA verification failed.");
        }

        var orgName = request.OrgName?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(orgName))
        {
            return SelfServeSignupResult<PublicSignupResponse>.Fail(
                SelfServeSignupError.Validation,
                "Organization name is required.");
        }

        if (orgName.Length > MaxOrgNameLength)
        {
            return SelfServeSignupResult<PublicSignupResponse>.Fail(
                SelfServeSignupError.Validation,
                $"Organization name must be at most {MaxOrgNameLength} characters.");
        }

        var email = request.Email?.Trim() ?? string.Empty;
        if (!IsValidEmail(email))
        {
            return SelfServeSignupResult<PublicSignupResponse>.Fail(
                SelfServeSignupError.Validation,
                "Enter a valid admin email address.");
        }

        if (email.Length > MaxEmailLength)
        {
            return SelfServeSignupResult<PublicSignupResponse>.Fail(
                SelfServeSignupError.Validation,
                "Email must be at most 320 characters.");
        }

        var password = request.Password ?? string.Empty;
        if (string.IsNullOrWhiteSpace(password))
        {
            return SelfServeSignupResult<PublicSignupResponse>.Fail(
                SelfServeSignupError.Validation,
                "Password is required.");
        }

        var slugCheck = await CheckSlugAsync(request.Slug, cancellationToken);
        if (!slugCheck.Succeeded || slugCheck.Value is null)
        {
            return SelfServeSignupResult<PublicSignupResponse>.Fail(
                slugCheck.Error ?? SelfServeSignupError.Validation,
                slugCheck.Detail ?? "Invalid slug.",
                slugCheck.Suggestions);
        }

        if (!slugCheck.Value.Available)
        {
            return SelfServeSignupResult<PublicSignupResponse>.Fail(
                SelfServeSignupError.Conflict,
                slugCheck.Value.ValidationError ?? "Slug is unavailable.",
                slugCheck.Value.Suggestions);
        }

        var normalizedSlug = slugCheck.Value.Slug;

        var existingUser = await userManager.FindByEmailAsync(email);
        if (existingUser is not null && existingUser.EmailConfirmed)
        {
            return SelfServeSignupResult<PublicSignupResponse>.Fail(
                SelfServeSignupError.Conflict,
                "An account with this email already exists. Sign in instead.");
        }

        var nickname = BuildNickname(orgName, email);
        var passwordValidation = await ValidatePasswordAsync(password);
        if (passwordValidation is not null)
        {
            return SelfServeSignupResult<PublicSignupResponse>.Fail(
                SelfServeSignupError.Validation,
                passwordValidation);
        }

        var now = DateTimeOffset.UtcNow;
        var tenant = new Tenant
        {
            Id = Guid.CreateVersion7(),
            Slug = normalizedSlug,
            Name = orgName,
            AdminContactEmail = email,
            Plan = TenantPlan.Basic,
            Status = TenantStatus.Active,
            BillingStatus = BillingStatus.Free,
            CreatedAt = now,
            UpdatedAt = now,
        };

        legalCompliance.ApplyToTenant(tenant, new LegalAcceptanceInput(
            request.AcceptTermsAndPrivacy,
            request.TermsVersion,
            request.PrivacyVersion));

        ApplicationUser user;
        if (existingUser is not null)
        {
            user = existingUser;
            user.Nickname = nickname;
            var updateResult = await userManager.UpdateAsync(user);
            if (!updateResult.Succeeded)
            {
                return SelfServeSignupResult<PublicSignupResponse>.Fail(
                    SelfServeSignupError.Validation,
                    "Could not update pending account.");
            }

            if (!string.IsNullOrEmpty(user.PasswordHash))
            {
                var removePassword = await userManager.RemovePasswordAsync(user);
                if (!removePassword.Succeeded)
                {
                    return SelfServeSignupResult<PublicSignupResponse>.Fail(
                        SelfServeSignupError.Validation,
                        "Could not update pending account.");
                }
            }

            var passwordResult = await userManager.AddPasswordAsync(user, password);
            if (!passwordResult.Succeeded)
            {
                return SelfServeSignupResult<PublicSignupResponse>.Fail(
                    SelfServeSignupError.Validation,
                    FormatIdentityErrors(passwordResult));
            }
        }
        else
        {
            user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                Nickname = nickname,
                EmailConfirmed = false,
            };

            var createResult = await userManager.CreateAsync(user, password);
            if (!createResult.Succeeded)
            {
                return SelfServeSignupResult<PublicSignupResponse>.Fail(
                    SelfServeSignupError.Validation,
                    FormatIdentityErrors(createResult));
            }
        }

        var roleError = await EnsureTenantAdminIdentityRoleAsync(user, deleteOnFailure: existingUser is null, cancellationToken);
        if (roleError is not null)
        {
            return SelfServeSignupResult<PublicSignupResponse>.Fail(
                SelfServeSignupError.Validation,
                roleError);
        }

        dbContext.Tenants.Add(tenant);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            var suggestions = await TenantSlugAvailability.BuildSuggestionsAsync(
                dbContext,
                normalizedSlug,
                maxSuggestions: 3,
                cancellationToken);

            return SelfServeSignupResult<PublicSignupResponse>.Fail(
                SelfServeSignupError.Conflict,
                $"Slug '{normalizedSlug}' is already in use.",
                suggestions);
        }

        var membership = await tenantMembershipService.EnsureMembershipAsync(
            user.Id,
            tenant.Id,
            TenantMembershipRole.TenantAdmin,
            cancellationToken);

        if (!membership.Succeeded)
        {
            logger.LogError(
                "Signup created tenant {TenantId} but membership failed: {Detail}",
                tenant.Id,
                membership.Detail);

            return SelfServeSignupResult<PublicSignupResponse>.Fail(
                SelfServeSignupError.Validation,
                membership.Detail ?? "Could not link admin to the new workspace.");
        }

        var sendError = await SendOtpAsync(email, nickname, cancellationToken);
        if (sendError is not null)
        {
            return SelfServeSignupResult<PublicSignupResponse>.Fail(
                SelfServeSignupError.Validation,
                sendError);
        }

        var expirySeconds = otpOptions.Value.ExpiryMinutes * 60;
        return SelfServeSignupResult<PublicSignupResponse>.Ok(new PublicSignupResponse(
            email,
            normalizedSlug,
            expirySeconds,
            "Check your email for a verification code to finish setup."));
    }

    public async Task<SelfServeSignupResult<SignupVerifyEmailResponse>> VerifyEmailAsync(
        SignupVerifyEmailRequest request,
        CancellationToken cancellationToken = default)
    {
        var email = request.Email?.Trim() ?? string.Empty;
        var code = request.Code?.Trim() ?? string.Empty;
        var tenantSlug = request.TenantSlug?.Trim() ?? string.Empty;

        if (!IsValidEmail(email) || code.Length != otpOptions.Value.CodeLength)
        {
            return SelfServeSignupResult<SignupVerifyEmailResponse>.Fail(
                SelfServeSignupError.Validation,
                "Invalid verification code.");
        }

        if (string.IsNullOrWhiteSpace(tenantSlug))
        {
            return SelfServeSignupResult<SignupVerifyEmailResponse>.Fail(
                SelfServeSignupError.Validation,
                "Workspace slug is required.");
        }

        var normalizedSlug = TenantSlugRules.Normalize(tenantSlug);
        var tenant = await dbContext.Tenants.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Slug == normalizedSlug, cancellationToken);
        if (tenant is null)
        {
            return SelfServeSignupResult<SignupVerifyEmailResponse>.Fail(
                SelfServeSignupError.Validation,
                "Invalid verification code.");
        }

        var user = await userManager.FindByEmailAsync(email);
        if (user is null)
        {
            return SelfServeSignupResult<SignupVerifyEmailResponse>.Fail(
                SelfServeSignupError.Validation,
                "Invalid verification code.");
        }

        var membership = await tenantMembershipService.GetMembershipAsync(user.Id, tenant.Id, cancellationToken);
        if (membership is null || membership.Role != TenantMembershipRole.TenantAdmin)
        {
            return SelfServeSignupResult<SignupVerifyEmailResponse>.Fail(
                SelfServeSignupError.Validation,
                "Invalid verification code.");
        }

        if (user.EmailConfirmed)
        {
            var tokens = await IssueTokensAsync(user, tenant.Id, membership.Role, cancellationToken);
            return SelfServeSignupResult<SignupVerifyEmailResponse>.Ok(new SignupVerifyEmailResponse(
                tokens.AccessToken,
                tokens.RefreshToken,
                tokens.ExpiresInSeconds,
                normalizedSlug));
        }

        if (!await otpStore.ValidateAndConsumeAsync(email, OtpPurpose.EmailVerification, code, cancellationToken))
        {
            return SelfServeSignupResult<SignupVerifyEmailResponse>.Fail(
                SelfServeSignupError.Validation,
                "Invalid or expired verification code.");
        }

        user.EmailConfirmed = true;
        var updateResult = await userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            return SelfServeSignupResult<SignupVerifyEmailResponse>.Fail(
                SelfServeSignupError.Validation,
                "Could not verify email.");
        }

        var issued = await IssueTokensAsync(user, tenant.Id, membership.Role, cancellationToken);
        return SelfServeSignupResult<SignupVerifyEmailResponse>.Ok(new SignupVerifyEmailResponse(
            issued.AccessToken,
            issued.RefreshToken,
            issued.ExpiresInSeconds,
            normalizedSlug));
    }

    public async Task<SelfServeSignupResult<SignupMessageResponse>> ResendOtpAsync(
        SignupResendOtpRequest request,
        CancellationToken cancellationToken = default)
    {
        var email = request.Email?.Trim() ?? string.Empty;
        var tenantSlug = request.TenantSlug?.Trim() ?? string.Empty;

        if (!IsValidEmail(email) || string.IsNullOrWhiteSpace(tenantSlug))
        {
            return SelfServeSignupResult<SignupMessageResponse>.Fail(
                SelfServeSignupError.Validation,
                "Enter a valid email and workspace slug.");
        }

        var normalizedSlug = TenantSlugRules.Normalize(tenantSlug);
        var tenant = await dbContext.Tenants.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Slug == normalizedSlug, cancellationToken);
        var user = await userManager.FindByEmailAsync(email);

        if (tenant is null || user is null)
        {
            return SelfServeSignupResult<SignupMessageResponse>.Ok(
                new SignupMessageResponse("If an account exists, a new code was sent."));
        }

        var membership = await tenantMembershipService.GetMembershipAsync(user.Id, tenant.Id, cancellationToken);
        if (membership is null)
        {
            return SelfServeSignupResult<SignupMessageResponse>.Ok(
                new SignupMessageResponse("If an account exists, a new code was sent."));
        }

        if (user.EmailConfirmed)
        {
            return SelfServeSignupResult<SignupMessageResponse>.Fail(
                SelfServeSignupError.Validation,
                "This email is already verified. Sign in instead.");
        }

        var sendError = await SendOtpAsync(email, user.Nickname, cancellationToken);
        if (sendError is not null)
        {
            return SelfServeSignupResult<SignupMessageResponse>.Fail(
                SelfServeSignupError.Validation,
                sendError);
        }

        return SelfServeSignupResult<SignupMessageResponse>.Ok(
            new SignupMessageResponse("A new verification code was sent to your email."));
    }

    private async Task<string?> ValidatePasswordAsync(string password)
    {
        var tempUser = new ApplicationUser
        {
            UserName = "password-check@cohestra.local",
            Email = "password-check@cohestra.local",
        };

        foreach (var validator in userManager.PasswordValidators)
        {
            var result = await validator.ValidateAsync(userManager, tempUser, password);
            if (!result.Succeeded)
            {
                return FormatIdentityErrors(result);
            }
        }

        return null;
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

    private async Task<string?> SendOtpAsync(
        string email,
        string? nickname,
        CancellationToken cancellationToken)
    {
        var settings = otpOptions.Value;
        var allowed = await otpStore.TryRecordSendAttemptAsync(
            email,
            OtpPurpose.EmailVerification,
            settings.MaxSendAttemptsPerWindow,
            TimeSpan.FromMinutes(settings.SendWindowMinutes),
            cancellationToken);

        if (!allowed)
        {
            return "Too many code requests. Wait a few minutes and try again.";
        }

        var code = GenerateNumericCode(settings.CodeLength);
        var ttl = TimeSpan.FromMinutes(settings.ExpiryMinutes);
        await otpStore.TryStoreAsync(email, OtpPurpose.EmailVerification, code, ttl, cancellationToken);

        var emailContent = AuthOtpEmailBuilder.BuildEmailVerification(
            nickname ?? string.Empty,
            code,
            settings.ExpiryMinutes);

        var fromEmail = sendGridOptions.Value.RegistrationFromEmail
            ?? sendGridOptions.Value.FromEmail;
        var fromName = sendGridOptions.Value.RegistrationFromName
            ?? sendGridOptions.Value.FromName;

        if (string.IsNullOrWhiteSpace(fromEmail))
        {
            if (hostEnvironment.IsDevelopment())
            {
                logger.LogWarning("DEV ONLY — signup OTP for {Email}: {Code}", email, code);
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
                return sendResult.FailureReason
                    ?? "Could not send verification email. Try again shortly.";
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send signup OTP email to {Email}", email);
            return "Could not send verification email. Try again shortly.";
        }

        if (hostEnvironment.IsDevelopment())
        {
            logger.LogInformation("DEV ONLY — signup OTP for {Email}: {Code}", email, code);
        }

        return null;
    }

    private async Task<(string AccessToken, string RefreshToken, int ExpiresInSeconds)> IssueTokensAsync(
        ApplicationUser user,
        Guid tenantId,
        TenantMembershipRole membershipRole,
        CancellationToken cancellationToken)
    {
        var roles = await userManager.GetRolesAsync(user);
        var (accessToken, expiresInSeconds) = jwtTokenService.CreateAccessToken(
            user,
            roles,
            tenantId,
            membershipRole);
        var refreshToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        var refreshTtl = TimeSpan.FromHours(jwtOptions.Value.RefreshTokenHours);

        await refreshTokenStore.StoreAsync(refreshToken, user.Id, tenantId, refreshTtl, cancellationToken);

        return (accessToken, refreshToken, expiresInSeconds);
    }

    private static string BuildNickname(string orgName, string email)
    {
        var sanitized = NicknameSanitizer.Replace(orgName, " ").Trim();
        sanitized = Regex.Replace(sanitized, @"\s+", " ");
        if (sanitized.Length >= 3)
        {
            return sanitized.Length <= 32 ? sanitized : sanitized[..32].TrimEnd();
        }

        var local = email.Split('@')[0];
        return local.Length <= 32 ? local : local[..32];
    }

    private static bool IsValidEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return false;
        }

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

    private static string GenerateNumericCode(int length)
    {
        var max = (int)Math.Pow(10, length);
        var min = max / 10;
        return RandomNumberGenerator.GetInt32(min, max).ToString();
    }

    private static string FormatIdentityErrors(IdentityResult result) =>
        string.Join(" ", result.Errors.Select(e => e.Description));

    private static bool IsUniqueConstraintViolation(DbUpdateException exception) =>
        exception.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation,
        };
}
