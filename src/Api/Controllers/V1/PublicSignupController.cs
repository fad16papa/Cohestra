using Cohestra.Api.Infrastructure;
using Cohestra.Application.Signup;
using Cohestra.Contracts.Legal;
using Cohestra.Contracts.Signup;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Controllers.V1;

[ApiController]
[Route("api/v1/public/signup")]
public sealed class PublicSignupController(
    ISelfServeSignupService signupService,
    IPublicSignupRateLimiter signupRateLimiter) : ControllerBase
{
    [HttpGet("slug-check")]
    [ProducesResponseType(typeof(SlugAvailabilityResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CheckSlug([FromQuery] string? slug, CancellationToken cancellationToken)
    {
        var result = await signupService.CheckSlugAsync(slug, cancellationToken);
        if (!result.Succeeded || result.Value is null)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid slug",
                Detail = result.Detail ?? "Slug check failed.",
                Status = StatusCodes.Status400BadRequest,
            });
        }

        return Ok(result.Value);
    }

    [HttpPost]
    [ProducesResponseType(typeof(PublicSignupResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Signup(
        [FromBody] PublicSignupRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid request",
                Detail = "Request body is required.",
                Status = StatusCodes.Status400BadRequest,
            });
        }

        var clientIp = PublicRegistrationRateLimitMiddleware.ResolveClientIdentifier(HttpContext);
        var result = await signupService.SignupAsync(request, clientIp, cancellationToken);

        if (!result.Succeeded || result.Value is null)
        {
            return MapSignupFailure(result);
        }

        await signupRateLimiter.RecordSuccessfulSignupAsync(clientIp, cancellationToken);

        return StatusCode(StatusCodes.Status201Created, result.Value);
    }

    [HttpPost("verify-email")]
    [ProducesResponseType(typeof(SignupVerifyEmailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> VerifyEmail(
        [FromBody] SignupVerifyEmailRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid request",
                Detail = "Request body is required.",
                Status = StatusCodes.Status400BadRequest,
            });
        }

        var result = await signupService.VerifyEmailAsync(request, cancellationToken);
        if (!result.Succeeded || result.Value is null)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Verification failed",
                Detail = result.Detail ?? "Could not verify email.",
                Status = StatusCodes.Status400BadRequest,
            });
        }

        return Ok(result.Value);
    }

    [HttpPost("resend-otp")]
    [ProducesResponseType(typeof(SignupMessageResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResendOtp(
        [FromBody] SignupResendOtpRequest? request,
        CancellationToken cancellationToken)
    {
        if (request is null)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid request",
                Detail = "Request body is required.",
                Status = StatusCodes.Status400BadRequest,
            });
        }

        var result = await signupService.ResendOtpAsync(request, cancellationToken);
        if (!result.Succeeded || result.Value is null)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Resend failed",
                Detail = result.Detail ?? "Could not resend verification code.",
                Status = StatusCodes.Status400BadRequest,
            });
        }

        return Ok(result.Value);
    }

    private IActionResult MapSignupFailure(SelfServeSignupResult<PublicSignupResponse> result)
    {
        ProblemDetails BuildProblem(int status, string title, string? type = null)
        {
            var problem = new ProblemDetails
            {
                Title = title,
                Detail = result.Detail,
                Status = status,
                Type = type,
            };

            if (result.Suggestions.Count > 0)
            {
                problem.Extensions["suggestions"] = result.Suggestions;
            }

            return problem;
        }

        return result.Error switch
        {
            SelfServeSignupError.RegistrationClosed => StatusCode(
                StatusCodes.Status403Forbidden,
                BuildProblem(StatusCodes.Status403Forbidden, "Signup closed", "https://cohestra.app/errors/signup-closed")),
            SelfServeSignupError.Captcha => BadRequest(
                BuildProblem(StatusCodes.Status400BadRequest, "CAPTCHA required", "https://cohestra.app/errors/captcha-failed")),
            SelfServeSignupError.Conflict => Conflict(
                BuildProblem(StatusCodes.Status409Conflict, "Signup conflict")),
            SelfServeSignupError.RateLimited => StatusCode(
                StatusCodes.Status429TooManyRequests,
                BuildProblem(StatusCodes.Status429TooManyRequests, "Too many signups")),
            _ => BadRequest(
                BuildProblem(StatusCodes.Status400BadRequest, "Invalid signup")),
        };
    }
}
