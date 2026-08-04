using Cohestra.Api.Infrastructure;
using Cohestra.Application.Auth;
using Cohestra.Application.Tenants;
using Cohestra.Contracts.Auth;
using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using System.Security.Claims;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/auth")]
[Produces("application/json")]
public class AuthController(
    IAuthService authService,
    IAuthHandoffStore authHandoffStore,
    ICurrentTenant currentTenant,
    IAuthResendOtpRateLimiter authResendOtpRateLimiter,
    IOptions<AuthOtpVerifyRateLimitOptions> authOtpVerifyRateLimitOptions,
    IOptions<AuthResendOtpRateLimitOptions> authResendOtpRateLimitOptions) : ControllerBase
{
    [HttpGet("onboarding")]
    [ProducesResponseType(typeof(OnboardingStatusResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<OnboardingStatusResponse>> GetOnboardingStatus(
        CancellationToken cancellationToken)
    {
        return Ok(await authService.GetOnboardingStatusAsync(cancellationToken));
    }

    [HttpPost("register")]
    [ProducesResponseType(typeof(RegisterOperatorResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<RegisterOperatorResponse>> Register(
        [FromBody] RegisterOperatorRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequestProblem("Request body is required.");
        }

        var (response, error) = await authService.RegisterAsync(request, cancellationToken);
        if (response is null)
        {
            if (error?.Contains("already has a tenant admin", StringComparison.OrdinalIgnoreCase) == true
                || error?.Contains("already has an operator", StringComparison.OrdinalIgnoreCase) == true)
            {
                return ConflictProblem(error);
            }

            return BadRequestProblem(error ?? "Registration failed.");
        }

        return StatusCode(StatusCodes.Status201Created, response);
    }

    [HttpPost("verify-email")]
    [ProducesResponseType(typeof(AuthTokenResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<AuthTokenResponse>> VerifyEmail(
        [FromBody] VerifyEmailOtpRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequestProblem("Request body is required.");
        }

        var clientIp = PublicRegistrationRateLimitMiddleware.ResolveClientIdentifier(HttpContext);
        var (tokens, error, errorCode) = await authService.VerifyEmailAsync(
            request,
            TenantRequestHost.GetEffectiveHost(HttpContext),
            clientIp,
            cancellationToken);
        if (tokens is null)
        {
            if (string.Equals(errorCode, AuthErrorCodes.OtpVerifyRateLimited, StringComparison.Ordinal))
            {
                return TooManyRequestsProblem(
                    error ?? "Too many verification attempts. Try again later.",
                    AuthErrorCodes.OtpVerifyRateLimited,
                    "https://cohestra.app/errors/otp-verify-rate-limited");
            }

            return BadRequestProblem(error ?? "Verification failed.");
        }

        return Ok(tokens);
    }

    [HttpPost("handoff/exchange")]
    [ProducesResponseType(typeof(AuthTokenResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AuthTokenResponse>> ExchangeHandoff(
        [FromBody] AuthHandoffExchangeRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Code))
        {
            return BadRequestProblem("Invalid or expired handoff code.");
        }

        if (!currentTenant.IsResolved || currentTenant.TenantId is null)
        {
            return BadRequestProblem("Invalid or expired handoff code.");
        }

        var payload = await authHandoffStore.ExchangeAsync(
            request.Code.Trim(),
            currentTenant.TenantId.Value,
            cancellationToken);

        if (payload is null)
        {
            return BadRequestProblem("Invalid or expired handoff code.");
        }

        return Ok(new AuthTokenResponse(
            payload.AccessToken,
            payload.RefreshToken,
            payload.ExpiresInSeconds));
    }

    [HttpPost("resend-otp")]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<MessageResponse>> ResendOtp(
        [FromBody] ResendOtpRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequestProblem("Request body is required.");
        }

        var email = request.Email?.Trim() ?? string.Empty;
        if (!string.IsNullOrWhiteSpace(email))
        {
            var clientIp = PublicRegistrationRateLimitMiddleware.ResolveClientIdentifier(HttpContext);
            if (!await authResendOtpRateLimiter.AllowResendAsync(email, clientIp, cancellationToken))
            {
                return TooManyRequestsResendProblem(
                    "Too many resend attempts. Try again later.",
                    AuthErrorCodes.ResendOtpRateLimited,
                    "https://cohestra.app/errors/resend-otp-rate-limited");
            }

            await authResendOtpRateLimiter.RecordResendAsync(email, clientIp, cancellationToken);
        }

        var (response, error) = await authService.ResendOtpAsync(request, cancellationToken);
        if (response is null)
        {
            return BadRequestProblem(error ?? "Could not resend code.");
        }

        return Ok(response);
    }

    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthTokenResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthTokenResponse>> Login(
        [FromBody] LoginRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null
            || string.IsNullOrWhiteSpace(request.Email)
            || string.IsNullOrWhiteSpace(request.Password))
        {
            return UnauthorizedProblem("Invalid email or password.");
        }

        var result = await authService.LoginAsync(
            request.Email,
            request.Password,
            TenantRequestHost.GetEffectiveHost(HttpContext),
            cancellationToken);
        if (result.Tokens is null)
        {
            if (!string.IsNullOrWhiteSpace(result.HandoffCode)
                && !string.IsNullOrWhiteSpace(result.TenantSlug))
            {
                return Ok(new AuthLoginHandoffResponse(
                    result.TenantSlug,
                    result.HandoffCode,
                    result.HandoffExpiresInSeconds ?? 120));
            }

            if (string.Equals(result.ErrorCode, "service_unavailable", StringComparison.Ordinal))
            {
                return ServiceUnavailableProblem(
                    result.ErrorMessage ?? "Sign-in is temporarily unavailable. Try again shortly.");
            }

            return UnauthorizedProblem(
                result.ErrorMessage ?? "Invalid email or password.",
                result.ErrorCode,
                result.VerifyTenantSlug);
        }

        return Ok(result.Tokens);
    }

    [HttpPost("refresh")]
    [ProducesResponseType(typeof(AuthTokenResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthTokenResponse>> Refresh(
        [FromBody] RefreshTokenRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return UnauthorizedProblem("Invalid or expired refresh token.");
        }

        var result = await authService.RefreshAsync(
            request.RefreshToken,
            TenantRequestHost.GetEffectiveHost(HttpContext),
            cancellationToken);
        if (result.Tokens is null)
        {
            return UnauthorizedProblem(
                result.ErrorMessage ?? "Invalid or expired refresh token.",
                result.ErrorCode);
        }

        return Ok(result.Tokens);
    }

    [HttpPost("forgot-password")]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<MessageResponse>> ForgotPassword(
        [FromBody] ForgotPasswordRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Email))
        {
            return Ok(new MessageResponse("If an account exists, a reset code was sent."));
        }

        return Ok(await authService.ForgotPasswordAsync(request, cancellationToken));
    }

    [HttpPost("reset-password")]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<MessageResponse>> ResetPassword(
        [FromBody] ResetPasswordRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequestProblem("Request body is required.");
        }

        var clientIp = PublicRegistrationRateLimitMiddleware.ResolveClientIdentifier(HttpContext);
        var (response, error, errorCode) = await authService.ResetPasswordAsync(request, clientIp, cancellationToken);
        if (response is null)
        {
            if (string.Equals(errorCode, AuthErrorCodes.OtpVerifyRateLimited, StringComparison.Ordinal))
            {
                return TooManyRequestsProblem(
                    error ?? "Too many verification attempts. Try again later.",
                    AuthErrorCodes.OtpVerifyRateLimited,
                    "https://cohestra.app/errors/otp-verify-rate-limited");
            }

            return BadRequestProblem(error ?? "Could not reset password.");
        }

        return Ok(response);
    }

    [HttpPost("change-password")]
    [Authorize(Policy = TenantAuthPolicies.TenantOperator)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<MessageResponse>> ChangePassword(
        [FromBody] ChangePasswordRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequestProblem("Request body is required.");
        }

        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");

        if (!Guid.TryParse(userIdValue, out var userId))
        {
            return Unauthorized();
        }

        var (response, error) = await authService.ChangePasswordAsync(userId, request, cancellationToken);
        if (response is null)
        {
            return BadRequestProblem(error ?? "Could not update password.");
        }

        return Ok(response);
    }

    private UnauthorizedObjectResult UnauthorizedProblem(
        string detail,
        string? errorCode = null,
        string? verifyTenantSlug = null)
    {
        Response.ContentType = "application/problem+json";

        var problem = new ProblemDetails
        {
            Status = StatusCodes.Status401Unauthorized,
            Title = "Unauthorized",
            Detail = detail,
            Instance = HttpContext.Request.Path,
        };

        if (!string.IsNullOrWhiteSpace(errorCode))
        {
            problem.Extensions["errorCode"] = errorCode;
        }

        if (!string.IsNullOrWhiteSpace(verifyTenantSlug))
        {
            problem.Extensions["verifyTenantSlug"] = verifyTenantSlug;
        }

        return Unauthorized(problem);
    }

    private ObjectResult ServiceUnavailableProblem(string detail)
    {
        Response.ContentType = "application/problem+json";

        var problem = new ProblemDetails
        {
            Status = StatusCodes.Status503ServiceUnavailable,
            Title = "Service Unavailable",
            Detail = detail,
            Instance = HttpContext.Request.Path,
        };
        problem.Extensions["errorCode"] = "service_unavailable";

        return StatusCode(StatusCodes.Status503ServiceUnavailable, problem);
    }

    private BadRequestObjectResult BadRequestProblem(string detail)
    {
        Response.ContentType = "application/problem+json";

        return BadRequest(new ProblemDetails
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "Bad Request",
            Detail = detail,
            Instance = HttpContext.Request.Path,
        });
    }

    private ConflictObjectResult ConflictProblem(string detail)
    {
        Response.ContentType = "application/problem+json";

        return Conflict(new ProblemDetails
        {
            Status = StatusCodes.Status409Conflict,
            Title = "Conflict",
            Detail = detail,
            Instance = HttpContext.Request.Path,
        });
    }

    private ObjectResult TooManyRequestsResendProblem(string detail, string errorCode, string? type = null)
    {
        Response.ContentType = "application/problem+json";

        var windowMinutes = Math.Clamp(authResendOtpRateLimitOptions.Value.WindowMinutes, 1, 1440);
        Response.Headers.RetryAfter = (windowMinutes * 60).ToString();

        var problem = new ProblemDetails
        {
            Status = StatusCodes.Status429TooManyRequests,
            Title = "Too many resend attempts",
            Detail = detail,
            Instance = HttpContext.Request.Path,
            Type = type,
        };
        problem.Extensions["errorCode"] = errorCode;
        problem.Extensions["traceId"] = HttpContext.TraceIdentifier;

        return StatusCode(StatusCodes.Status429TooManyRequests, problem);
    }

    private ObjectResult TooManyRequestsProblem(string detail, string errorCode, string? type = null)
    {
        Response.ContentType = "application/problem+json";

        var windowMinutes = Math.Clamp(authOtpVerifyRateLimitOptions.Value.WindowMinutes, 1, 1440);
        Response.Headers.RetryAfter = (windowMinutes * 60).ToString();

        var problem = new ProblemDetails
        {
            Status = StatusCodes.Status429TooManyRequests,
            Title = "Too many verification attempts",
            Detail = detail,
            Instance = HttpContext.Request.Path,
            Type = type,
        };
        problem.Extensions["errorCode"] = errorCode;
        problem.Extensions["traceId"] = HttpContext.TraceIdentifier;

        return StatusCode(StatusCodes.Status429TooManyRequests, problem);
    }
}
