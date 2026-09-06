using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Cohestra.Application.Signup;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Signup;

public sealed class GoogleRecaptchaVerifier(
    IHttpClientFactory httpClientFactory,
    IHostEnvironment hostEnvironment,
    IOptions<SelfServeSignupSettings> options,
    ILogger<GoogleRecaptchaVerifier> logger) : ICaptchaVerifier
{
    private const string VerifyUrl = "https://www.google.com/recaptcha/api/siteverify";

    public async Task<(bool Valid, string? Error)> VerifyAsync(
        string? captchaToken,
        string? remoteIp,
        CancellationToken cancellationToken = default)
    {
        var settings = options.Value.Recaptcha;

        if (!settings.Enabled)
        {
            // Production/UAT: disabled means no captcha. Do not require a well-known bypass token.
            if (hostEnvironment.IsDevelopment() || hostEnvironment.EnvironmentName == "Testing")
            {
                if (!string.IsNullOrWhiteSpace(settings.TestBypassToken)
                    && string.Equals(captchaToken?.Trim(), settings.TestBypassToken, StringComparison.Ordinal))
                {
                    return (true, null);
                }

                if (!string.IsNullOrWhiteSpace(captchaToken))
                {
                    return (true, null);
                }

                return (false, "Complete the CAPTCHA challenge.");
            }

            return (true, null);
        }

        if (string.IsNullOrWhiteSpace(settings.SecretKey))
        {
            if (hostEnvironment.IsDevelopment() || hostEnvironment.EnvironmentName == "Testing")
            {
                if (!string.IsNullOrWhiteSpace(settings.TestBypassToken)
                    && string.Equals(captchaToken?.Trim(), settings.TestBypassToken, StringComparison.Ordinal))
                {
                    return (true, null);
                }

                if (!string.IsNullOrWhiteSpace(captchaToken))
                {
                    return (true, null);
                }

                return (false, "Complete the CAPTCHA challenge.");
            }

            logger.LogWarning("reCAPTCHA is enabled but SecretKey is not configured.");
            return (false, "CAPTCHA verification is unavailable. Try again later.");
        }

        if (string.IsNullOrWhiteSpace(captchaToken))
        {
            return (false, "Complete the CAPTCHA challenge.");
        }

        using var client = httpClientFactory.CreateClient(nameof(GoogleRecaptchaVerifier));
        using var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["secret"] = settings.SecretKey,
            ["response"] = captchaToken.Trim(),
            ["remoteip"] = remoteIp ?? string.Empty,
        });

        RecaptchaVerifyResponse? payload;
        try
        {
            using var response = await client.PostAsync(VerifyUrl, content, cancellationToken);
            payload = await response.Content.ReadFromJsonAsync<RecaptchaVerifyResponse>(cancellationToken);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or NotSupportedException)
        {
            logger.LogWarning(ex, "reCAPTCHA verification request failed.");
            return (false, "Could not verify CAPTCHA. Try again.");
        }

        if (payload?.Success == true)
        {
            return (true, null);
        }

        logger.LogInformation(
            "reCAPTCHA rejected token: {Errors}",
            payload?.ErrorCodes is null ? "unknown" : string.Join(", ", payload.ErrorCodes));

        return (false, "CAPTCHA verification failed. Try again.");
    }

    private sealed class RecaptchaVerifyResponse
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("error-codes")]
        public string[]? ErrorCodes { get; set; }
    }
}
