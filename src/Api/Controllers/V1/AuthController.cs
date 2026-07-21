using Cohestra.Application.Auth;
using Cohestra.Contracts.Auth;
using Cohestra.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/auth")]
[Produces("application/json")]
public class AuthController(IAuthService authService) : ControllerBase
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
    public async Task<ActionResult<AuthTokenResponse>> VerifyEmail(
        [FromBody] VerifyEmailOtpRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequestProblem("Request body is required.");
        }

        var (tokens, error) = await authService.VerifyEmailAsync(request, cancellationToken);
        if (tokens is null)
        {
            return BadRequestProblem(error ?? "Verification failed.");
        }

        return Ok(tokens);
    }

    [HttpPost("resend-otp")]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<MessageResponse>> ResendOtp(
        [FromBody] ResendOtpRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequestProblem("Request body is required.");
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

        var result = await authService.LoginAsync(request.Email, request.Password, cancellationToken);
        if (result.Tokens is null)
        {
            return UnauthorizedProblem(result.ErrorMessage ?? "Invalid email or password.", result.ErrorCode);
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

        var result = await authService.RefreshAsync(request.RefreshToken, cancellationToken);
        if (result is null)
        {
            return UnauthorizedProblem("Invalid or expired refresh token.");
        }

        return Ok(result);
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
    public async Task<ActionResult<MessageResponse>> ResetPassword(
        [FromBody] ResetPasswordRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequestProblem("Request body is required.");
        }

        var (response, error) = await authService.ResetPasswordAsync(request, cancellationToken);
        if (response is null)
        {
            return BadRequestProblem(error ?? "Could not reset password.");
        }

        return Ok(response);
    }

    [HttpPost("change-password")]
    [Authorize(Roles = OperatorSeeder.TenantAdminRole)]
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

    private UnauthorizedObjectResult UnauthorizedProblem(string detail, string? errorCode = null)
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

        return Unauthorized(problem);
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
}
